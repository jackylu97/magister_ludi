/**
 * All pointer and keyboard handling for the map view.
 *
 * The DOM side of the game: it reads the simulation (through the read-only
 * helpers in `src/sim/`) to decide what a click *means*, then expresses the
 * decision as a `Command` and hands it to `dispatch`. It never writes to a
 * `GameState` itself — selection and hover are view state and live here, board
 * state lives in the reducer.
 *
 * It exists as its own module because input logic grows fast: pan, zoom, hover,
 * selection, route preview and hotkeys are already more code than `main.ts`
 * should carry, and none of it is about wiring up the page.
 *
 * The input contract
 * ------------------
 * One rule decides the whole scheme: **left selects, right orders.** Left click
 * used to do both, and on a board where every tile is a legal click target that
 * meant a mis-aimed selection was a move order — expensive, and impossible to
 * take back.
 *
 *   · Left click  — your unit selects it (again cycles the stack), your city
 *                   opens its panel, and *anything else deselects*. Clicking
 *                   away is how you put a unit down — and, with a city screen
 *                   open, clicking outside that city's work radius is how you
 *                   put the city down. Inside the radius the same button pins
 *                   citizens instead, on every tile of it. The tag floating over
 *                   a unit is always a way to select that unit, whatever the
 *                   ground under it currently means. See `handleLeftClick` for
 *                   the whole order.
 *   · Right click — with one of your units selected, orders it to the clicked
 *                   tile. With nothing selected it does nothing at all. The
 *                   browser context menu is suppressed over the board either
 *                   way, because a right click there is a game input.
 *   · M           — arms *move mode*: the next left click moves instead of
 *                   selecting. This is the trackpad path, where a right click
 *                   is a two-finger tap and not everybody has one. M again, Esc,
 *                   or issuing the move disarms it.
 *   · Space        — waves the selected unit off: it stops asking to be
 *                   ordered this turn (see `skipUnit`). Not a sim order and
 *                   not fortify — see the closure comment above
 *                   `skippedUnitIds` for the whole of the distinction.
 *
 * Escape backs out one layer at a time, outermost first: move mode, then an
 * open popover, then the city screen's buy mode, then the city panel itself,
 * then the selection.
 *
 * End Turn, and what it refuses to do
 * -----------------------------------
 * The button and Enter do not end the turn while the seat still has unfinished
 * business — an idle unit, a city building nothing, an unaimed science pool.
 * They take the player *to* the first of those instead (see `turnBlockers.ts`
 * for the contract and for why it is a pure function that lives outside this
 * file). Shift ends the turn regardless, for the player who means it. A unit
 * the player has skipped with Space no longer counts as unfinished business
 * either, for the rest of this turn.
 *
 * This is gating and nothing more: `endTurn` is the same command it always was,
 * the reducer is untouched, and a remote client or an AI can still send it
 * whenever it likes. What the local player gets is a button that knows what
 * they forgot.
 *
 * Click versus drag
 * -----------------
 * Both buttons pan, and both also click, so a press only counts as a click if
 * the pointer barely moved between down and up. Without the slop threshold every
 * pan would end in an accidental order — and that matters more for the right
 * button than it ever did for the left, because on many trackpads a two-finger
 * drag arrives as a right-button drag.
 *
 * Refusals are never silent, guidance does not flinch, and news is not either
 * ---------------------------------------------------------------------------
 * There are three things this module has to say and they go to two places.
 *
 * A **refusal** — a mountain, a tile out of reach, a seat that has already ended
 * its turn — reports through `onNotice(text, 'reject')`, which the HUD whispers
 * into the context card for a beat and flashes red. That card is bottom-left,
 * under the cursor, which is exactly where the player is already looking when an
 * order is bounced: a "no" is a reply to a gesture and it belongs where the
 * gesture came from. The selection survives, because the player almost certainly
 * wants to aim again.
 *
 * **Guidance** — "your settlers await a home", said when End Turn takes the
 * player to the thing they forgot — shares that same bottom-left card, through
 * the separate `guide` function rather than a flag on `announce`, and reads
 * `'guide'` for `onNotice`'s `kind`. It is a reply to a gesture too (the player
 * pressed End Turn), so it belongs in the same slot a refusal does, but it is
 * not a "no" — the interface did what was asked and is pointing, not scolding —
 * so it does not flash red the way a refusal does.
 *
 * **News** — a city finished something, a camp was burnt out, a ruin came into
 * view — reports through `onNotify` (`announce`), which the HUD raises as a toast
 * under the top bar *and* files in that seat's chronicle. Nobody asked for it, it
 * can arrive while a city screen is covering half the window, and a line that
 * whispers it into a corner and fades is a line that is missed. Every announce
 * call site in this file gets both surfaces without knowing either exists; the
 * ones that happen *somewhere* pass a `cell` too, which is what makes the toast
 * and its log entry click-to-pan (`NotificationAction`, `notifications.ts`).
 *
 * Sightings
 * ---------
 * One kind of news has no command behind it: the seat simply came to know that
 * something is there. After every accepted command (`commit`, the one seam
 * between this module and the reducer) the local seat's known-sites set is
 * diffed — discovery sites it has now explored, camps it can now see — and each
 * new one is announced like any other news. It is pure view-layer diffing:
 * `createSightingWatcher` reads the state and writes nothing to it, and the
 * simulation has no idea it is being watched. Sitting down in a new chair
 * *baselines* rather than polls, so a seat switch is silent.
 *
 * Two kinds of selection
 * ----------------------
 * A selected *unit* and an open *city* are separate pieces of view state and
 * both live here. They are exclusive, because the two panels that show them
 * share one slot on the right of the screen: taking a selection closes an open
 * city, and opening a city drops the selection. They also answer to the same
 * seat — change seats and both are dropped, because neither belongs to the
 * player who just sat down. Escape still backs out one at a time (a city screen
 * first, then the selection), because *clearing* a selection is not taking one
 * and leaves an open city where it was.
 *
 * Selection rules
 * ---------------
 * Clicking one of your own units always selects it, even when the selected unit
 * could legally stack there — "select" is the safe interpretation, and a move
 * onto a friendly tile is one keystroke away (click an empty tile first). A
 * repeated click on a tile holding several of your units cycles between them.
 *
 * There are two ways to say "that unit" and they answer the same: the ground it
 * stands on, and the badge floating over it. The badge exists because it is the
 * part of a piece that is legible at game zoom, and it is a target *globally*
 * rather than only where the tile is busy — one gesture that always means
 * select, learned once. Both paths run through `selectOnTile`, so a stack cycles
 * the same way whichever of the two the player aimed at.
 *
 * Move animation
 * --------------
 * The renderer slides a piece along the tiles it walked, and this is the only
 * place that knows which tiles those were: the route the player was shown, cut
 * short at wherever the unit actually ended up (`walkedPrefix`). It is captured
 * *before* the dispatch, because afterwards the old position is gone. Nothing
 * waits on the animation — the state is already final when it starts.
 *
 * The local player
 * ----------------
 * The simulation has no notion of "me" — it has players, all of whom act in the
 * same turn window, and commands that name their author. `localPlayerId` is this
 * module's answer to who is sitting at *this* keyboard, and it is the gate on
 * every input path: only the local player's units can be selected, and every
 * command dispatched carries their id. Enemy pieces stay hoverable, because
 * looking is not commanding.
 *
 * That is exactly the shape a remote game needs later: the server would tell the
 * client its seat, and nothing else here would change.
 *
 * Seat switching is a development harness. `setLocalPlayer` is what the panel's
 * seat chips call, and it is hot-seat play by another name — one tester driving
 * every seat. `endTurn` uses it too, hopping to the next seat that has not
 * finished so a solo tester never has to hunt for whose turn is outstanding.
 * Neither is a rule: the simulation is perfectly happy for the other seats to be
 * driven by an AI or a socket instead.
 */

import {
  type CompletionGrantReport,
  type WonderCompletion,
  assignableTiles,
  cityAt,
  cityTile,
  foundingError,
  productionSettledBy,
  queueItemName,
  withinWorkRadius,
} from '../sim/cities';
import { buildingDef } from '../sim/buildingData';
import {
  type CombatPreview,
  type SiegeReport,
  attackTargetAt,
  fortifyError,
  isCombatant,
  isRanged,
  previewCombat,
} from '../sim/combat';
import type {
  Command,
  CommandResult,
  SlotOrderCommand,
  UnslotOrderCommand,
} from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import {
  actCityFor,
  familyOf,
  greatPersonActError,
  greatPersonWorkError,
  hasGreatPersonOffer,
  isGreatPerson,
  personOf,
  workOf,
} from '../sim/greatPeople';
import { type Family, greatPersonDef } from '../sim/greatPeopleData';
import { yieldContextFor } from '../sim/cities';
import {
  IMPROVEMENT_IDS,
  type ImprovementId,
  chopDef,
  chopYield,
  improvementDef,
} from '../sim/improvementData';
import {
  chopCity,
  chopError,
  chopTechError,
  improvementError,
  improvementTechError,
  improvementYieldDelta,
  isBuilder,
  pillageError,
} from '../sim/improvements';
import { type Tile, getTileAt, mapRange, tileHex } from '../sim/map';
import { authorityOf, happinessOf } from '../sim/meters';
import { findPath, reachableTiles } from '../sim/pathfind';
import { RULES } from '../sim/rulesData';
import {
  type City,
  type GameState,
  type Unit,
  cityById,
  hasEndedTurn,
  isBarbarian,
  playerById,
  realPlayers,
  unitById,
} from '../sim/state';
import {
  consecrateError,
  isAugur,
  ritePreview,
  riteCityTarget,
  riteError,
  riteUnitTarget,
} from '../sim/religion';
import { type RiteId, RITE_IDS, riteAbility, riteDef } from '../sim/religionData';
import { type ResearchReport, hasAbility, researchSince, researchSnapshot } from '../sim/tech';
import { type CardClause, describeCard, statecraftBlocker } from '../sim/statecraft';
import { highestAge, techDef } from '../sim/techData';
import type { TileYield } from '../sim/terrainData';
import type { TriumphAward } from '../sim/triumphs';
import { type TraderPlunder, routeCities } from '../sim/trade';
import { isExplorer, trades, unitDef } from '../sim/unitData';
import { sleepError, sleepingSnapshot, unitsOnTile, wakesSince } from '../sim/units';
import { isExploredBy } from '../sim/visibility';
import { walkedPrefix } from '../render/animation';
import { cityDisplayName } from './cityDisplay';
import { HAMMER, YIELD_GLYPH, signedFigure } from './figures';
import {
  type CellRef,
  type FallenUnit,
  type HoverInfo,
  LENS_DEFAULTS,
  type LensMode,
  type LensView,
  type MapView,
} from './mapView';
import { type NotificationEntry, createSightingWatcher } from './notifications';
import {
  NO_ROUTE_CAPACITY,
  type RouteReading,
  hasFreeRouteSlot,
  plunderLossSentence,
  plunderSpoils,
  plunderSpoilsSentence,
  routeEndSentence,
  routeReading as routeReadingOf,
  routeSlotsLine as routeSlotsLineOf,
} from './tradeLines';
import { type TurnBlocker, firstBlocker } from './turnBlockers';

/** How far the pointer may travel between down and up and still be a click. */
const CLICK_SLOP_PX = 4;

/** How long a refused order stays on screen before the card goes quiet again. */
const NOTICE_MS = 1800;

/** What the context card says while move mode is armed. */
const MOVE_MODE_NOTICE = 'Move mode — click a destination (Esc cancels)';

/**
 * And while the piece in hand has nothing left to spend this turn.
 *
 * **A spent unit is not an unorderable one** (playtest batch two). The reducer
 * takes a march from a piece with zero movement and stores the whole route as
 * standing orders — `advanceAlongPath` simply takes no step it cannot pay for —
 * so the last click of a unit's turn stopped being the one click that did
 * nothing. Nothing in this module ever refused that order; what *said* it was
 * impossible was the board, because `reachableTiles` reports the tiles a unit
 * can end **this turn** on and a spent piece has none, so arming move mode over
 * one lights nothing at all.
 *
 * That silence is the honest answer to the question the ring asks and the wrong
 * answer to the question the player is asking, so the line says the other half
 * out loud rather than the highlight pretending to a reach the turn does not
 * have. The order lands, the unit sheet's Orders line confirms it, and the march
 * begins when `resetMovement` refills the purse.
 */
const MOVE_MODE_SPENT_NOTICE =
  'Move mode — spent for this turn; click a destination and it sets off on the next (Esc cancels)';

/**
 * Which of the two move-mode lines a piece with `movesLeft` points left gets.
 *
 * Split out and exported for the test: the difference between the two sentences
 * is a *rule* — that an order given at zero movement is stored rather than
 * refused — and a rule asserted by reading a screenshot is a rule nobody
 * asserts. See `MOVE_MODE_SPENT_NOTICE`.
 */
export function moveModeNotice(movesLeft: number): string {
  return movesLeft > 0 ? MOVE_MODE_NOTICE : MOVE_MODE_SPENT_NOTICE;
}

/**
 * What a rite that has just been performed is announced as: "✶ Omen Reading at
 * Uruk · +15 science · 20 turns of blessing".
 *
 * The user found the hole (playtest, 2026-08-27: "there should be some
 * indication after performing a rite"). A rite is the quietest expensive thing
 * in the game — one of three charges on a unit bought outright from the faith
 * bank — and the only sign it had worked was a number changing somewhere else
 * on the screen.
 *
 * **Asked of the state before the command, and that is the whole of it.** A rite
 * spends a charge, may empty the augur and take it off the board, and lands its
 * grant on a town chosen by where the piece is standing — so "the augur, the
 * town, and what it did" is a sentence only the moment *before* can answer.
 * `commit`'s caravan snapshot and `unitSnapshot` are the same rule; this is the
 * third occasion of it.
 *
 * Every word is the simulation's own. `ritePreview` is exactly what the rite's
 * row on the augur's sheet promised in this same position (the same call
 * `riteOptions` makes), so what the player was offered and what the Chamberlain
 * reports back are one string by construction rather than by agreement.
 * `describeCard` is the fallback for a rite whose grant the preview has nothing
 * to say about — a card's printed text, which is the other place a rite's effect
 * is already written down. Composing a third sentence out of the performance
 * report would be a second description of what a rite does.
 *
 * Module-level and pure so it can be asserted without a browser: this suite has
 * no jsdom, and a sentence is exactly the kind of thing that is quietly wrong.
 */
export function riteSentence(state: GameState, unit: Unit, id: RiteId): string {
  const def = riteDef(id);
  // Where it lands, in the words every other surface names a town in. A rite
  // aimed at a piece names the piece; one that can find neither names neither,
  // rather than inventing a place.
  const city = def.target === 'city' ? riteCityTarget(state, unit) : null;
  const blessed = def.target === 'unit' ? riteUnitTarget(state, unit) : null;
  const where = city
    ? ` at ${cityDisplayName(state, city)}`
    : blessed
      ? ` over the ${unitDef(blessed.type).name.toLowerCase()}`
      : '';
  const payoff =
    ritePreview(state, unit.id, id) ??
    describeCard(id)
      .filter((clause) => clause.deferred !== true)
      .map((clause) => clause.text)
      .join(' · ');
  return payoff.length > 0 ? `✶ ${def.name}${where} · ${payoff}` : `✶ ${def.name}${where}`;
}

/** And while the city screen's Buy Tiles mode is up. */
const BUY_MODE_NOTICE = 'Buy tiles — click a priced hex to purchase it (Esc cancels)';

/**
 * A line for the context card: the standing description of a mode the player
 * has put themselves in, a one-off refusal that flashes and fades, or a one-off
 * pointer the player asked for (End Turn's blocker) that fades the same way but
 * never flashes — see the module docblock's three-way split.
 */
/**
 * The two commands the Statecraft screen can send, and the whole of what
 * `sendStatecraft` will carry.
 *
 * Named rather than widened to `Command` on purpose: this is a batch seam, and a
 * batch of arbitrary commands is a way for a surface to smuggle a turn's worth
 * of orders past the one-gesture-one-command reading every other call site keeps.
 */
export type StatecraftSlotCommand = SlotOrderCommand | UnslotOrderCommand;

export type NoticeKind = 'mode' | 'reject' | 'guide';

/**
 * The optional half of an announcement.
 *
 * One field today, and an object rather than a positional argument precisely so
 * that it stays one call-site change when there is a second — every existing
 * `announce(text)` in this file is already correct against this signature, which
 * is the whole point (the notification pass added toasts and a log to two dozen
 * call sites without editing any of them).
 */
export interface AnnounceOptions {
  /** Where it happened. Makes the toast and its log entry click-to-pan. */
  cell?: CellRef;
  /**
   * This news is the Statecraft screen's door, not a place on the map — the
   * first-draft announcement (`announceFirstStatecraftDraft`) is the one call
   * site. Mutually exclusive with `cell` in practice (nothing needs both a pan
   * and a screen-open on one entry today); `announce` prefers `cell` if a call
   * site somehow set both, since a place beats an abstract "open this" already
   * a keypress away.
   */
  openStatecraft?: boolean;
  /**
   * This news is the great-person card's door. `openStatecraft`'s twin one
   * bucket over, and the same mutual exclusivity in practice: an offer is made
   * to the empire and has no hex, so nothing sets both.
   */
  openGreatPerson?: boolean;
}

/**
 * One number to float over the board after a blow lands.
 *
 * `dealt` is damage this client's piece inflicted, `taken` is damage it
 * received; the two are drawn in the interface's two accents (vermilion and
 * teal) so a trade reads as a trade at a glance. It carries a *cell* rather
 * than a unit id because the unit it describes may already be dead — which is
 * exactly the case the number is most needed for.
 */
export interface DamageEvent {
  col: number;
  row: number;
  amount: number;
  kind: 'dealt' | 'taken';
}

/**
 * One improvement the selected worker could build here, and what it would buy.
 *
 * The delta comes from `improvementYieldDelta`, which asks the *same* evaluator
 * the turn pipeline banks with (see `improvements.ts`), so "Farm +1🌾" on the
 * button is the food the city will actually collect. Carrying the delta rather
 * than the improvement's flat `yields` is the difference between a preview and a
 * guess: the day an improvement replaces a feature, or a renewal changes the sum,
 * the button follows without anybody remembering to make it.
 */
export interface ImprovementOption {
  id: ImprovementId;
  name: string;
  /** What building it would add to this tile's yield, right now. */
  delta: TileYield;
  /**
   * The reducer's own sentence about why this row is greyed rather than
   * pressable, or `null` when it is pressable.
   *
   * Only ever a technology (`improvementTechError`). A row the *ground* refuses
   * is not on the list at all — see `improvementOptions`.
   */
  blocked: string | null;
  /**
   * The display name of the technology `blocked` is naming, or `null` exactly
   * when `blocked` is `null`.
   *
   * Read straight off `improvementDef(id).requiresTech` — the same field
   * `improvementTechError` reads to write `blocked`'s sentence — rather than
   * parsed back out of that sentence, so the sheet's "Requires Mining" hover
   * headline (see `unitPanel.ts`) cannot name a different technology than the
   * one actually gating the row.
   */
  requiredTechName: string | null;
}

/**
 * One rite the augur's sheet offers, with everything that row needs.
 *
 * `ImprovementOption`'s twin one agent over, and shaped like it for that type's
 * reason: the panel prints rows and the *rules* decide which are live, so a row
 * a player can press is a command the reducer takes.
 */
export interface RiteOption {
  id: RiteId;
  name: string;
  /** Why it cannot be performed, or `null`. The reducer's own sentence. */
  blocked: string | null;
  /** What it would do, in one line — "+1 pop to Uruk". `ritePreview`'s. */
  preview: string | null;
  /** The technology a greyed row is waiting on, or `null`. */
  requiredTechName: string | null;
}

/**
 * One of a great person's two verbs, as the unit sheet needs it.
 *
 * `RiteOption` minus the id, because *which* act and *which* work belong to the
 * family rather than to the player (`greatPersonActAt`, `workOf`): the sheet
 * offers exactly two rows and the reducer is told the piece, never the verb's
 * name. What is left is the shape every other verb on that sheet already has —
 * the reducer's own refusal, and what it would do stated as the number.
 */
export interface GreatPersonVerb {
  /** Why it cannot be taken, or `null`. `greatPersonActError`'s own sentence. */
  blocked: string | null;
  /** What it would do, in one line. Never `null` — a verb always has an answer. */
  preview: string;
}

/**
 * Everything a great person's sheet shows, read once.
 *
 * A single object rather than six accessors for `chopPreview`'s reason: the
 * panel asks one question ("who is this, and what can they do") and every part
 * of the answer comes from the same read of the same piece, so a name and a
 * greyed button can never describe two different turns.
 *
 * `null` for anything that is not a great person, which is every other piece on
 * the board.
 */
export interface GreatPersonView {
  name: string;
  family: Family;
  /** One line, the roster's own. Never a rule. */
  epigram: string;
  /** Why this person is remembered at all. The wunderkammer's register. */
  kernel: string;
  /** The burst. */
  act: GreatPersonVerb;
  /** The ground. */
  work: GreatPersonVerb;
  /**
   * The legacy that attaches **either way**, in `describeCard`'s words — the
   * same function the offer that dealt this name printed, so a player reads the
   * same sentences before and after the decision.
   */
  legacy: readonly CardClause[];
}

/**
 * Does this viewer want animation suppressed?
 *
 * Read at the moment of use rather than cached: the setting can change while the
 * page is open, and this is one media query per seat change.
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * What a digit key does to the manual lens: which mode to set, or `null` when
 * the digit does nothing.
 *
 * Pure and exported so the mapping can be pinned by a test that has no
 * keyboard, and it is where both halves of the number-key rule live in one
 * place rather than scattered across the `keydown` handler:
 *
 *   · `0` always clears — the Civ convention a player already knows — read
 *     independently of `order`, so it means "off" even on the day `order`'s
 *     first entry stops being `'none'`.
 *   · `1..9` count the **lenses**, not the menu's rows: `'none'` is struck out of
 *     `order` first, wherever it sits, and the digits then run down what is
 *     left. `order` is `main.ts`'s `LENS_OPTIONS` (mode-only), whose first row
 *     is the "None" entry — so reading it positionally made `1` mean *off*,
 *     which is `0`'s job, and cost the list its last lens a digit. A player
 *     counts the things a key can *show* them; the row that shows nothing is not
 *     one of them. The menu's own list is still the one source of the sequence,
 *     so a lens appended to it gets a working hotkey with no second mapping to
 *     keep in step, and a digit past the end of the list names nothing.
 *   · The number of the lens already active toggles it **off** — Civ-style —
 *     and any other in-range number switches to it. Both readings come from
 *     `current`, which must be the *manual* lens (`GameControls.lens()`) and
 *     never `effectiveLens`'s answer: a selected settler overriding the board
 *     is not a reason a number key should stop doing what the menu would do.
 */
export function lensForDigit(
  digit: number,
  order: readonly LensMode[],
  current: LensMode,
): LensMode | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  const lenses = order.filter((mode) => mode !== 'none');
  const target = digit === 0 ? 'none' : (lenses[digit - 1] ?? null);
  if (target === null) return null;
  return target === current ? 'none' : target;
}

/**
 * Does the effective lens show the yield glyphs — the rule `effectiveLens`
 * applies, pulled out pure so it can be pinned without a `GameControls`
 * instance behind it (see `effectiveLens`'s own docblock for the reasoning).
 *
 * Three things can turn the glyphs on, independently: the player's own
 * switch, an open city panel, and — as of the settler-lens fix below — the
 * settler lens itself, auto or manual. `yieldsOn` is untouched by any of
 * this; the caller decides what to do with it, this only decides whether the
 * glyphs show *this frame*.
 */
export function lensShowsYields(mode: LensMode, yieldsOn: boolean, cityOpen: boolean): boolean {
  return yieldsOn || cityOpen || mode === 'settler';
}

// --- what a wonder handed over ----------------------------------------------

/**
 * One line of news about a completion grant, ready to be announced.
 *
 * Pure data rather than a call, for `lensForDigit`'s reason exactly: the whole
 * of the rule — which grants are this seat's, which wonder each one came from,
 * and what each one is called — is worth pinning by a test with no reducer, no
 * renderer and no DOM behind it, and there is a real bug in each of those three
 * clauses that no behavioural test would catch.
 */
export interface GrantNotice {
  /** The sentence, wonder first: "The Great Library · Mathematics is understood". */
  text: string;
  /** The piece that arrived, for the pan a unit grant's toast carries. */
  unitId?: number;
  /** True on the one grant that puts a decision on the seat. See `reportGrants`. */
  opensDoctrine?: boolean;
}

/** "a Spearman", "an Augur" — the article the name itself asks for. */
function withArticle(name: string): string {
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

/**
 * What one grant is, in words. Every arm says the honest thing on both
 * outcomes, because `done: false` is a real outcome and a wonder that quietly
 * handed over nothing is the worst line the interface could fail to print.
 *
 * The failure arm for a unit deliberately does **not** name the piece: the
 * report cannot say *why* it failed (there was no melee row to pick from, or
 * there was nowhere in the town to stand), and "no room for a Spearman" would
 * be the interface inventing the half it was not told.
 */
function grantSentence(report: CompletionGrantReport): string {
  if (report.grant === 'unit') {
    return report.done ? `${withArticle(report.name)} answers the call` : 'nothing answered the call';
  }
  if (report.grant === 'tech') {
    return report.done ? `${report.name} is understood` : 'nothing was being researched';
  }
  // Not "a Doctrine is already owed", which was the first wording and is a
  // guess: `done: false` covers **two** causes here — a seat already holding an
  // unanswered draft, and a government whose tier deals no Doctrine at all
  // (every chiefdom, which is where this was caught in the browser) — and the
  // report does not say which. Same discipline as the unit arm one line up.
  return report.done ? 'a Doctrine draft opens' : 'no Doctrine could be dealt';
}

/**
 * Pairs a resolution's grants with the wonders that handed them over, and turns
 * this seat's share into lines.
 *
 * **The pairing is positional, and it has to be**: `CompletionGrantReport` says
 * what arrived and never which building sent it (`cities.ts`), and both lists
 * are filled by the same sweep in the same order — `advanceProduction` pushes a
 * completion's wonder and then that completion's grants, and the windfall path
 * (`chopFeature`) carries the one completion's two fields out together. So
 * walking the wonders and consuming each row's `onComplete` entries in order
 * lands every grant on the marvel that paid it.
 *
 * That is a claim about two lists, so it is **checked rather than trusted**: the
 * kinds must line up entry for entry, and the first disagreement stops the walk
 * dead. Silence is the right failure here — a grant announced under the wrong
 * wonder's name is worse than a grant announced under none, and a grant with no
 * wonder beside it has no owner either (the report carries no `playerId`), so
 * announcing it would risk telling this seat about another empire's free sword.
 *
 * The seat filter is the wonder's, for that same reason: `wonders` is
 * deliberately *not* filtered by the reducer (a marvel is news to everybody),
 * and `WonderCompletion.playerId` is the only thing in the result that knows
 * whose grant this was.
 */
export function wonderGrantNotices(
  wonders: readonly WonderCompletion[] | undefined,
  grants: readonly CompletionGrantReport[] | undefined,
  seatId: number,
): GrantNotice[] {
  if (grants === undefined || grants.length === 0) return [];
  const notices: GrantNotice[] = [];
  let next = 0;
  for (const wonder of wonders ?? []) {
    for (const promised of buildingDef(wonder.building).onComplete ?? []) {
      const report = grants[next];
      if (report === undefined || report.grant !== promised.grant) return notices;
      next += 1;
      if (wonder.playerId !== seatId) continue;
      const notice: GrantNotice = { text: `✶ ${wonder.name} · ${grantSentence(report)}` };
      if (report.unitId !== undefined) notice.unitId = report.unitId;
      if (report.grant === 'doctrineDraft' && report.done) notice.opensDoctrine = true;
      notices.push(notice);
    }
  }
  return notices;
}

// --- the right button belongs to the game -----------------------------------

/**
 * The element shapes the context-menu rule reads, duck-typed so the rule can be
 * asked without a DOM — this suite has no jsdom, and a rule about *which*
 * surfaces keep the browser's menu is exactly the half worth pinning.
 */
export interface ContextMenuTarget {
  tagName: string;
  /** An `<input>`'s type. Absent is `"text"`, as the platform reads it. */
  type?: string;
  /** True on an editable host **and on every node inside one** — DOM-inherited. */
  isContentEditable?: boolean;
}

/**
 * The input types whose native menu is genuinely useful: the ones that hold
 * *text a player might cut, paste or spell-check*. A checkbox, a range or a
 * button is a control, and a control has nothing to offer that menu.
 */
const TEXT_INPUT_TYPES: readonly string[] = [
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
];

/**
 * Does this element legitimately want the browser's context menu?
 *
 * The **only** exemption from the suppression `main.ts` installs at the document
 * while a game is on screen. Right click is a game input — a march order, and a
 * pan while it is held — so a menu that appeared anywhere over a live game would
 * be a menu the player learns to expect and then loses the moment the cursor
 * comes to rest one pixel to the left, on the board.
 *
 * Asked of the event's own target and nothing above it, deliberately: an
 * editable region has no game surface inside it, and `isContentEditable` is
 * already inherited down the tree by the platform, so there is no ancestor walk
 * to get wrong. The landing screen is not covered by this rule at all — it is
 * *not a board*, and `main.ts` lets its whole page keep the native menu.
 */
export function wantsNativeContextMenu(target: ContextMenuTarget | null): boolean {
  if (!target) return false;
  if (target.isContentEditable === true) return true;
  const tag = target.tagName.toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') return TEXT_INPUT_TYPES.includes((target.type ?? 'text').toLowerCase());
  return false;
}

export interface GameControlsOptions {
  viewport: HTMLElement;
  /**
   * The map view being driven — the 2D `Renderer` or the 3D `Renderer3D`.
   *
   * Input handling is renderer-agnostic on purpose: what a click *means* is a
   * question about the simulation, and the answer is the same whether the board
   * is drawn as sprites or as a lit diorama. `MapView` is the whole of what this
   * module needs from a renderer; anything beyond it is `main.ts`'s business.
   */
  renderer: MapView;
  /** Read afresh every time: the game object is replaced on regeneration. */
  getGame: () => Game;
  /** Called after anything the panel displays may have changed. */
  onUpdate: (selected: Unit | null, hover: HoverInfo | null) => void;

  /**
   * The turn resolved: every seat had ended, the counter moved, and the local
   * seat is playing again. This is the moment the turn splash announces, and it
   * is reported from here because `endTurn` is the only place that can tell the
   * difference between "the turn advanced" and "I merely finished".
   *
   * Optional, like `onSeatAdvanced`: nothing about the rules depends on anyone
   * listening, and the frozen 2D pages are wired by the same `main.ts`.
   *
   * It carries what the resolution did to the local seat's research, because
   * this is the only place that can tell: the answer is a *difference*, and the
   * "before" half stops existing the moment the turn resolves. The diff itself
   * is the simulation's (`researchSince`), so what the splash announces is what
   * a replay of the same log would announce.
   */
  onTurnResolved?: (turn: number, research: ResearchReport) => void;
  /**
   * The turn is *handed over*: the pieces resolution marched have finished
   * moving and the interface may speak.
   *
   * `onTurnResolved`'s twin, and a separate moment rather than a second listener
   * on the same one. A turn change is two different events wearing one name: the
   * world moved (nothing may be lost, so the autosave is taken there and then),
   * and the player is given the new turn (which must wait for the marches the
   * click set off — see `endTurn`, and Entry XXI of the ledger). Folding them
   * back together means either a save held hostage to an animation or a card
   * dropped over pieces that are still walking, and both have shipped.
   *
   * It carries the same research difference `onTurnResolved` does, because it is
   * the half that announces it.
   */
  onTurnHandedOver?: (turn: number, research: ResearchReport) => void;
  /**
   * The harness moved the local seat on, because seats were still open. Carries
   * the seat now being played.
   */
  onSeatAdvanced?: (playerId: number) => void;

  /**
   * A line for the HUD's context card, or `null` to clear it.
   *
   * Two things speak through it: move mode, while it is armed, and a refused
   * order, for a moment. It is a callback rather than an element because this
   * module has no business knowing which card the HUD keeps its messages in —
   * exactly like `onUpdate`.
   */
  onNotice?: (text: string | null, kind: NoticeKind) => void;

  /**
   * Something *happened*, and the player should be told: a toast, and a line in
   * this seat's chronicle.
   *
   * The other half of the split described in the module docblock. It carries the
   * seat as well as the entry because the log is per seat and this module is the
   * authority on which chair is being played — asking `localPlayerId()` back from
   * the outside would be a second answer, and a wrong one for the one command
   * that changes seats.
   *
   * Optional like every other reporting hook: the frozen 2D pages are wired by
   * the same `main.ts` and lose nothing by not listening.
   */
  onNotify?: (entry: NotificationEntry, seatId: number) => void;

  /**
   * Closes any HUD popover that is open; returns whether there was one.
   *
   * Escape belongs to one listener, and it is this module's — see the docblock
   * on the order it backs things out in. The popovers are `main.ts`'s, so this
   * is how Escape reaches them without a second window listener racing for the
   * same keystroke.
   */
  closePopovers?: () => boolean;

  /**
   * True while something on the page has taken over from the board — the
   * landing screen, today.
   *
   * Only the *keyboard* needs asking. An overlay covering the viewport already
   * swallows every pointer event by being in front of it, but a window-level
   * key listener has no such geometry: without this, tabbing to Start and
   * typing `y` would toggle a lens on a game nobody can see.
   */
  inputBlocked?: () => boolean;

  /**
   * Opens or closes the tech screen. `T`, and nothing else here — the screen
   * owns its own Escape while it is up (it reports itself through
   * `inputBlocked`, so this module never sees a key while it is open).
   */
  onToggleTechTree?: () => void;

  /**
   * Opens the tech screen — never closes it.
   *
   * Separate from `onToggleTechTree` because the caller is different in kind:
   * `T` is the player asking for the chart and a second `T` is them asking for
   * it to go away, while End Turn's research blocker is the *interface* putting
   * the chart in front of them. A toggle there could answer "you have chosen no
   * research" by closing the only screen that can fix it.
   */
  onOpenTechTree?: () => void;
  /** Opens or closes the Statecraft screen. The `C` key and the culture chip. */
  onToggleStatecraft?: () => void;
  /**
   * Puts whatever Statecraft owes this seat on screen. End Turn's blocker calls
   * it, exactly as `onOfferDiscovery` is called for a claimed ruin.
   */
  onOfferStatecraft?: () => void;
  /**
   * Puts the local seat's belief offer on screen — `main.ts`'s
   * `showReligionOffer`. `onOfferStatecraft`'s twin, and it exists for that
   * one's reason exactly: the End Turn blocker takes the player *to* the thing
   * they forgot, and a religion offer's "there" is a card rather than a hex.
   */
  onOfferReligion?: () => void;
  /**
   * Puts the local seat's great-person offer on screen — `main.ts`'s
   * `showGreatPersonOffer`. The fourth of the four, and it exists for
   * `onOfferStatecraft`'s reason exactly: End Turn's blocker takes the player
   * *to* the thing they forgot, and a name's "there" is a card rather than a
   * hex.
   */
  onOfferGreatPerson?: () => void;
  /**
   * Raises the Triumph sheet over these awards — `main.ts`'s triumph modal
   * (`triumphModal.ts`). Local seat only; the caller queues them.
   *
   * Unlike the four offers above it this carries its payload, and for the
   * opposite of their reason: an offer is *on the player* and can be read back
   * off the state at any time, where a Triumph is **news about a moment**. The
   * renown was banked by `awardTriumph` before this module ever saw the result,
   * `Player.triumphs` is append-only, and re-deriving "which of these are new"
   * at the surface would be a second implementation of the diff the reducer
   * already handed over (`triumphs.ts`: the news is a diff, never a sink).
   */
  onTriumphs?: (awards: readonly TriumphAward[]) => void;

  /**
   * Puts the local seat's pending discovery card in front of the player.
   *
   * It carries nothing, deliberately: the offer is *on the player*
   * (`Player.pendingDiscovery`), so the screen reads it from the state rather
   * than being handed a copy that could be one command out of date. Called from
   * exactly two places, and they are the same two `onOpenTechTree` has — the
   * moment a march claims a site, and the End Turn blocker when the player has
   * wandered off without answering.
   */
  onOfferDiscovery?: () => void;

  /**
   * Opens or closes the Abacus, the score screen. `A`, on the same terms as
   * `T`: the screen owns its own Escape while it is up and reports itself
   * through `inputBlocked`, so this module never sees a key while it is open.
   */
  onToggleAbacus?: () => void;

  /**
   * A blow landed: numbers to float over the board.
   *
   * Reported from here because this is the only place that can measure it — the
   * figures are hit-point *differences*, and the "before" half stops existing
   * the moment the command applies. Same argument as `onTurnResolved`'s research
   * report, and the same shape of answer.
   */
  onDamage?: (events: readonly DamageEvent[]) => void;

  /**
   * The game ended: one player is left standing.
   *
   * Fired once, on the command that decided it, and only when `winnerId` went
   * from null to a player — a state that is already won does not re-announce
   * itself on every later click.
   */
  onVictory?: (playerId: number) => void;

  /**
   * The manual lenses, in the order the menu shows them — `main.ts`'s
   * `LENS_OPTIONS`, mode-only. The one source of order for the number-key
   * hotkeys (see `lensForDigit`): required rather than defaulted here, because
   * a default would be the second hardcoded copy of the list this is meant to
   * avoid. A lens appended to the menu's array gets a working hotkey with
   * nothing in this file to update.
   */
  lensOrder: readonly LensMode[];
}

export interface GameControls {
  /** Drops the selection and its overlays. Called on turn change and new games. */
  clearSelection(): void;

  /**
   * The lens the player *chose* from the menu — not necessarily the one on the
   * board, which a selected settler may be overriding. The menu shows this one,
   * so its ticks say what will come back when the override goes away.
   */
  lens(): LensMode;
  /** Puts a lens up, or takes it down with `'none'`. The menu's rows. */
  setLens(lens: LensMode): void;

  /**
   * Whether the player has the yield glyphs switched on.
   *
   * Their own switch, not the board's: an open city panel shows the glyphs for its
   * work radius whatever this says, and closing it comes back to exactly this.
   * The menu's checkbox shows this one, for the same reason the lens rows show
   * the chosen lens.
   */
  yieldsShown(): boolean;
  /** Turns the yield glyphs on or off. The menu's checkbox and the `Y` key. */
  setYields(on: boolean): void;

  /**
   * Whether the resource roundels are switched on. They start on, and nothing
   * but the player ever moves them — there is no automatic rule to distinguish
   * this answer from the board's.
   */
  resourcesShown(): boolean;
  /** Turns the resource roundels on or off. The menu's checkbox and the `R` key. */
  setResources(on: boolean): void;

  /**
   * Tells the UI which city the pointer is over, when the pointer is over
   * something the board itself cannot see — a DOM city banner. `null` on the
   * way out. The board's own tiles are handled by hover picking.
   */
  setHoveredCity(cityId: number | null): void;
  /**
   * Re-reads the game and repaints; call after replacing the game object.
   *
   * `seatId` is which chair the client sits down in, and it defaults to the
   * first — a new game is a new table and seat 0 is where a new table starts.
   * A *loaded* game is the exception and the reason the argument exists: the
   * save says nothing about who was looking at it (`localPlayerId` is an
   * interface fact, hard rule 3), so the caller derives the seat and passes it
   * (`resumeSeat` in `saves.ts`).
   */
  refresh(seatId?: number): void;

  /**
   * Says that something happened: a toast, and a line in this seat's chronicle.
   *
   * Exposed for the page's own news, which is news about the *session* rather
   * than about an order: a game resumed from a file, an autosave that could not
   * be written. Everything the board itself has to say already goes through here
   * from the inside.
   *
   * `cell` is where it happened, when that is a question with an answer — it is
   * what makes the toast and its log entry take the camera there when clicked.
   */
  announce(text: string, opts?: AnnounceOptions): void;

  /**
   * Says what to do next — the manicule line, not the chronicle.
   *
   * The third notice kind (`NoticeKind`), exposed for the one surface outside
   * this file that produces guidance a player provoked: the Statecraft screen's
   * refusals, which are the reducer's own sentences and are neither news nor a
   * rejection of an order. It fades and never flashes, and it takes no slot in
   * the log — a player who dropped a card on the wrong slot is not making
   * history.
   */
  guide(text: string): void;

  /**
   * Sends the Statecraft screen's staged arrangement as one batch, in the order
   * it was handed over — every `unslotOrder`, then every `slotOrder`.
   *
   * The screen no longer sends a command per gesture (the user, 2026-08-27:
   * "slots should only lock after leaving the menu"), so this is the one seam
   * that surface writes through. It answers the refusal that stopped the batch,
   * or `null` when every command was taken; the refusal has already been said in
   * the notice line by the time it comes back.
   */
  sendStatecraft(commands: readonly StatecraftSlotCommand[]): string | null;

  /**
   * Brings one cell into view, respecting the viewer's motion preference.
   *
   * Exposed for the notification surfaces: a toast and a chronicle entry are
   * both "show me", and the camera is reached through `MapView`, which is this
   * module's to drive (see `mapView.ts`).
   */
  panTo(cell: CellRef): void;
  /**
   * Ends the local player's turn, as the button and the Enter key both do —
   * unless the seat has unfinished business, in which case it takes the player
   * to the first of it and the turn stands (see `turnBlockers.ts`).
   *
   * `force` is the Shift on that button and on that key: end the turn whatever
   * is outstanding. A player who has decided a settler is staying put should not
   * have to argue with the interface about it.
   */
  endTurn(force?: boolean): void;

  /**
   * What End Turn would stop on right now, or `null` when it would simply end
   * the turn.
   *
   * The HUD asks it for the button's own label and quiet/primary styling, which
   * is the honest version of a prompt: the player can see there is something
   * outstanding *before* they press, rather than being bounced by it.
   */
  endTurnBlocker(): TurnBlocker | null;
  /** Whose seat this client is playing. */
  localPlayerId(): number;

  /**
   * Why the selected unit cannot found a city here, or `null` when it can.
   *
   * The panel uses it for both jobs a disabled button has: whether to enable
   * itself, and what to say when it will not. `undefined` means there is no
   * selected unit at all, which is a different thing from "cannot".
   */
  foundCityBlocker(): string | null | undefined;
  /** Founds a city with the selected settler. The `B` key and the button. */
  foundCity(): void;

  /** The city whose panel is open, or `null`. Only ever one of your own. */
  openCity(): City | null;
  /** Opens a city's panel, or closes it with `null`. */
  setOpenCity(cityId: number | null): void;
  /**
   * Takes a different seat: drops the selection and pans the camera to that
   * player's units. The development harness (see the module docblock).
   */
  setLocalPlayer(playerId: number): void;

  /**
   * Why the selected unit's standing order cannot be cancelled, or `null` when
   * it can. `undefined` when there is no selected unit at all — the same shape,
   * and for the same reason, as `foundCityBlocker`.
   */
  cancelOrderBlocker(): string | null | undefined;
  /** Drops the selected unit's standing order. The unit sheet's button. */
  cancelOrder(): void;

  /**
   * Why the selected unit cannot fortify, or `null` when it can. `undefined`
   * with nothing selected — the same three-valued shape as `foundCityBlocker`.
   */
  fortifyBlocker(): string | null | undefined;
  /** Digs the selected unit in. The unit sheet's button and the `F` key. */
  fortify(): void;

  /**
   * Why the selected unit cannot be told to sleep, or `null` when it can.
   * `undefined` with nothing selected — the same three-valued shape as
   * `foundCityBlocker`, and `fortifyBlocker`'s civilian twin.
   */
  sleepBlocker(): string | null | undefined;
  /**
   * Puts the selected civilian to sleep. The unit sheet's button and the `Z`
   * key. Waking is not a verb here: any order at all wakes the piece (see
   * `SleepUnitCommand`), and "never mind" is `cancelOrder`.
   */
  sleepUnit(): void;

  /**
   * Why the selected unit cannot be told to skip its turn, or `null` when it
   * can — the same three-valued shape as `foundCityBlocker`.
   *
   * Not a sim question, unlike every other blocker on this interface: there is
   * no reducer command behind it (see `skipUnit`), so this is the only place
   * the answer is decided.
   */
  skipBlocker(): string | null | undefined;
  /**
   * Waves the selected unit off for this turn only — it stops counting as
   * idle for End Turn and the post-resolution auto-focus, and nothing else
   * about it changes. The unit sheet's button and the `Space` key.
   *
   * Not `fortify`'s cousin: fortifying is a standing order the reducer knows
   * about and grants a bonus for; skipping is this client choosing not to be
   * asked again, and the simulation never hears of it. See the skip-set
   * comment on the closure state above.
   */
  skipUnit(): void;
  /**
   * Whether the selected unit has already been waved off this turn — the unit
   * sheet's "Waiting this turn" note when it is reselected. `false` with
   * nothing selected, since there is nothing to have skipped.
   */
  isUnitSkipped(): boolean;

  /**
   * Every improvement the selected unit could build where it stands, with what
   * each would add to the tile — the rows the unit sheet turns into buttons.
   *
   * Two refusals, shown two ways, and the split is the city panel's precedent
   * rather than an inconsistency:
   *
   *   · **The ground says no** — "a mine needs hills", "that is not your land".
   *     Absent from the list entirely. These are permanent facts about the hex,
   *     and six greyed rows on a hex where one thing is legal would spend the
   *     whole panel saying no. What the player sees instead is the shape of the
   *     ground they are standing on.
   *   · **The tree says no** — "a mine needs Mining". Present, greyed, with the
   *     technology named (`ImprovementOption.blocked`). That is not a fact about
   *     the hex, it is a thing this empire has not learnt yet, and it is exactly
   *     the case a player wants told: the hill is good, go and research it.
   *
   * Fortify greys for a third reason again — a refusal that is over tomorrow —
   * which is why it is a button and not a list.
   *
   * Empty when there is no selection, when the selection is not a builder, or
   * when the seat has ended its turn — the panel then shows the charges line and
   * no verbs, which is the honest picture of a worker with nothing to do here.
   */
  improvementOptions(): ImprovementOption[];
  /** Spends a charge. The unit sheet's per-improvement buttons. */
  buildImprovement(id: ImprovementId): void;

  /**
   * Why the selected worker cannot clear the feature it is standing in, or
   * `null` when it can — the same three-valued shape as `foundCityBlocker`.
   *
   * A blocker rather than an option list, because unlike the improvements this
   * verb is *one* verb: there is only ever one feature on a hex, so there is
   * nothing to choose between and everything to explain. It greys with whatever
   * refused — the ground, the borders, a protected resource, or the technology —
   * which is Pillage's reading rather than the improvements', because "there is
   * no forest here" is a fact about this hex and a worker will meet the verb
   * again on the next one.
   */
  chopBlocker(): string | null | undefined;
  /**
   * What clearing here would pay and which city would bank it, or `null` when
   * this hex has no chop in it at all.
   *
   * Entry VIII's pre-decision delta for the axe. Offered even while the *tree*
   * is refusing, exactly as a greyed improvement row still carries its yield:
   * "the wood here is worth 20⚙ to Uruk" is precisely the argument for going and
   * researching Mining. It is `null` — rather than a zero — when the ground has
   * nothing to say, so the panel prints no number rather than a false one.
   *
   * `completes` names what the timber would *finish* on landing, or `null`. It
   * is the settlement check's own answer (Entry XVIII), asked of the basket the
   * chop would leave — so the sheet's "completes Granary!" is a promise made by
   * the function that will keep it a moment later.
   */
  chopPreview(): { production: number; cityName: string; completes: string | null } | null;
  /**
   * The technology Chop is waiting on, or `null` — either because it is not
   * blocked at all, or because whatever is blocking it is not the tree (the
   * ground, the borders, a protected resource keep their own sentences, per
   * `chopBlocker`'s docblock).
   *
   * Read the same way `improvementOptions` tells a tech refusal apart from a
   * ground one — by comparing `chopBlocker`'s sentence against
   * `chopTechError`'s for this hex, the equality `chopErrorAt`'s docblock
   * already leans on — and then naming it off the same
   * `chopDef(feature).tech` field that sentence was built from.
   */
  chopTechName(): string | null;
  chop(): void;
  /**
   * Why the selected unit cannot pillage where it stands, or `null` when it can.
   * `undefined` with nothing selected — the same three-valued shape as
   * `foundCityBlocker`.
   */
  pillageBlocker(): string | null | undefined;
  /** Burns the improvement under the selected unit. The unit sheet's button. */
  pillage(): void;

  /**
   * Who the selected piece is, if it is a great person, and what its two verbs
   * would do — or `null`, which is every other piece on the board.
   *
   * **One object rather than six accessors**, unlike every other verb on this
   * sheet, and the difference is what the sheet is asking. A worker's row is a
   * question about the ground it stands on; a great person's whole panel — the
   * header, the epigram, both buttons and the legacy under them — is one
   * question about *who this is*, and six separate reads would be six chances
   * for the name and the greyed button to describe two different turns.
   */
  greatPersonView(): GreatPersonView | null;
  /** Spends the whole person on the family's boon. The sheet's Act button. */
  greatPersonAct(): void;
  /** Spends the whole person on the family's work. The sheet's Work button. */
  greatPersonWork(): void;

  /**
   * Why the selected augur cannot consecrate a god, or `null` when it can.
   * `undefined` with nothing selected — `foundCityBlocker`'s three-valued shape.
   *
   * The whole rule is `consecrateError` (`religion.ts`), so a live button is an
   * accepted command and "Your pantheon has no room for another god" is one
   * sentence written once.
   */
  consecrateBlocker(): string | null | undefined;
  /** Spends the whole augur on a belief offer. The unit sheet's button. */
  consecrate(): void;
  /**
   * The rites this augur could perform where it stands — every rite in the
   * table, each carrying its blocker and its payoff preview.
   *
   * A list rather than a blocker, because this verb is five verbs, and unlike
   * the improvements the **unknown ones stay on the list** and are greyed with
   * the node that teaches them. That is the chop's reading rather than the
   * improvements': a rite the empire has not learnt is a fact about the tree
   * and the argument for going and learning it, where "there is no forest here"
   * is a fact about a hex the worker will not be standing on tomorrow.
   */
  riteOptions(): RiteOption[];
  /** Spends one charge on a rite, aimed where the augur stands. */
  performRite(id: RiteId): void;

  /**
   * What would happen if the selected unit attacked the tile under the pointer,
   * or `null` when that is not a question anybody is asking — nothing selected,
   * nothing hovered, or nothing hostile on the hovered tile.
   *
   * A refusal comes back as the preview's own `{ ok: false, error }` rather than
   * as `null`, because "you cannot attack that, and here is why" is exactly what
   * the card should say. It is `previewCombat`'s answer verbatim: the forecast
   * the player reads is the arithmetic the reducer will perform.
   */
  combatForecast(): CombatPreview | null;

  /** The unit currently selected, re-read from the state, or `null`. */
  selectedUnit(): Unit | null;
  /** Whether move mode is armed — the next left click is an order, not a pick. */
  isMoveMode(): boolean;
  /** Arms or disarms move mode. The `M` key; a no-op with nothing selected. */
  setMoveMode(on: boolean): void;
  /**
   * Whether the city screen's Buy Tiles mode is up — the next click inside the
   * open city's ring spends gold. The city panel's button reads it; the price-tag
   * overlay decides whether to draw anything at all by it.
   */
  isBuyMode(): boolean;
  /**
   * Arms or disarms buy mode. A no-op without an open city of the local seat's,
   * or after that seat has ended its turn.
   */
  setBuyMode(on: boolean): void;
  /**
   * Buys one hex for the open city, or flashes the reducer's refusal.
   *
   * The price tags call it, because a tag is DOM floating above the board and
   * the board's own click handling never sees it — the same reason a city
   * banner has to reach `setOpenCity` directly. Returns whether the click was
   * claimed, not whether the gold moved.
   */
  purchaseTileAt(col: number, row: number): boolean;

  /**
   * Why the selected caravan cannot start a route at all — the same
   * three-valued shape as `foundCityBlocker`, and the same guarantee.
   *
   * **One clause, and it is about the empire rather than about the piece**
   * (the user's ruling, 2026-08-28): a full route ledger. Where a caravan is
   * standing stopped mattering when the screen became the verb — a trader
   * anywhere on the map may be spent on any pair, and *which* pair is the Trade
   * screen's question, greyed row by greyed row with `routeStartable`. So the
   * sheet's button only has to answer "is there any route to start at all", and
   * it answers in the user's own sentence (`NO_ROUTE_CAPACITY`).
   */
  startRouteBlocker(): string | null | undefined;
  /** The selected caravan's live route, or `null` for a piece carrying none. */
  routeReading(): RouteReading | null;
  /** Flips the selected caravan's auto-resend, or flashes the refusal. */
  setAutoResend(on: boolean): void;
  /** Ends the selected caravan's route now, or flashes the refusal. */
  cancelRoute(): void;

  /**
   * The three route verbs, naming the caravan by **id**.
   *
   * The Trade screen acts on a row, and the caravan on that row is very often
   * not the piece in hand — under the 2026-08-28 ruling it is never *necessarily*
   * the piece in hand, because the screen may be opened from the bar with no
   * selection at all. `setAutoResendOf` and `cancelRouteOf` are each the same
   * inner function their selection-shaped twins above call, so a route ended
   * from the screen and one ended from the sheet are one command with one
   * announcement and one refusal. A caravan that is not this seat's is ignored,
   * which is the same answer the reducer would give.
   */
  startRouteFrom(unitId: number, fromCityId: number, toCityId: number): void;
  setAutoResendOf(unitId: number, on: boolean): void;
  cancelRouteOf(unitId: number): void;
  /** "2 of 3 routes" for the local seat, for the sheet and the city panel. */
  routeSlotsLine(): string;
}

export function createGameControls(options: GameControlsOptions): GameControls {
  const {
    viewport,
    renderer,
    getGame,
    onUpdate,
    onTurnResolved,
    onTurnHandedOver,
    onSeatAdvanced,
    onNotice,
    onNotify,
    closePopovers,
    inputBlocked,
    onToggleTechTree,
    onToggleAbacus,
    onOpenTechTree,
    onOfferDiscovery,
    onToggleStatecraft,
    onOfferStatecraft,
    onOfferReligion,
    onOfferGreatPerson,
    onTriumphs,
    onDamage,
    onVictory,
    lensOrder,
  } = options;

  /** The seat this client plays. Player ids are indices, so 0 is the first. */
  let localPlayerId = 0;
  let selectedId: number | null = null;
  /** The city whose panel is open. View state, exactly like the selection. */
  let openCityId: number | null = null;
  /** Armed by `M`: the next left click on the board is an order, not a pick. */
  let moveMode = false;
  /**
   * Units the player has waved off for this turn only: Skip Turn's whole
   * effect. Not a command and not `GameState` — the reducer never hears about
   * it, and a remote client or a replay would not agree it exists. It is view
   * state exactly like `selectedId`, and it is disposed of on the same two
   * occasions a selection would be dropped for reasons that are not "the
   * player asked": the turn resolving (a fresh turn owes nothing to the one
   * that just ended) and a seat change (the set is silence from *a* player,
   * and the new seat has said nothing yet). See `turnBlockers.ts`'s
   * `BlockerExclusions` for why this lives here and not there.
   */
  const skippedUnitIds = new Set<number>();
  /**
   * Whether this seat's first-ever Statecraft draft has already been announced
   * — see `checkFirstStatecraftDraft`. Set at `refresh` from the seat's actual
   * history, so a loaded save past its first draft never replays the toast.
   */
  let statecraftDraftAnnounced = false;
  /**
   * Whether a great-person offer was outstanding the last time anything was
   * committed — the rising edge this seat is told about.
   *
   * An **edge** rather than `statecraftDraftAnnounced`'s once-per-game latch,
   * because unlike the first draft this is a thing that happens again: an
   * empire recruits a name every twenty-odd turns for the whole game, and each
   * one is news. It is view state and never in the save, so a reload announces
   * whatever is currently outstanding once — which is right, because a player
   * coming back to a game does need telling.
   */
  let greatPersonOfferOutstanding = false;
  /**
   * Whether the city screen's Buy Tiles mode is up — the next click inside the
   * open city's ring spends gold instead of pinning a citizen.
   *
   * A sibling of `moveMode` and shaped exactly like it: one boolean, one setter
   * that refuses to arm a mode whose clicks would only be refused, and three
   * voices saying so (the cursor, the price tags on the board, the context
   * card). It belongs to the *open city* rather than to the board, so
   * `setOpenCity` puts it down — see there.
   */
  let buyMode = false;
  /**
   * The lens the player chose. The lens actually on the board is
   * `effectiveLens`, which lets a selected settler override this without
   * forgetting it — dropping the settler puts the player's own choice back.
   */
  let manualLens: LensMode = 'none';
  /**
   * The yield glyphs, as the player left them. Not a lens (see `LensMode`): it is
   * an independent switch that can be on under any of them, and an open city
   * panel adds its own glyphs without disturbing it.
   */
  let yieldsOn = LENS_DEFAULTS.yields;
  /**
   * The resource roundels, as the player left them. Not a lens either, and
   * unlike the glyphs it starts *on* — see `LENS_DEFAULTS`. Nothing automatic
   * ever touches it: it is one switch with one meaning.
   */
  let resourcesOn = LENS_DEFAULTS.resources;
  /** A city whose DOM banner the pointer is over. See `setHoveredCity`. */
  let hoveredCityId: number | null = null;
  /**
   * Which button started the current drag, or `null` when nothing is pressed.
   * Left and right both pan; only the button that went down decides what the
   * release means, so a chorded press cannot turn a pan into an order.
   */
  let dragButton: number | null = null;
  let pressX = 0;
  let pressY = 0;
  let travelled = 0;
  /** Last pointer position in viewport space, so hover survives pan and zoom. */
  let pointer: { x: number; y: number } | null = null;
  /** A refusal currently on the card, and the timer that will take it away. */
  let rejection: string | null = null;
  let rejectionTimer = 0;
  /**
   * A guidance line currently on the card, and the timer that will take it
   * away — the same shape as `rejection`/`rejectionTimer`, for the same reason:
   * both are one-off lines in the same slot, and both fade on their own clock
   * rather than waiting to be replaced.
   */
  let guidance: string | null = null;
  let guidanceTimer = 0;
  /**
   * The sighting diff's memory: what each seat has already been told is there.
   *
   * View state, per seat, and never reset by anything but a new game — which is
   * exactly what makes a camp announce itself once instead of every time a
   * patrol re-enters its valley. See `notifications.ts`.
   */
  const sightings = createSightingWatcher();

  // --- the context card's message line -------------------------------------

  /**
   * Says whatever is currently truest: a refusal while one is fresh, otherwise
   * guidance while it is fresh, otherwise move mode while it is armed, otherwise
   * nothing. One funnel, so none of the sources can fight over the line.
   *
   * Refusal outranks guidance because it is always the *newer* of the two — a
   * refusal only exists in reaction to the very last thing the player did, and
   * the two are never armed by the same gesture. Both outrank the standing mode
   * lines, and both revert to whichever mode line is live once their own timer
   * clears — the mode line was never gone, it was only covered.
   *
   * News no longer competes for this slot — it goes to `announce` and the toast
   * stack — so what is left here is a refusal, a guidance line, and the two
   * standing mode lines, which is the whole of what a card under the cursor
   * should carry.
   */
  function publishNotice(): void {
    if (rejection !== null) onNotice?.(rejection, 'reject');
    else if (guidance !== null) onNotice?.(guidance, 'guide');
    // Two sentences, because a spent piece can still be ordered and the board
    // cannot say so — see `MOVE_MODE_SPENT_NOTICE`. Asked of the live selection
    // rather than latched at arming time: a unit that spends its last point
    // *while* move mode is up (there is no such gesture today, and the line
    // should still be right the day there is) re-reads on the next publish.
    else if (moveMode) onNotice?.(moveModeNotice(selectedUnit()?.movesLeft ?? 0), 'mode');
    // Below move mode, because the two cannot be armed together — opening a city
    // disarms a move order (see `setOpenCity`) and buy mode lives inside an open
    // city — but the order is stated rather than assumed, so the line stays
    // right if that ever stops being true.
    else onNotice?.(buyMode ? BUY_MODE_NOTICE : null, 'mode');
  }

  /** Reports an order the game would not take, visibly and briefly. */
  function reject(text: string): void {
    rejection = text;
    window.clearTimeout(rejectionTimer);
    rejectionTimer = window.setTimeout(() => {
      rejection = null;
      publishNotice();
    }, NOTICE_MS);
    publishNotice();
  }

  /**
   * Points the player at something they asked to be pointed at — End Turn's
   * blocker, and anything with the same shape: a reply to a gesture, not a "no".
   *
   * Same bottom-left slot and the same fade-on-a-timer as `reject`, and
   * deliberately a separate function rather than an `AnnounceOptions` flag: a
   * call site that reads `guide('☞ …')` is legible for what it is without
   * anyone having to know `announce`'s options to tell the two apart. See the
   * module docblock's three-way split.
   */
  function guide(text: string): void {
    guidance = text;
    window.clearTimeout(guidanceTimer);
    guidanceTimer = window.setTimeout(() => {
      guidance = null;
      publishNotice();
    }, NOTICE_MS);
    publishNotice();
  }

  /**
   * Reports something that *happened* — a blow landed, a city taken, a ruin
   * sighted. A toast under the bar and a line in this seat's chronicle, which is
   * a different channel from a refusal and deliberately so (module docblock).
   *
   * The turn is stamped here, off the live state, so an entry always says the
   * turn it was announced on rather than the turn the panel happens to be read
   * on.
   */
  function announce(text: string, opts: AnnounceOptions = {}): void {
    const entry: NotificationEntry = { turn: getGame().state.turn, text };
    // `AnnounceOptions` still takes a bare `cell` — every call site in this file
    // already reads that way (its own docblock's reason) — and it is `announce`
    // that wraps it into the action union `NotificationEntry` actually carries.
    // `cell` wins if a call site ever set both (see `AnnounceOptions.openStatecraft`).
    if (opts.cell) {
      entry.action = { kind: 'pan', cell: { col: opts.cell.col, row: opts.cell.row } };
    } else if (opts.openStatecraft) {
      entry.action = { kind: 'openStatecraft' };
    } else if (opts.openGreatPerson) {
      entry.action = { kind: 'openGreatPerson' };
    }
    onNotify?.(entry, localPlayerId);
  }

  // --- sightings -----------------------------------------------------------

  /**
   * Announces whatever the local seat has just come to know is out there.
   *
   * Called from `commit` — after every command the reducer accepted, which is
   * also every turn resolution, since ending the turn is a command. A refused
   * command left the state byte-identical (hard rule 1), so there is nothing new
   * for it to have sighted and it is not polled for.
   */
  function pollSightings(): void {
    for (const sighting of sightings.poll(getGame().state, localPlayerId)) {
      announce(sighting.text, { cell: { col: sighting.col, row: sighting.row } });
    }
  }

  /**
   * Files everything the seat currently knows as already-told, saying nothing.
   *
   * The seat-change and new-game half. A player sitting down at a chair has not
   * just *discovered* that chair's whole empire — its ruins, the camps its
   * borders already watch — so the baseline is taken silently and the next poll
   * speaks only about what changed while this seat was playing. Without it,
   * every seat hop in the hot-seat harness would open with a column of toasts
   * about ground that seat charted forty turns ago.
   */
  function baselineSightings(): void {
    sightings.baseline(getGame().state, localPlayerId);
  }

  // --- the reducer seam ----------------------------------------------------

  /**
   * The one place this module hands a command to the simulation.
   *
   * `dispatch` plus the after-effects that belong to *every* accepted command
   * rather than to any one of them — the sighting diff, which has to run
   * wherever the board's contents or this seat's fog could have moved, and that
   * is precisely "a command was accepted"; and the raid report, which is the
   * same argument for a fight this seat did not order. A refusal changes nothing
   * (hard rule 1: rejected command = state byte-identical) and is handed back
   * untouched for the caller to `reject`.
   *
   * Written as a funnel rather than as a line repeated at each of the dozen call
   * sites because the failure mode of the repeated version is invisible: a new
   * command that forgot it would simply never announce a sighting, and nobody
   * would notice until a scout walked past a ruin in silence.
   */
  function commit(command: Command): CommandResult {
    // Read before the dispatch, for `unitSnapshot`'s reason exactly: a caravan
    // that is plundered during this command is off the board by the time
    // anybody reports it, and the route died with it (a plundered caravan is a
    // plundered route). "Your caravan **to Nippur**" is therefore a fact only
    // the moment before can answer, and re-deriving it afterwards is not a
    // worse implementation — it is an impossible one.
    const caravans = caravanDestinations();
    const result = dispatch(getGame(), command);
    if (result.ok) {
      pollSightings();
      reportRaids(result, caravans);
      reportWonders(result);
      reportGrants(result);
      reportRoutes(result);
      reportSieges(result);
      reportTriumphs(result);
      checkFirstStatecraftDraft();
      checkGreatPersonOffer();
    }
    return result;
  }

  /**
   * **Somebody finished a wonder.** One chronicle line for the world, and one
   * more for this seat if it was the one beaten to it.
   *
   * The one report in this file that is deliberately *not* filtered by seat
   * (`reportRaids` is the foil). A wonder is the one thing in the game another
   * empire completing takes away from you, whether or not you can see the town
   * it stands in — Civ has always said so out loud, and a player who was
   * building it and heard nothing would only find out by opening the panel and
   * seeing an empty queue.
   *
   * A chronicle line and nothing else: no splash, no "Mirabile" flourish. The
   * naming bible allows the flourish as splash flavour, and this is the plain
   * record of a thing that happened.
   *
   * The refund line is the *seat's* half and comes second, because it is the
   * consequence rather than the news. It is read straight off the report — the
   * gold is already in the treasury and the queue row is already gone by the
   * time this runs, so nothing here can be re-derived from the board (see
   * `WonderCompletion`).
   */
  function reportWonders(result: CommandResult): void {
    if (!result.ok || !result.wonders) return;
    const { state } = getGame();
    for (const done of result.wonders) {
      const city = cityById(state, done.cityId);
      const empire = playerById(state, done.playerId)?.name ?? 'An empire';
      const where = city ? cityDisplayName(state, city) : 'a distant city';
      announce(
        `✶ ${empire} has completed ${done.name} in ${where}`,
        city ? { cell: { col: city.col, row: city.row } } : {},
      );
      for (const refund of done.refunds) {
        if (refund.playerId !== localPlayerId) continue;
        const beaten = cityById(state, refund.cityId);
        if (!beaten) continue;
        const name = cityDisplayName(state, beaten);
        const cell = { col: beaten.col, row: beaten.row };
        // Two sentences, because they are two different pieces of news: a town
        // that had banked nothing simply stops building it, and a town that had
        // banked a hundred hammers wants to know where they went.
        if (refund.hammers > 0) {
          announce(
            `${name}'s ${refund.hammers}${HAMMER} toward ${done.name} returned as ` +
              `${refund.gold}${YIELD_GLYPH.gold}`,
            { cell },
          );
          continue;
        }
        announce(`${done.name} left ${name}'s queue — it stands elsewhere`, { cell });
      }
    }
  }

  /**
   * **And what the wonder handed over.** One line per grant, the marvel named
   * first and the thing it produced second.
   *
   * `reportWonders`' half-step sibling: the wonder line is the world's news and
   * this is the owner's, so it runs immediately after and reads the same
   * result. The rule that decides which grants are this seat's, and which
   * marvel each belongs to, is the pure `wonderGrantNotices` — everything left
   * here is the two things a closure has to do, resolving a new piece's hex for
   * the pan and raising the card a Doctrine draft demands.
   *
   * The pan is the same gesture a raid's line carries: a free Spearman is a
   * piece the player did not place and would otherwise have to go looking for.
   *
   * **The Doctrine is opened, not merely announced**, and that is the one place
   * this differs from `checkGreatPersonOffer`'s rising edge. The argument in
   * `scheduleHandOver` — a draft that lands in a resolution gets the chronicle
   * rather than the wheel — is about the culture meter filling on a turn the
   * player aimed at nothing in particular. This one is a *consequence of a thing
   * the player just built*: the Theatre of Dionysus is four hundred hammers with
   * "and a Doctrine" printed on the card, so the card arriving is the
   * announcement, exactly as a claimed ruin's offer is (`onOfferDiscovery` in
   * `reportArrivals`). Raised last, so the chronicle line is already standing
   * behind the modal when it lands; the End Turn blocker remains the backstop
   * for a player who came to it any other way (`statecraftBlocker`).
   */
  function reportGrants(result: CommandResult): void {
    if (!result.ok) return;
    const notices = wonderGrantNotices(result.wonders, result.grants, localPlayerId);
    if (notices.length === 0) return;
    const { state } = getGame();
    let doctrine = false;
    for (const notice of notices) {
      const born = notice.unitId === undefined ? undefined : unitById(state, notice.unitId);
      announce(notice.text, born ? { cell: { col: born.col, row: born.row } } : {});
      if (notice.opensDoctrine) doctrine = true;
    }
    if (doctrine) onOfferStatecraft?.();
  }

  /**
   * **A route ran out.** One line per caravan of this seat's that reached the
   * end of its twenty turns during the resolution.
   *
   * `reportTriumphs`' shape and `reportGrants`' scale: seat-filtered, read off
   * the reducer's own report (`CommandResult.routesEnded`, which arrives on the
   * resolving `endTurn` alone), and folded into `commit` so there is one call
   * site rather than one per verb. Nothing here diffs the board, and it could
   * not: a route that ended left no trace on the piece except an absence, and a
   * renewed one looks exactly like a route that was always running.
   *
   * The sentence is `tradeLines.ts`', with the two halves the player has to tell
   * apart — a caravan come home is a slot to spend and a piece to give an order
   * to, and one that set out again is neither.
   */
  function reportRoutes(result: CommandResult): void {
    if (!result.ok || !result.routesEnded) return;
    for (const report of result.routesEnded) {
      if (report.ownerId !== localPlayerId) continue;
      announce(routeEndSentence(getGame().state, report));
    }
  }

  /** "−5 this turn", or "holds at 1" when the chip was already at its floor. */
  function siegeTail(report: SiegeReport): string {
    return report.damage > 0 ? `−${report.damage} this turn` : 'holds at 1';
  }

  /**
   * **A besieged city.** One toast per turn per town of this seat's the heal
   * phase found cut off (`CommandResult.sieges`, `endTurn` alone).
   *
   * `reportRoutes`' shape and reason: seat-filtered, read off the reducer's own
   * report rather than diffed off the board, because by the time this runs the
   * hit points have already moved and the board cannot say why. A siege that
   * dealt no damage is still news — the town was cut off, it was simply already
   * at its floor — so the sentence fires either way and says which.
   */
  function reportSieges(result: CommandResult): void {
    if (!result.ok || !result.sieges) return;
    const { state } = getGame();
    for (const report of result.sieges) {
      if (report.ownerId !== localPlayerId) continue;
      const city = cityById(state, report.cityId);
      if (!city) continue;
      const name = cityDisplayName(state, city);
      announce(`✶ ${name} is under siege · ${siegeTail(report)}`, {
        cell: { col: city.col, row: city.row },
      });
    }
  }

  /**
   * **You earned a Triumph.** One chronicle line each, with what it paid.
   *
   * `reportWonders`' sibling and `reportRaids`' opposite: filtered by seat,
   * because a triumph is a claim on the world made by *one* empire and the news
   * another empire wants about it is the wonder or the captured city that
   * carried it, both of which already have their own lines.
   *
   * It reads the reducer's own report rather than diffing the board, and it
   * covers **both** paths without a second call site, which is the whole reason
   * it lives in `commit`: a triumph earned inside a command (a city founded, a
   * government adopted, a great person's hurry finishing a wonder) rides that
   * command's `CommandResult.triumphs`, and every triumph earned during a
   * *resolution* rides `endTurn`'s — `applyEndTurn` hands `TurnReport.triumphs`
   * straight into its own result. So the two paths are one funnel here, exactly
   * as they already are for combats and wonders.
   *
   * The renown is **already banked** by the time this runs (`awardTriumph` pays
   * through `settleRenownWindfall` the instant it awards), so the line says what
   * it paid rather than what it will pay — and the offer it may have opened is
   * announced by `checkGreatPersonOffer`, not here.
   *
   * **Two volumes, one funnel** (user, 2026-08-27). The chronicle line stays and
   * is written here for every award, because the log is the record. The *sheet*
   * (`triumphModal.ts`) is the moment, and the moment it belongs to is not
   * always now: a Triumph earned by a command the player just issued is shown on
   * the spot, and a Triumph earned in a *resolution* waits for the hand-over —
   * marches, then the turn card, then this, then the camera (CLAUDE.md's three
   * beats). Dropping a sheet over pieces that are still walking is the failure
   * `onTurnResolved`/`onTurnHandedOver` were split apart to prevent, so this
   * only ever *collects*, and `endTurn` decides which of the two it is.
   */
  function reportTriumphs(result: CommandResult): void {
    if (!result.ok || !result.triumphs) return;
    const mine: TriumphAward[] = [];
    for (const triumph of result.triumphs) {
      if (triumph.playerId !== localPlayerId) continue;
      announce(`✦ Triumph — ${triumph.name} · ${signedFigure(triumph.pays)} renown`);
      mine.push(triumph);
    }
    if (mine.length === 0) return;
    if (heldTriumphs === null) onTriumphs?.(mine);
    else heldTriumphs.push(...mine);
  }

  /**
   * Triumphs collected while a resolution is being applied, or `null` whenever
   * nothing is collecting.
   *
   * The `null`/array distinction is the whole of "is this a resolution": every
   * ordinary command leaves it `null` and its awards go straight to the sheet.
   * `endTurn` sets it to an empty array around its own `commit` and empties it
   * itself, so a triumph can never be stranded — either the turn resolved and
   * the hand-over shows them, or it did not and they are shown at once.
   */
  let heldTriumphs: TriumphAward[] | null = null;

  /**
   * The Statecraft screen's batch, through the same seam every other order takes.
   *
   * The screen stages an arrangement and sends it as **one list** when the
   * player confirms it or leaves (see `statecraftScreen.ts`), and the list is
   * ordered so that it is valid at every step — every `unslotOrder` before every
   * `slotOrder`, which is `statecraftStaging.ts`'s `diff`. This walks it through
   * `commit` so a slot changed on that sheet is a slot changed exactly the way a
   * network peer or a future AI would change one: the same autosave, the same
   * sighting poll, the same blockers.
   *
   * It stops at the first refusal, reports it in this module's own rejection
   * line, and answers it — the screen then re-syncs its arrangement from the
   * live state rather than leaving half of it standing. After validation that
   * should be unreachable; the one refusal an evaluator cannot foresee is the
   * reducer's seat guard (a seat that has ended its turn has finished rewriting
   * its law), which is why this reports rather than throws.
   *
   * The repaint at the end is `refreshOverlays` and one `onUpdate`, deliberately
   * **not** the public `refresh()`: that one is "the game object was replaced"
   * and it seats the client back at player 0, which on a hot-seat table would
   * hand the chair to somebody else for slotting a card.
   */
  function sendStatecraft(commands: readonly StatecraftSlotCommand[]): string | null {
    let sent = 0;
    let refusal: string | null = null;
    for (const command of commands) {
      const result = commit(command);
      if (!result.ok) {
        reject(result.error);
        refusal = result.error;
        break;
      }
      sent++;
    }
    if (sent > 0) {
      refreshOverlays();
      onUpdate(selectedUnit(), renderer.getHover());
    }
    return refusal;
  }

  /**
   * **Somebody hit you.** One line per blow this seat was on the wrong end of,
   * with a pan action onto the hex it landed on.
   *
   * The news a player was missing (user, 2026-08-26): the wild does all of its
   * raiding inside the end-of-turn resolution, so a worker could be stolen and a
   * warrior beaten to a third of its hit points between one press of End Turn
   * and the next, and nothing said a word. The board afterwards cannot be asked
   * about it — the raider has already been paid — which is why the reducer
   * reports (`CommandResult.combats`, `TurnReport`) rather than the interface
   * diffing.
   *
   * Three rules, and each is about *whose* news this is:
   *
   *   · **Only the seat that was struck**, never the seat that struck. A blow
   *     this seat ordered already has its own line (`reportCombatNotice`), and
   *     announcing it twice is the interface talking over itself.
   *   · **The attacker is named** — "a raider", "Ada's Warrior" — because "you
   *     were attacked" without a subject is a line a player cannot act on. Both
   *     phrasings are written even though only the wild can reach this channel
   *     today (`attack` deliberately reports nothing — see `applyAttack`): under
   *     netcode a relayed blow arrives the same shape, and a branch written when
   *     the rule is fresh is a branch that is right.
   *   · **A death or a capture outranks a scratch.** They are different news:
   *     one is a unit to heal, the other is a unit to replace.
   *
   * A city taking a hit is deliberately not announced here: a town is not lost
   * to a raid (barbarians never capture), it heals itself every turn, and the
   * banner already shows the bar. The day a *player* besieges a town, this is
   * the function that grows the clause.
   */
  function reportRaids(result: CommandResult, caravans: ReadonlyMap<number, string>): void {
    if (!result.ok || !result.combats) return;
    const { state } = getGame();
    for (const combat of result.combats) {
      if (combat.defenderOwnerId !== localPlayerId) continue;
      if (combat.attackerOwnerId === localPlayerId) continue;
      if (combat.defenderUnitId === null) continue;
      const cell = { col: combat.at.col, row: combat.at.row };
      // A laden caravan first, before the ordinary slain/taken/scratched split:
      // it is none of those three. The piece is dead like anything else in
      // `killed`, but what a player has lost is the *route* — twenty turns of
      // food from a town they chose — and "your trader was slain" would bury
      // that under a casualty report. The destination comes from the snapshot
      // `commit` took before the dispatch; see there.
      if (combat.plundered) {
        announce(plunderLossSentence(caravans.get(combat.defenderUnitId) ?? null), { cell });
        continue;
      }
      const attacker = isBarbarian(state, combat.attackerOwnerId)
        ? `a ${combat.attackerName.toLowerCase()}`
        : `${playerById(state, combat.attackerOwnerId)?.name ?? 'an enemy'}'s ${combat.attackerName}`;

      if (combat.capturedUnitId === combat.defenderUnitId) {
        announce(`⚔ Your ${combat.defenderName.toLowerCase()} was taken by ${attacker}`, {
          cell,
        });
        continue;
      }
      const fell = combat.killed.some((unit) => unit.id === combat.defenderUnitId);
      if (fell) {
        announce(`⚔ Your ${combat.defenderName.toLowerCase()} was slain by ${attacker}`, { cell });
        continue;
      }
      // Still standing: the hit points it has left, read off the board rather
      // than subtracted here, so the line agrees with the bar over its head.
      const survivor = unitById(state, combat.defenderUnitId);
      const left = survivor === undefined ? '' : ` — ${survivor.hp}/${unitDef(survivor.type).maxHp}`;
      announce(
        `⚔ Your ${combat.defenderName.toLowerCase()} was attacked by ${attacker}${left}`,
        { cell },
      );
    }
  }

  /**
   * Where each of the local seat's laden caravans is bound, by unit id.
   *
   * Taken before a dispatch and read after it (`commit`). Two or three entries
   * in a normal game, so it costs nothing; and it is the only way the interface
   * can name the far end of a route that has just been plundered — the piece is
   * gone, and the route was the piece.
   */
  function caravanDestinations(): Map<number, string> {
    const names = new Map<number, string>();
    const { state } = getGame();
    for (const unit of state.units) {
      if (unit.ownerId !== localPlayerId) continue;
      const pair = routeCities(state, unit);
      if (!pair) continue;
      names.set(unit.id, cityDisplayName(state, pair.to));
    }
    return names;
  }

  // --- move mode -----------------------------------------------------------

  /**
   * Arms or disarms the keyboard route to a move order.
   *
   * Three things say so at once, because a mode the player cannot see is a mode
   * they will be surprised by: the board takes a crosshair cursor (a class on
   * the viewport, which owns the cursor), the selected unit's ring brightens
   * (an optional renderer hook — the frozen 2D pipelines simply do not have
   * one), and the context card explains itself in words.
   *
   * Arming requires a unit that could actually be ordered. Asking for move mode
   * with nothing selected, or after ending your turn, does nothing rather than
   * arming a mode whose next click would only be refused.
   */
  function setMoveMode(on: boolean): void {
    const next = on && selectedUnit() !== null && canOrder();
    if (next === moveMode) return;
    moveMode = next;
    viewport.classList.toggle('is-move-mode', moveMode);
    renderer.setMoveModeHighlight?.(moveMode);
    publishNotice();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- buy mode ------------------------------------------------------------

  /**
   * Arms or disarms the city screen's Buy Tiles mode.
   *
   * `setMoveMode`'s twin, and deliberately so: a mode is a boolean, a setter
   * that will not arm what could only be refused, and enough voices that nobody
   * is surprised by the state they are in. Here those voices are the crosshair
   * on the viewport, the price tags the overlay paints on every frontier hex,
   * and the context card.
   *
   * It refuses to arm without an open city of the local seat's, and after that
   * seat has ended its turn — the reducer would refuse every click, and a mode
   * whose whole content is refusals is a mode not worth entering. It does *not*
   * refuse on an empty treasury: a player with no gold is exactly the player who
   * wants to see what the ground costs, and the tags grey themselves with the
   * reason (`purchasableTiles`).
   */
  function setBuyMode(on: boolean): void {
    const next = on && openCity() !== null && canOrder();
    if (next === buyMode) return;
    buyMode = next;
    viewport.classList.toggle('is-buy-mode', buyMode);
    publishNotice();
    refreshOverlays();
    renderer.invalidate();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /**
   * Spends gold on the hovered hex, or says why not.
   *
   * Returns whether the click was *claimed*, not whether the purchase went
   * through: a refusal inside the ring is still this mode's click, and letting
   * it fall through to the citizen board would mean an unaffordable tag pinned
   * a citizen instead. The sentence a player reads is the reducer's own, which
   * is the same sentence the greyed tag is already carrying.
   */
  function purchaseTile(col: number, row: number): boolean {
    const city = openCity();
    if (!city) return false;
    if (!withinWorkRadius(getGame().state, city, col, row)) return false;

    if (!canOrder()) {
      reject(`You have ended turn ${getGame().state.turn}`);
      return true;
    }

    const command: Command = {
      type: 'purchaseTile',
      playerId: localPlayerId,
      cityId: city.id,
      col,
      row,
    };
    const result = commit(command);
    if (!result.ok) {
      reject(result.error);
      return true;
    }

    announce(`Bought a tile for ${city.name}`, { cell: { col, row } });
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
    return true;
  }

  // --- caravans ------------------------------------------------------------

  /**
   * Why this seat cannot start any route at all, or `null`.
   *
   * The whole of what is left of the old `sendCaravanBlocker` (2026-08-28). Send
   * mode is gone — there is no board full of plates, no mode to arm and no "a
   * caravan sets out from a city" clause, because the ruling made the caravan
   * teleport to whichever origin the player picks on the Trade screen. What
   * survives is the one refusal that is true of the *empire* and would otherwise
   * be discovered by opening a screen full of greyed rows: the route ledger is
   * full. The sentence is the user's own (`NO_ROUTE_CAPACITY`) rather than the
   * reducer's two, and it is the same sentence every greyed Start on the screen
   * prints — one fact, one wording.
   *
   * Offered to a caravan whether or not it can be sent *now*, which is Fortify's
   * reading rather than Found City's: a market finishing next turn gives the
   * button back, and hiding it would make that something a player has to
   * discover.
   */
  function startRouteBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    const { state } = getGame();
    if (!trades(unitDef(unit.type))) return `A ${unitDef(unit.type).name} carries no trade route`;
    if (unit.trade !== undefined) {
      return `${unitDef(unit.type).name} ${unit.id} is already carrying a route`;
    }
    return hasFreeRouteSlot(state, localPlayerId) ? null : NO_ROUTE_CAPACITY;
  }

  /**
   * Opens a route, naming the caravan and **both** towns.
   *
   * The screen's one write. It is by id all the way through because none of the
   * three is a thing the board has in hand: the caravan may be anywhere (and
   * under the ruling is teleported to the origin), and the origin is *chosen*
   * rather than read off the piece's hex. A caravan that is not this seat's is
   * ignored, which is the answer the reducer would give.
   *
   * The announcement is read *after* the command, off the route the reducer just
   * wrote — the sheet's own line, so the toast and the panel say one sentence —
   * and it is anchored at the piece's new hex, which is the origin.
   */
  function startRouteFrom(unitId: number, fromCityId: number, toCityId: number): void {
    const { state } = getGame();
    if (!canOrder()) {
      reject(`You have ended turn ${state.turn}`);
      return;
    }
    const unit = unitById(state, unitId);
    if (!unit || unit.ownerId !== localPlayerId) return;

    const result = commit({
      type: 'startRoute',
      playerId: localPlayerId,
      unitId,
      fromCityId,
      toCityId,
    });
    if (!result.ok) {
      reject(result.error);
      return;
    }

    const reading = routeReadingOf(getGame().state, unit);
    if (reading) {
      announce(`✦ ${reading.line}`, { cell: { col: unit.col, row: unit.row } });
    }
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /** The selected caravan's live route, as the sheet reads it. */
  function routeReading(): RouteReading | null {
    const unit = selectedUnit();
    if (!unit) return null;
    return routeReadingOf(getGame().state, unit);
  }

  /**
   * Flips the selected caravan's auto-resend.
   *
   * The reducer refuses a value that would change nothing, and that refusal is
   * *shown*: a toggle that silently did nothing would be a switch a player
   * cannot trust. Everything else is the ordinary funnel.
   */
  function setAutoResend(on: boolean): void {
    const unit = selectedUnit();
    if (!unit) return;
    setAutoResendWith(unit, on);
  }

  /** `setAutoResend` by id. See `startRouteFrom`. */
  function setAutoResendOf(unitId: number, on: boolean): void {
    const unit = unitById(getGame().state, unitId);
    if (!unit || unit.ownerId !== localPlayerId) return;
    setAutoResendWith(unit, on);
  }

  function setAutoResendWith(unit: Unit, on: boolean): void {
    const result = commit({
      type: 'setAutoResend',
      playerId: localPlayerId,
      unitId: unit.id,
      on,
    });
    if (!result.ok) {
      reject(result.error);
      return;
    }
    announce(on ? 'The caravan will renew its route' : 'The caravan will come home');
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /**
   * Ends the selected caravan's route now.
   *
   * `cancelOrder` for the *route* rather than for the march — two verbs for two
   * things a player might mean, which is the reducer's own split. The slot comes
   * back the instant this returns, which is the reason anybody presses it, so
   * the announcement says so.
   */
  function cancelRoute(): void {
    const unit = selectedUnit();
    if (!unit) return;
    cancelRouteWith(unit);
  }

  /** `cancelRoute` by id. See `startRouteFrom`. */
  function cancelRouteOf(unitId: number): void {
    const unit = unitById(getGame().state, unitId);
    if (!unit || unit.ownerId !== localPlayerId) return;
    cancelRouteWith(unit);
  }

  function cancelRouteWith(unit: Unit): void {
    const result = commit({ type: 'cancelRoute', playerId: localPlayerId, unitId: unit.id });
    if (!result.ok) {
      reject(result.error);
      return;
    }
    announce(`The route is ended — ${routeSlotsLineOf(getGame().state, localPlayerId)}`);
    renderer.invalidate();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- the local seat ------------------------------------------------------

  /** False once this seat has ended its turn: it may look, but not order. */
  function canOrder(): boolean {
    return !hasEndedTurn(getGame().state, localPlayerId);
  }

  /** Where the local player's pieces are, for the camera to frame. */
  function localUnitCells(): CellRef[] {
    return getGame()
      .state.units.filter((unit) => unit.ownerId === localPlayerId)
      .map((unit) => ({ col: unit.col, row: unit.row }));
  }

  /**
   * Points the camera at the local player's units.
   *
   * Optional on `MapView` and therefore optional here: under the frozen 2D
   * renderers this is a no-op, which is the correct amount of new behaviour for
   * a frozen pipeline. A player with no units left has nothing to look at, so
   * the camera stays put rather than lurching to the origin.
   */
  function showLocalPlayer(animate: boolean): void {
    const cells = localUnitCells();
    if (cells.length === 0) return;
    renderer.panToCells?.(cells, animate && !prefersReducedMotion());
  }

  function setLocalPlayer(playerId: number): void {
    if (playerId === localPlayerId) return;
    localPlayerId = playerId;
    // The board is masked by whoever is sitting at it. First, before the
    // overlays refresh: a reachable-tile highlight or a worked-tile dot computed
    // against the previous seat's fog would be drawn for one frame over ground
    // the new seat has never seen.
    renderer.setFogSeat?.(playerId);
    // A selection belongs to the seat that made it, and so does an open city —
    // and move mode belongs to the selection. The skip set is the same kind of
    // thing: it is one seat's silence, and the seat sitting down now has said
    // nothing yet.
    selectedId = null;
    openCityId = null;
    hoveredCityId = null;
    skippedUnitIds.clear();
    // And a hand-over the previous seat's End Turn was still owed: its card and
    // its camera glide are that player's, and this chair is somebody else's.
    cancelHandOver();
    // Silently, before anything else can poll: the chair this player has just
    // taken has been looking at its own ruins and its own frontier for the whole
    // game, and none of that is news. See `baselineSightings`.
    baselineSightings();
    setMoveMode(false);
    renderer.skipAnimations();
    refreshOverlays();
    showLocalPlayer(true);
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- selection -----------------------------------------------------------

  function selectedUnit(): Unit | null {
    if (selectedId === null) return null;
    const unit = unitById(getGame().state, selectedId);
    // The unit may have been removed, or the seat may have changed under the
    // selection; either way it is stale.
    if (!unit || unit.ownerId !== localPlayerId) return null;
    return unit;
  }

  function refreshOverlays(): void {
    const unit = selectedUnit();
    renderer.setSelectedUnitId(unit ? unit.id : null);
    // A seat that has ended its turn gets no reachable highlight: every one of
    // those tiles would refuse the order.
    renderer.setReachable(
      unit && canOrder() ? reachableTiles(getGame().state, unit).map((r) => r.tile) : [],
    );
    // What this piece could *fight*, which is a different set from what it could
    // walk to — an archer reaches past its movement, a swordsman cannot step
    // onto the tile it is attacking.
    renderer.setAttackable?.(attackableCells());
    refreshSpotlight();
    refreshCityFocus();
    refreshLens();
    // A unit that is already marching shows the route it is marching on. Only
    // the selected one: every stored order on the board at once would be a
    // cat's cradle, and the question is always about the piece in hand.
    renderer.setCommittedPath?.(unit?.path ?? []);
    refreshPathPreview();
  }

  /**
   * The city the board is currently talking about: the open panel's, or — with
   * no panel open — whichever city the pointer is resting on, whether that is
   * its tile or its banner.
   *
   * Hovering answering the same question the panel does is deliberate: "which
   * tiles feed this city" is asked far more often than it is worth opening a
   * screen for, and the dots are already drawn. Anybody's city answers, because
   * there is no fog of war to make it a secret and a banner you can read but not
   * interrogate would be a strange half-measure.
   */
  function spotlitCity(): City | null {
    const open = openCity();
    if (open) return open;
    const { state } = getGame();
    if (hoveredCityId !== null) {
      const banner = cityById(state, hoveredCityId);
      if (banner) return banner;
    }
    const hover = renderer.getHover();
    if (!hover) return null;
    return cityAt(state, hover.tile.col, hover.tile.row) ?? null;
  }

  /** The worked-tile dots, and which of them the player pinned by hand. */
  function refreshSpotlight(): void {
    const city = spotlitCity();
    if (!city) {
      renderer.setWorkedTiles?.([], []);
      return;
    }
    // Only *honoured* pins are drawn: a lock on a tile the city cannot work
    // right now is real intent (it is kept, see `assignCitizens`) but there is
    // no citizen standing on it to mark.
    const worked = city.workedTiles;
    const locked = city.lockedTiles.filter((cell) =>
      worked.some((tile) => tile.col === cell.col && tile.row === cell.row),
    );
    renderer.setWorkedTiles?.(worked, locked);
  }

  /**
   * The city screen's vignette: while a city panel is open, the board washes
   * down everything outside that city's work radius.
   *
   * `openCity()` and deliberately **not** `spotlitCity()`, which is the one line
   * in this function worth arguing about. The worked-tile dots answer "which
   * ground feeds this town" for a hovered banner too, because that is a cheap
   * question a player asks constantly. The vignette is not answering a question,
   * it is saying *you are on a different screen now* — and a wash that swept the
   * board every time the pointer crossed a town would be saying it about
   * nothing.
   *
   * It rides `refreshOverlays` rather than `setOpenCity` for the reason the
   * banner hide does: `setOpenCity` is one of the ways a city stops being open,
   * not all of them. A seat change, a new game and a load each clear
   * `openCityId` directly and then refresh, and a city destroyed or captured
   * under the panel stops resolving without anybody assigning anything. Reading
   * the derived answer on the sweep they all already make is what makes those
   * paths free.
   */
  function refreshCityFocus(): void {
    const city = openCity();
    if (!city) {
      renderer.setCityFocus?.(null, !prefersReducedMotion());
      return;
    }
    const tile = cityTile(getGame().state.map, city);
    renderer.setCityFocus?.({ col: tile.col, row: tile.row }, !prefersReducedMotion());
  }

  /**
   * What the board is showing: which lens, and whether the yield glyphs and the
   * resource roundels are up.
   *
   * Three automatic rules sit on top of the player's own choices, all because
   * the question they answer is the question the player has just asked by doing
   * something else. They are independent of each other, which is the point of
   * splitting the glyphs off the lens list:
   *
   *   · a selected settler ⇒ the settler lens. Picking one up *is* the question
   *     "where should this go".
   *   · a selected **fighting piece** ⇒ the explorer lens. Picking one up is the
   *     same gesture one question over: "where is there still something to
   *     find". Asked of the unit table (`isCombatant`, `isExplorer`) exactly as
   *     the settler rule is asked of `foundsCity` — never of the string
   *     `"scout"` — so a second ranging unit inherits the lens with its data row.
   *
   *     It was the scout's alone until the playtest said otherwise (user,
   *     2026-08-27), and the correction is the honest one: a warrior walked out
   *     of the capital in turn three is doing exactly what the scout is doing,
   *     and a lens that went dark the moment the player picked the other piece
   *     up was answering "who is this" rather than "what is this for". So it is
   *     **every combatant** — `isCombatant`, the same predicate the pillage row
   *     and the capture rule ask, so a civilian keeps a clean board — with
   *     `isExplorer` still in the fold rather than folded away: a ranging piece
   *     that somehow never learns to fight is still an explorer, and dropping
   *     the clause would make that a silent behaviour change rather than a
   *     decision. The two are an `or` today and one of them is redundant today;
   *     which is which is the data's business, not this function's.
   *   · an open city panel ⇒ the glyphs, over that city's work radius. The panel
   *     is a screen full of numbers; this is where they come from.
   *   · the settler lens (auto *or* manual — a player who picked the site menu
   *     row directly asked for exactly what a selected settler asks for) ⇒ the
   *     glyphs, over the whole map. Judging a site with the wash but without the
   *     numbers under it is the report that sent this rule in: crimson and blue
   *     say whether a hex is legal and whether it touches water, and neither
   *     says whether it grows anything. This is a third, independent path to
   *     the glyphs — not folded into the settler-selection rule above, because
   *     it must also fire when the settler lens is up by the player's own
   *     manual choice with no unit selected at all.
   *
   * The two piece rules are written in precedence order and the order has never
   * had to matter: no unit both founds cities and ignores terrain. Settler wins
   * if one ever does, because spending a piece is the more consequential
   * decision of the two.
   *
   * The city rule scopes the glyphs *only while the player has them off*. With the
   * switch already on, the whole map is marked and the radius is part of it, so
   * narrowing to the radius would be the panel taking glyphs away — which is the
   * opposite of what opening it asked for. The settler rule does not scope at
   * all — no `yieldCells` restriction to a hovered site's radius — because the
   * question a settler lens answers is "where", and narrowing the numbers to
   * one candidate before the player has picked one would be answering a
   * question they have not asked yet.
   *
   * No rule touches `manualLens` or `yieldsOn`, so dropping the piece and
   * closing the panel restore exactly what the player had chosen: the settler
   * rule reads `yieldsOn`, `manualLens`, and the selection the same way the
   * other two do, it just adds one more `true` to the `yields` fold rather than
   * writing over the switch. `resourcesOn`
   * has no rule at all: it is what the player set it to, whatever else is up.
   * (Considered extending that to the explorer lens too — a scout is hunting
   * resources as much as a settler is hunting ground — but `resourcesOn`
   * already *defaults* on, so the only viewer it would change anything for is
   * one who deliberately switched roundels off, and overriding that reads as
   * the lens fighting the player rather than helping them the way the settler
   * rule does with a switch that defaults off. Left alone.)
   */
  function effectiveLens(): LensView {
    const playerId = localPlayerId;
    const unit = selectedUnit();
    const def = unit === null ? null : unitDef(unit.type);
    const settler = def !== null && def.foundsCity;
    const explorer = def !== null && (isCombatant(def) || isExplorer(def));
    const city = openCity();
    const mode = settler ? 'settler' : explorer ? 'explorer' : manualLens;
    return {
      mode,
      cells: null,
      resources: resourcesOn,
      resourceCells: null,
      yields: lensShowsYields(mode, yieldsOn, city !== null),
      yieldCells: city && !yieldsOn ? workRadiusCells(city) : null,
      playerId,
    };
  }

  function refreshLens(): void {
    renderer.setLens?.(effectiveLens());
    // The lens and its hover preview go up and come down together — raising the
    // settler lens with the pointer already resting on a hex should show that
    // hex's radius at once, and dropping the lens must take it away.
    refreshSiteRadius();
  }

  /** Every cell within a city's work radius, its own centre included. */
  function workRadiusCells(city: City): CellRef[] {
    const { state } = getGame();
    const centre = tileHex(cityTile(state.map, city));
    return mapRange(state.map, centre, RULES.cities.workRadius).map((tile) => ({
      col: tile.col,
      row: tile.row,
    }));
  }

  /**
   * The settler lens's hover preview: the ground a city founded on the hovered
   * hex would work.
   *
   * The question a player actually asks while holding a settler is not "may I
   * settle here" — the wash already answers that — but "what would I *get*", and
   * that is the ring of tiles its citizens could stand on. Answered with the
   * rules' own `workRadius` through `mapRange`, the same call the city panel's
   * glyph restriction uses, so the preview and a real city's radius cannot come
   * to disagree.
   *
   * Cut at the fog on the lens's own rule (`isExploredBy`, so remembered ground
   * counts): a chip on Terra Incognita would be a promise about ground the seat
   * has never seen, and the board is not drawing a hex under it to put one on.
   *
   * Empty unless the settler lens is actually up — read off `effectiveLens`
   * rather than `manualLens`, because picking a settler up raises that lens
   * without the menu, and that is the moment this preview is for.
   */
  function siteRadiusCells(): CellRef[] {
    if (effectiveLens().mode !== 'settler') return [];
    const hover = renderer.getHover();
    if (!hover) return [];
    const { state } = getGame();
    const cells: CellRef[] = [];
    for (const tile of mapRange(state.map, tileHex(hover.tile), RULES.cities.workRadius)) {
      if (!isExploredBy(state, localPlayerId, tile.col, tile.row)) continue;
      cells.push({ col: tile.col, row: tile.row });
    }
    return cells;
  }

  /**
   * Pushes that preview at the board. Called from `refreshHover` — this is
   * hover-frequency work — and from `refreshLens`, for the lens going up and
   * down under a stationary pointer. The renderer ignores an unchanged list
   * (`setSiteRadius`), so a pointer resting on one tile costs one `mapRange`
   * and nothing else; the *lens* is never rebuilt for a mouse move, which is
   * the whole reason this lives in the overlay layer (see
   * `OverlayState.siteRadius`).
   */
  function refreshSiteRadius(): void {
    renderer.setSiteRadius?.(siteRadiusCells());
  }

  function refreshPathPreview(): void {
    const unit = selectedUnit();
    const hover = renderer.getHover();
    if (!unit || !hover || !canOrder()) {
      renderer.setPathPreview([]);
      return;
    }
    if (hover.tile.col === unit.col && hover.tile.row === unit.row) {
      renderer.setPathPreview([]);
      return;
    }
    renderer.setPathPreview(findPath(getGame().state, unit, hover.tile) ?? []);
  }

  function select(id: number | null): void {
    selectedId = id;
    // The two right-hand panels share one slot, so they share one subject: a
    // unit picked up while a city screen is open closes it, exactly as opening
    // a city drops the selection. Only *taking* a selection does this —
    // clearing one leaves an open city alone, so Escape still backs out one
    // layer at a time.
    if (id !== null && openCityId !== null) {
      openCityId = null;
      renderer.invalidate();
    }
    // Move mode is a property of *this* selection: dropping the unit, or
    // picking a different one, disarms it rather than silently carrying an
    // armed order over to a piece the player has only just clicked.
    if (moveMode) setMoveMode(false);
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  function clearSelection(): void {
    select(null);
  }

  // --- cities --------------------------------------------------------------

  /**
   * The open city, re-read from the state every time.
   *
   * It is stored as an id, not a reference, for the same reason the selection
   * is: the city may have been destroyed, or the seat may have changed under the
   * panel, and either way the id simply stops resolving. Another player's city
   * never resolves at all — enemy banners are information, not a control panel.
   */
  function openCity(): City | null {
    if (openCityId === null) return null;
    const city = cityById(getGame().state, openCityId);
    if (!city || city.ownerId !== localPlayerId) return null;
    return city;
  }

  function setOpenCity(cityId: number | null): void {
    if (openCityId === cityId) return;
    openCityId = cityId;
    // Opening a city is a change of subject. This is also the path a click on a
    // city *banner* takes — banners are DOM over the board, so they never reach
    // the board's own click handling — and an armed move order left hanging
    // behind a city screen would go off on the next click for no visible reason.
    // The same subject-change drops a held unit: the two right-hand panels
    // share one slot (see `select`, which closes a city the mirror way), so a
    // unit panel left under a city screen would just be a stale second voice.
    if (cityId !== null) {
      setMoveMode(false);
      selectedId = null;
      // Frame the work radius the panel is about to talk about — pan *and*
      // zoom, unlike the ordinary camera moves in this file, so the tiles the
      // player is about to pin citizens on are actually on screen. Closing
      // the panel has no mirror call: the player is where they are, and a
      // camera that snapped back on every close would be busier than Civ's.
      const city = openCity();
      if (city) renderer.frameCells?.(workRadiusCells(city), !prefersReducedMotion());
    }
    // Buy mode belongs to the city that was open, whichever way the panel is
    // leaving — closed, or swapped for another town. Carrying it across would
    // arm a purchase against a city the player is no longer looking at.
    setBuyMode(false);
    refreshOverlays();
    renderer.invalidate();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /**
   * Why the selected unit cannot found a city here.
   *
   * The seat's own questions — is this my turn to act — are asked here; the
   * questions about the ground are asked by the simulation, so the button and
   * the reducer are enabled by one rule (see `foundingError`).
   */
  function foundCityBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    return foundingError(getGame().state, unit);
  }

  /** Spends the selected settler on a city. The button and the `B` key. */
  function foundCity(): void {
    const unit = selectedUnit();
    if (!unit || foundCityBlocker() !== null) return;

    const command: Command = {
      type: 'foundCity',
      playerId: localPlayerId,
      settlerUnitId: unit.id,
    };
    if (!commit(command).ok) return;

    // The settler is gone, so the selection is stale by definition; the new
    // city takes its place as the thing the player is looking at. The camera
    // stays exactly where it is — the player is already looking at the tile.
    renderer.skipAnimations();
    selectedId = null;
    setMoveMode(false);
    const founded = cityAt(getGame().state, unit.col, unit.row);
    openCityId = founded ? founded.id : null;
    refreshOverlays();
    renderer.invalidate();
    onUpdate(null, renderer.getHover());
  }

  // --- standing orders -----------------------------------------------------

  /**
   * Why the selected unit's standing order cannot be dropped.
   *
   * The same division of labour as `foundCityBlocker`: this module answers the
   * questions about the *seat* — is there a selection, may it still act — and
   * everything about the order itself is the reducer's, asked by reading the
   * unit. The two agree because there is only one rule for each question.
   */
  function cancelOrderBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    if (!unit.path || unit.path.length === 0) return 'This unit has no standing order';
    return null;
  }

  /**
   * Drops the selected unit's standing order, leaving it where it stands.
   *
   * The unit does not move and nothing else changes, so there is no animation to
   * skip and no camera to move — but the board was drawing the committed route,
   * and it must stop.
   */
  function cancelOrder(): void {
    const unit = selectedUnit();
    if (!unit || cancelOrderBlocker() !== null) return;

    const command: Command = {
      type: 'cancelOrder',
      playerId: localPlayerId,
      unitId: unit.id,
    };
    const result = commit(command);
    if (!result.ok) {
      reject(result.error);
      return;
    }

    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- combat --------------------------------------------------------------

  /**
   * Every tile the selected unit could attack this turn.
   *
   * Candidates come from the unit's *reach* — six neighbours for a swordsman,
   * everything inside `range` for an archer — and each one is then asked of
   * `previewCombat`, which is the same function the reducer validates with. So
   * the red tint marks exactly the attacks that will be accepted: line of
   * sight, adjacency, "has this unit already fought" and "is there anything
   * there at all" are all answered once, by the simulation, rather than being
   * re-guessed here in a form that could drift.
   *
   * It is at most nineteen previews and it runs when the selection changes,
   * not per frame.
   */
  function attackableCells(): CellRef[] {
    const unit = selectedUnit();
    if (!unit || !canOrder()) return [];
    const def = unitDef(unit.type);
    if (!isCombatant(def)) return [];

    const { state } = getGame();
    const origin = getTileAt(state.map, unit.col, unit.row);
    if (!origin) return [];

    const radius = isRanged(def) ? (def.range ?? 1) : 1;
    const cells: CellRef[] = [];
    for (const tile of mapRange(state.map, tileHex(origin), radius)) {
      if (tile.col === unit.col && tile.row === unit.row) continue;
      if (!previewCombat(state, unit.id, { col: tile.col, row: tile.row }).ok) continue;
      cells.push({ col: tile.col, row: tile.row });
    }
    return cells;
  }

  /**
   * The forecast for the hovered tile. See `GameControls.combatForecast`.
   *
   * It answers `null` — rather than a refusal — when there is simply nothing
   * hostile under the pointer, because a card that explained why you cannot
   * attack an empty meadow would be a card that never stopped talking.
   */
  function combatForecast(): CombatPreview | null {
    const unit = selectedUnit();
    const hover = renderer.getHover();
    if (!unit || !hover) return null;
    if (!isCombatant(unitDef(unit.type))) return null;

    const { state } = getGame();
    const { col, row } = hover.tile;
    if (col === unit.col && row === unit.row) return null;
    if (!attackTargetAt(state, col, row, localPlayerId)) return null;
    return previewCombat(state, unit.id, { col, row });
  }

  /** Every unit on the board right now, by id, as it looks this instant. */
  function unitSnapshot(): Map<number, FallenUnit & { hp: number }> {
    const snapshot = new Map<number, FallenUnit & { hp: number }>();
    for (const unit of getGame().state.units) {
      snapshot.set(unit.id, {
        id: unit.id,
        type: unit.type,
        ownerId: unit.ownerId,
        col: unit.col,
        row: unit.row,
        hp: unit.hp,
      });
    }
    return snapshot;
  }

  /**
   * Attacks the hovered tile with the selected unit, and reports whether it took
   * the click.
   *
   * Taking the click is decided *before* the command: if something hostile is
   * standing there, this gesture was an attack, and a refusal is spoken rather
   * than quietly falling through to a move order that would only be refused
   * again for a worse reason ("a foreign unit is in the way").
   *
   * Everything the interface says afterwards is measured rather than reported by
   * the reducer: the names come from the forecast taken beforehand, and the
   * damage figures are hit-point differences across the dispatch. That is
   * deliberate — the UI stays a reader of the board, which means these numbers
   * cannot disagree with what the board shows.
   *
   * The one thing it does *not* measure is what the advance found on the tile it
   * took: a cleared camp's bounty is already banked by the time this returns and
   * the camp is gone, so that half is reported by the command rather than read
   * off the board (`CommandResult.arrivals`, and `reportArrivals` below).
   */
  function issueAttack(hover: HoverInfo): boolean {
    const unit = selectedUnit();
    if (!unit) return false;

    const { state } = getGame();
    const { col, row } = hover.tile;
    if (!attackTargetAt(state, col, row, localPlayerId)) return false;
    if (!isCombatant(unitDef(unit.type))) return false;

    if (!canOrder()) {
      reject(`You have ended turn ${state.turn}`);
      onUpdate(unit, hover);
      return true;
    }

    const view = previewCombat(state, unit.id, { col, row });
    if (!view.ok) {
      reject(view.error);
      onUpdate(unit, hover);
      return true;
    }

    // Captured before the dispatch: afterwards the dead are gone and the
    // "before" hit points they were at have stopped existing.
    const before = unitSnapshot();
    const cityBefore = cityAt(state, col, row);
    const cityHpBefore = cityBefore?.hp ?? 0;
    const attackerFrom = { col: unit.col, row: unit.row };
    const wonBefore = state.winnerId;

    renderer.skipAnimations();
    const command: Command = {
      type: 'attack',
      playerId: localPlayerId,
      unitId: unit.id,
      target: { col, row },
    };
    const result = commit(command);
    if (!result.ok) {
      reject(result.error);
      onUpdate(unit, hover);
      return true;
    }

    setMoveMode(false);
    // The one blow this seat ordered, so the first (and only) combat on the
    // result is this one — `applyAttack` reports exactly one.
    reportCombat(
      view,
      result.combats?.[0]?.plundered ?? null,
      before,
      cityHpBefore,
      attackerFrom,
      { col, row },
    );
    // A melee winner that advanced may have stormed a camp or ridden into a
    // ruin. Said after the blow, because that is the order it happened in. The
    // cell is the unit's own — `unit` is a live reference, so it is already
    // standing on whatever it took.
    reportArrivals(result, { col: unit.col, row: unit.row });

    if (getGame().state.winnerId !== null && wonBefore === null) {
      onVictory?.(getGame().state.winnerId!);
    }

    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), hover);
    return true;
  }

  /**
   * Says what the blow did: the notice line, the floating numbers, and a topple
   * for anybody who did not survive it.
   *
   * Damage is read off the board as a difference, so a number shown here is a
   * number the state actually moved. A unit that is missing from the state
   * afterwards lost *all* of its remaining hit points, which is both the honest
   * figure and the one a player expects to see over a dying piece.
   */
  function reportCombat(
    view: CombatPreview & { ok: true },
    /**
     * What the blow plundered, off the reducer's own report — the attacker's
     * half of `reportRaids`' `combat.plundered`. `null` for every blow that was
     * not a raid on a laden caravan, which is almost all of them.
     */
    plundered: TraderPlunder | null,
    before: Map<number, FallenUnit & { hp: number }>,
    cityHpBefore: number,
    attackerFrom: CellRef,
    target: CellRef,
  ): void {
    const { state } = getGame();
    const events: DamageEvent[] = [];

    /**
     * How much a unit lost, and where to say so — its tile now if it survived
     * (a melee winner may have advanced), or the tile it fell on if it did not.
     */
    const lost = (id: number | null): { amount: number; at: CellRef } | null => {
      if (id === null) return null;
      const was = before.get(id);
      if (!was) return null;
      const now = unitById(state, id);
      const amount = now ? was.hp - now.hp : was.hp;
      if (amount <= 0) return null;
      return { amount, at: now ? { col: now.col, row: now.row } : { col: was.col, row: was.row } };
    };

    const dealt = view.defenderCityId !== null
      ? { amount: cityHpBefore - (cityById(state, view.defenderCityId)?.hp ?? 0), at: target }
      : lost(view.defenderUnitId);
    if (dealt && dealt.amount > 0) {
      events.push({ ...dealt.at, amount: dealt.amount, kind: 'dealt' });
    }
    // Counter-damage is announced where the attacker *stood when it was struck*,
    // not where it ended up: a unit that killed its defender and advanced would
    // otherwise carry the number it took onto the tile it just captured.
    const taken = lost(view.attackerId);
    if (taken) {
      events.push({
        col: attackerFrom.col,
        row: attackerFrom.row,
        amount: taken.amount,
        kind: 'taken',
      });
    }
    if (events.length > 0) onDamage?.(events);

    // Anybody who was on the board before the blow and is not on it now fell.
    for (const [id, was] of before) {
      if (unitById(state, id)) continue;
      renderer.animateDeath?.(was);
    }

    reportCombatNotice(view, dealt?.amount ?? 0, taken?.amount ?? 0, plundered);
  }

  /** "Warrior attacks Archer: 34 − 12", in the reducer's own vocabulary. */
  function reportCombatNotice(
    view: CombatPreview & { ok: true },
    dealt: number,
    taken: number,
    plundered: TraderPlunder | null,
  ): void {
    const { state } = getGame();
    // Plunder before capture, because the two look alike and are not: a laden
    // caravan is **destroyed** and its cargo carried to the nearest town, where
    // a civilian merely changes hands. Both are one-sided — no roll, no
    // counter — which is why neither prints a damage trade.
    //
    // The figures **are** carried now (`CommandResult.combats[].plundered`), so
    // the line says what the raid was worth. It is the one number on this notice
    // that is *reported* rather than measured across the dispatch, and it has to
    // be: the gold is banked and the grain is in a basket somewhere else on the
    // map by the time this runs, so measuring it would mean re-deriving
    // `nearestOwnedCity` at the surface. The figures come through
    // `plunderSpoils`, the one composer both plunder sentences use.
    if (view.plundersUnit) {
      const spoils = plundered === null ? '' : `: ${plunderSpoils(plundered)}`;
      announce(`${view.attackerName} plunders ${view.defenderName}${spoils}`);
      return;
    }
    if (view.capturesUnit) {
      announce(`${view.attackerName} captures ${view.defenderName}`);
      return;
    }
    const verb = view.kind === 'ranged' ? 'shoots' : 'attacks';
    const trade = taken > 0 ? `${dealt} − ${taken}` : `${dealt}`;
    const city =
      view.defenderCityId === null ? undefined : cityById(state, view.defenderCityId);
    const tail =
      city && city.ownerId === localPlayerId ? ` · ${cityDisplayName(state, city)} taken!` : '';
    announce(`${view.attackerName} ${verb} ${view.defenderName}: ${trade}${tail}`);
  }

  // --- fortifying ----------------------------------------------------------

  /**
   * Why the selected unit cannot dig in. The seat's questions here, the unit's
   * delegated to `fortifyError` — the same split as `foundCityBlocker`, and the
   * same guarantee: this button is enabled by the rule the reducer applies.
   */
  function fortifyBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    return fortifyError(unit);
  }

  function fortify(): void {
    const unit = selectedUnit();
    if (!unit || fortifyBlocker() !== null) return;

    const command: Command = { type: 'fortify', playerId: localPlayerId, unitId: unit.id };
    const result = commit(command);
    if (!result.ok) {
      reject(result.error);
      return;
    }
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- sleeping ------------------------------------------------------------

  /**
   * Why the selected unit cannot be told to sleep. `fortifyBlocker` line for
   * line, delegating to `sleepError` — the same split, and the same guarantee
   * that a live button is a command the reducer takes.
   */
  function sleepBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    return sleepError(unit);
  }

  /**
   * Puts the selected civilian to sleep, and lets go of it.
   *
   * The selection is dropped afterwards, which is the one place this differs
   * from `fortify` and it is the whole point of the verb: sleeping says "stop
   * showing me this piece", and a sheet that stayed open on it would be the
   * interface still showing it. What follows is Skip Turn's own advance — hop to
   * the next piece actually waiting, or leave the player alone.
   */
  function sleepUnit(): void {
    const unit = selectedUnit();
    if (!unit || sleepBlocker() !== null) return;

    const command: Command = { type: 'sleepUnit', playerId: localPlayerId, unitId: unit.id };
    const result = commit(command);
    if (!result.ok) {
      reject(result.error);
      return;
    }
    renderer.invalidate();
    // The same advance Skip Turn makes, for the same reason and out of the same
    // two lines: hop to the next piece actually waiting, and with nothing else
    // waiting simply let go. See `skipUnit`.
    const next = endTurnBlocker();
    if (next?.kind === 'idleUnit') focusBlocker(next);
    else clearSelection();
  }

  // --- skipping --------------------------------------------------------------

  /**
   * Why the selected unit cannot be waved off for the turn, or `null` when it
   * can — the same three-valued shape as `foundCityBlocker`.
   *
   * Deliberately **not** `fortifyError`'s twin: skip is not a sim order at all
   * (see `skipUnit`), so there is no reducer sentence to delegate to and this
   * function is the only place either answer is decided. A unit with nothing
   * left to spend has nothing to wave off — it was never going to block End
   * Turn — and a unit already skipped is offered the same refusal so the
   * button reads as spent rather than as broken.
   */
  function skipBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    if (skippedUnitIds.has(unit.id)) return 'Already waiting this turn';
    if (unit.movesLeft <= 0) return 'This unit has nothing left to spend this turn';
    return null;
  }

  /** Whether the selected unit is one this seat has already waved off. */
  function isUnitSkipped(): boolean {
    const unit = selectedUnit();
    return unit !== null && skippedUnitIds.has(unit.id);
  }

  /**
   * Marks the selected unit skipped for this turn only, and moves on.
   *
   * "This turn only" is enforced by where the set is cleared (`endTurn`,
   * `setLocalPlayer`), not by anything here — this function only ever adds.
   * The unit keeps every point of movement it had; the only thing that
   * changes is whether `firstBlocker` is still willing to call it idle.
   *
   * The advance afterwards is deliberately the narrow half of `endTurn`'s own
   * post-resolution courtesy: jump to the next idle unit and put it in hand,
   * exactly as a resolved turn hands the camera to the first piece still
   * awaiting one, but never open a city screen or the tech tree the way
   * pressing End Turn itself is allowed to — a player skipping down a column
   * of units did not ask for either of those. With nothing else idle, drop
   * the selection, which is the same "clicking away" every other verb here
   * ends on.
   */
  function skipUnit(): void {
    const unit = selectedUnit();
    if (!unit || skipBlocker() !== null) return;
    skippedUnitIds.add(unit.id);
    const next = endTurnBlocker();
    if (next?.kind === 'idleUnit') focusBlocker(next);
    else clearSelection();
  }

  // --- improvements --------------------------------------------------------

  /**
   * Every improvement this hex could take, whether or not the player has
   * researched it yet. See `GameControls.improvementOptions` for the two
   * refusals and why they are shown differently.
   *
   * The list is filtered by `improvementError` — the reducer's own gate — so a
   * row that appears *pressable* is a command that will be accepted, and the
   * delta beside it comes from the same evaluator the yields are banked with.
   * Walked in `IMPROVEMENT_IDS` order, which is the table's order, so the
   * buttons do not reshuffle themselves between renders.
   *
   * The one refusal that greys instead of hiding is the technology, and the
   * comparison is what keeps that honest: `improvementErrorAt` asks the tree
   * *last* (see its docblock), so an error equal to `improvementTechError`'s
   * sentence means every question about the ground already said yes. A mine on
   * grassland is still absent; a mine on a hill this empire has not learnt to
   * dig is present, greyed, and says which technology would open it — the same
   * bargain the city panel's build rows keep.
   */
  function improvementOptions(): ImprovementOption[] {
    const unit = selectedUnit();
    if (!unit || !canOrder()) return [];
    const { state } = getGame();
    if (!isBuilder(unit)) return [];
    const tile = getTileAt(state.map, unit.col, unit.row);
    if (!tile) return [];
    const ctx = yieldContextFor(state, unit.ownerId);
    const options: ImprovementOption[] = [];
    for (const id of IMPROVEMENT_IDS) {
      const blocked = improvementTechError(state, unit.ownerId, id);
      const problem = improvementError(state, unit.id, id);
      if (problem !== null && problem !== blocked) continue;
      const gate = improvementDef(id).requiresTech;
      options.push({
        id,
        name: improvementDef(id).name,
        delta: improvementYieldDelta(tile, id, ctx),
        blocked,
        requiredTechName: blocked !== null && gate !== undefined ? techDef(gate).name : null,
      });
    }
    return options;
  }

  /**
   * Spends a charge on an improvement, and lets go of the worker if that was its
   * last one.
   *
   * The selection has to be dropped by hand here, unlike a fortify: a worker
   * that spends its third charge is *removed from the board* (see
   * `buildImprovementAt`), so holding its id would leave the sheet describing a
   * piece that no longer exists. Asked of the state after the dispatch rather
   * than predicted before it, so the interface believes the simulation.
   */
  function buildImprovement(id: ImprovementId): void {
    const unit = selectedUnit();
    if (!unit) return;

    const command: Command = {
      type: 'buildImprovement',
      playerId: localPlayerId,
      unitId: unit.id,
      improvement: id,
    };
    const result = commit(command);
    if (!result.ok) {
      reject(result.error);
      return;
    }

    if (!unitById(getGame().state, unit.id)) {
      selectedId = null;
      setMoveMode(false);
    }
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /**
   * Why the selected augur cannot consecrate. The seat's question here, the
   * act's delegated whole to `consecrateError` — `chopBlocker`'s split.
   */
  function consecrateBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    return consecrateError(getGame().state, localPlayerId, unit.id);
  }

  /**
   * Spends the augur on a god, and lets go of the piece.
   *
   * The selection is dropped by hand for `buildImprovement`'s reason exactly and
   * one grade harder: Consecrate always consumes the unit, so holding its id
   * would leave the sheet describing a piece that is gone. Asked of the state
   * after the dispatch rather than predicted before it.
   */
  function consecrate(): void {
    const unit = selectedUnit();
    if (!unit) return;
    const result = commit({ type: 'consecrate', playerId: localPlayerId, unitId: unit.id });
    if (!result.ok) {
      reject(result.error);
      return;
    }
    if (!unitById(getGame().state, unit.id)) {
      selectedId = null;
      setMoveMode(false);
    }
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
    // The offer was dealt by the command; the card is the answer to it.
    onOfferReligion?.();
  }

  /** Every rite, with its blocker and its payoff. See `RiteOption`. */
  function riteOptions(): RiteOption[] {
    const unit = selectedUnit();
    if (!unit || !isAugur(unit)) return [];
    const { state } = getGame();
    const ended = !canOrder();
    return RITE_IDS.map((id) => {
      const blocked = ended
        ? `You have ended turn ${state.turn}`
        : riteError(state, localPlayerId, unit.id, id);
      return {
        id,
        name: riteDef(id).name,
        preview: ritePreview(state, unit.id, id),
        blocked,
        // Named off the row's own `tech` field rather than parsed back out of
        // the sentence, exactly as a greyed improvement's is.
        requiredTechName: hasAbility(state, localPlayerId, riteAbility(id))
          ? null
          : techDef(riteDef(id).tech).name,
      };
    });
  }

  /**
   * Spends one charge on a rite, and lets go of the augur if that was its last.
   *
   * `buildImprovement` line for line — the same reason the selection is dropped
   * by hand, and the same "believe the simulation" rule about how it is asked.
   *
   * The one thing it does that `buildImprovement` does not is *say what
   * happened* (user, 2026-08-27: "there should be some indication after
   * performing a rite"). A rite is the quietest expensive thing in the game —
   * one of three charges on a unit bought out of the faith bank — and until this
   * line the only sign it had worked was a number changing somewhere else on the
   * screen. Composed before the dispatch (see `riteSentence`), announced after,
   * and panned to the hex the augur stood on so the chronicle line leads back to
   * the town that received it.
   */
  function performRite(id: RiteId): void {
    const unit = selectedUnit();
    if (!unit) return;
    const sentence = riteSentence(getGame().state, unit, id);
    const cell = { col: unit.col, row: unit.row };
    const result = commit({
      type: 'performRite',
      playerId: localPlayerId,
      unitId: unit.id,
      rite: id,
    });
    if (!result.ok) {
      reject(result.error);
      return;
    }
    announce(sentence, { cell });
    if (!unitById(getGame().state, unit.id)) {
      selectedId = null;
      setMoveMode(false);
    }
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- the great person ----------------------------------------------------

  /**
   * What the selected great person's **act** would do, in one line.
   *
   * Every figure is `RULES.greatPeople`'s and every destination is the
   * simulation's own — `actCityFor` for the town, `player.researching` for the
   * study — because this is the sentence a player decides on and
   * `greatPersonActAt` is what will happen. Two implementations of "which city
   * gets this" is exactly how a preview starts lying (`chopCity`'s argument, one
   * agent over), so there is only the one.
   *
   * Two of the five are quoted **in the money of the era** (`highestAge`),
   * because the rules multiply them by it — a hurry worth a granary in Æra I
   * should still be worth something in Æra III, and a preview that printed the
   * base would be short by a factor of three.
   */
  function greatPersonActPreview(unit: Unit): string {
    const { state } = getGame();
    const people = RULES.greatPeople;
    const player = playerById(state, unit.ownerId);
    const era = player ? highestAge(player.techsResearched) : 1;
    const city = actCityFor(state, unit);
    const where = city ? cityDisplayName(state, city) : 'your nearest city';
    switch (familyOf(unit)) {
      case 'scholar': {
        const aim = player?.researching ?? null;
        const beakers = aim === null ? 0 : Math.floor(techDef(aim).cost * people.scholarShare);
        const toward = aim === null ? 'your current study' : techDef(aim).name;
        return `+${beakers}${YIELD_GLYPH.science} toward ${toward}`;
      }
      case 'engineer':
        return `+${people.engineerHammers * era}${HAMMER} to ${where}`;
      case 'merchant':
        return `+${people.merchantGold * era}${YIELD_GLYPH.gold} to the treasury`;
      case 'artist':
        return (
          `+${people.artistCulture}${YIELD_GLYPH.culture} toward the next draft · ` +
          `+${people.artistHappiness} happiness in ${where} for ${people.artistTurns} turns`
        );
      case 'general':
        return (
          `Every unit within ${people.generalRadius} hexes healed, ` +
          `and +${people.generalCombat} combat strength for ${people.generalTurns} turns`
        );
      default:
        return 'Nothing — this piece serves no family';
    }
  }

  /**
   * What the selected great person's **work** would leave on this hex.
   *
   * The improvement's own name and the delta from `improvementYieldDelta` — the
   * *same* evaluator a worker's farm row quotes, asked with the owner's context
   * — so an academy's `+3🔬` on the sheet is the number the tile will pay.
   */
  function greatPersonWorkPreview(unit: Unit): string {
    const { state } = getGame();
    const work = workOf(unit);
    if (work === null) return 'Nothing — this piece leaves no work';
    const name = improvementDef(work).name;
    const tile = getTileAt(state.map, unit.col, unit.row);
    if (!tile) return name;
    const delta = improvementYieldDelta(tile, work, yieldContextFor(state, unit.ownerId));
    const figures = (['food', 'production', 'gold'] as const)
      .filter((key) => delta[key] !== 0)
      .map((key) => `${signedFigure(delta[key])}${YIELD_GLYPH[key]}`)
      .join(' ');
    return figures ? `${name} here · ${figures}` : `${name} here`;
  }

  /**
   * Who the selected piece is, and what it may do — or `null` for every piece
   * that is not a great person.
   *
   * The two blockers are the reducer's own (`greatPersonActError`,
   * `greatPersonWorkError`), with the seat's question in front of them exactly
   * as `chopBlocker` puts it in front of `chopError`: an offered button is a
   * command this client's `commit` will have taken.
   */
  function greatPersonView(): GreatPersonView | null {
    const unit = selectedUnit();
    if (!unit || !isGreatPerson(unit)) return null;
    const id = personOf(unit);
    if (id === null) return null;
    const { state } = getGame();
    const def = greatPersonDef(id);
    const ended = !canOrder() ? `You have ended turn ${state.turn}` : null;
    return {
      name: def.name,
      family: def.family,
      epigram: def.epigram,
      kernel: def.kernel,
      act: {
        blocked: ended ?? greatPersonActError(state, localPlayerId, unit.id),
        preview: greatPersonActPreview(unit),
      },
      work: {
        blocked: ended ?? greatPersonWorkError(state, localPlayerId, unit.id),
        preview: greatPersonWorkPreview(unit),
      },
      legacy: describeCard(id),
    };
  }

  /**
   * Spends the great person, one verb or the other, and lets go of the piece.
   *
   * `consecrate`'s shape and for its reason one grade harder: **either** verb
   * consumes the whole person, so holding its id would leave the sheet
   * describing somebody who is no longer on the board. Asked of the state after
   * the dispatch rather than predicted before it.
   *
   * The announcement is composed from the preview taken *before* the command,
   * because by the time this returns the piece is gone and the board cannot be
   * asked what it was going to do — the same argument `CommandResult.arrivals`
   * makes one layer lower. The Triumphs the act may have earned along the way
   * (a technology that opened an era, a hurry that finished a wonder) come back
   * on the result and are announced by `reportTriumphs` in `commit`.
   */
  function spendGreatPerson(verb: 'act' | 'work'): void {
    const unit = selectedUnit();
    if (!unit) return;
    const view = greatPersonView();
    if (!view) return;
    const said = verb === 'act' ? view.act.preview : view.work.preview;
    const result = commit(
      verb === 'act'
        ? { type: 'greatPersonAct', playerId: localPlayerId, unitId: unit.id }
        : { type: 'greatPersonWork', playerId: localPlayerId, unitId: unit.id },
    );
    if (!result.ok) {
      reject(result.error);
      return;
    }
    announce(`✦ ${view.name} — ${said}`, { cell: { col: unit.col, row: unit.row } });
    // The legacy is the half that survives the choice, and it is worth its own
    // line: the board decision was burst or ground, and the card is yours
    // whichever was taken (`docs/great-people.md`).
    announce(`✦ ${view.name}'s legacy stands with your government`);
    if (!unitById(getGame().state, unit.id)) {
      selectedId = null;
      setMoveMode(false);
    }
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /**
   * Why the selected worker cannot clear where it stands. The seat's question
   * here, the work's delegated to `chopError` — the same split as
   * `foundCityBlocker`, and the same guarantee: an enabled button is an accepted
   * command, and a greyed one wears the reducer's own sentence.
   */
  function chopBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    return chopError(getGame().state, unit.id);
  }

  /**
   * "+20⚙ → Uruk", and — when the timber would finish what the city is building
   * — the name of the thing it would finish.
   *
   * Every part comes from the simulation's own tables and evaluators —
   * `chopYield` for the payout, `chopCity` for the city the hammers land in,
   * `productionSettledBy` for the completion — so the preview cannot promise a
   * number, a destination or a granary the reducer will disagree with.
   * `productionSettledBy` is the settlement check itself asked of the basket the
   * chop *would* leave (Entry XVIII), never a comparison done here: a second
   * arithmetic would be the first thing to forget that a settler has a minimum
   * population or that a boxed-in city cannot spawn.
   *
   * Offered whenever the *ground* holds a chop and somebody owns it; every other
   * refusal (the tech, a protected resource, a spent worker) still shows the
   * number, because that is the number being argued about.
   */
  function chopPreview(): {
    production: number;
    cityName: string;
    completes: string | null;
  } | null {
    const unit = selectedUnit();
    if (!unit || !isBuilder(unit)) return null;
    const { state } = getGame();
    const tile = getTileAt(state.map, unit.col, unit.row);
    if (!tile || chopDef(tile.feature) === null) return null;
    const city = chopCity(state, tile);
    if (!city || city.ownerId !== unit.ownerId) return null;
    const production = chopYield(tile.feature).production;
    return {
      production,
      cityName: city.name,
      completes: productionSettledBy(state, city, production),
    };
  }

  /**
   * See `GameControls.chopTechName`.
   *
   * `chopBlocker` is asked rather than `chopError` a second time, so this
   * agrees with whatever the panel is actually showing (`canOrder`'s seat
   * question included) rather than re-deriving a slightly different answer.
   */
  function chopTechName(): string | null {
    const unit = selectedUnit();
    if (!unit) return null;
    const blocked = chopBlocker();
    if (!blocked) return null;
    const { state } = getGame();
    const tile = getTileAt(state.map, unit.col, unit.row);
    if (!tile) return null;
    // Equal to `blocked` iff the technology is the *only* thing refusing this
    // hex — `chopErrorAt`'s own reading of the comparison.
    if (chopTechError(state, unit.ownerId, tile.feature) !== blocked) return null;
    const gate = chopDef(tile.feature)?.tech;
    return gate ? techDef(gate).name : null;
  }

  /**
   * A city's queue as the announcement needs to read it: how long it is, and
   * what stands at the front.
   *
   * Taken before a windfall and again after it, because a completion is only
   * visible as a *difference* — the same reading `reportCombat` takes of a
   * unit's hit points rather than predicting the blow. Predicting it here would
   * mean a second settlement check in the interface, and a chop that freed the
   * last stacking slot by consuming its own worker would make the prediction and
   * the reducer disagree.
   */
  function queueReading(city: City | null): { queued: number; front: string | null } | null {
    if (!city) return null;
    const front = city.queue[0];
    return { queued: city.queue.length, front: front ? queueItemName(front) : null };
  }

  /**
   * "⚒ Granary completed in Uruk — choose the next work.", when the timber just
   * finished what the city was building (design ledger, Entry XVIII).
   *
   * The prompt is a *line*, never a screen: a windfall completion re-aims the
   * player without grabbing the wheel, and a city left with nothing queued is
   * the End Turn blocker's business exactly as a newly founded one is (Entry
   * XVIII.4). Which is also why the tail changes: "choose the next work" is the
   * honest ask only when there is no next work, and a queue that still has a
   * warrior in it says so instead.
   */
  function announceSettlement(
    cityId: number,
    before: { queued: number; front: string | null },
  ): void {
    const { state } = getGame();
    const city = cityById(state, cityId);
    if (!city || city.queue.length >= before.queued || before.front === null) return;
    const next = city.queue[0];
    const tail = next ? `${queueItemName(next)} is next.` : 'choose the next work.';
    announce(`⚒ ${before.front} completed in ${cityDisplayName(state, city)} — ${tail}`, {
      cell: { col: city.col, row: city.row },
    });
  }

  /**
   * Fells the wood, and lets go of the worker if that was its last charge.
   *
   * `buildImprovement`'s twin down to the selection handling, and for the same
   * reason: a worker that spends its third charge is removed from the board, so
   * holding its id would leave the sheet describing a piece that is not there.
   * Asked of the state after the dispatch rather than predicted before it.
   *
   * Two lines can come of one chop, and the settlement wins the slot: "cleared"
   * is what the player just did, and a granary finishing is what it *bought*.
   */
  function chop(): void {
    const unit = selectedUnit();
    if (!unit || chopBlocker() !== null) return;
    // Read before the dispatch: the command is about to take the feature off the
    // tile, and the announcement is about the wood that *was* there.
    const preview = chopPreview();
    const chopped = getTileAt(getGame().state.map, unit.col, unit.row);
    const paid = chopped ? chopCity(getGame().state, chopped) : null;
    const queueBefore = queueReading(paid);

    const command: Command = { type: 'chopFeature', playerId: localPlayerId, unitId: unit.id };
    const result = commit(command);
    if (!result.ok) {
      reject(result.error);
      return;
    }

    if (preview) {
      announce(`Cleared: +${preview.production}${HAMMER} → ${preview.cityName}`, {
        cell: { col: unit.col, row: unit.row },
      });
    }
    if (paid && queueBefore) announceSettlement(paid.id, queueBefore);
    if (!unitById(getGame().state, unit.id)) {
      selectedId = null;
      setMoveMode(false);
    }
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /**
   * Why the selected unit cannot pillage. The seat's questions here, the raid's
   * delegated to `pillageError` — the same split as `foundCityBlocker`.
   */
  function pillageBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    return pillageError(getGame().state, unit.id);
  }

  function pillage(): void {
    const unit = selectedUnit();
    if (!unit || pillageBlocker() !== null) return;

    const command: Command = { type: 'pillage', playerId: localPlayerId, unitId: unit.id };
    const result = commit(command);
    if (!result.ok) {
      reject(result.error);
      return;
    }
    announce(`${unitDef(unit.type).name} pillaged (+${RULES.improvements.pillageGold} gold)`, {
      cell: { col: unit.col, row: unit.row },
    });
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- citizens ------------------------------------------------------------

  /**
   * Pins or unpins the clicked tile for the open city, and reports whether it
   * took the click.
   *
   * It only ever takes one while a city panel is open *and* the tile is one that
   * city could actually work — that is the whole of the gesture, and it is why a
   * click on ocean, on another city's ground, or with no panel open still means
   * what it has always meant. The city tile itself is not assignable either, so
   * clicking the town under an open panel does not pin anything.
   *
   * Its caller asks it only inside the open city's radius, and only after the
   * badge test (see `handleLeftClick`), so a click well away from the city
   * closes the panel rather than being swallowed here. What it deliberately does
   * *not* ask is whether anybody is standing on the tile: a garrison used to
   * take this click, which left a worked tile under a unit with no way to pin it
   * at all. The badge over that unit is how it is selected instead.
   *
   * Three cases, and they are one rule: the pin list is toggled and sent whole.
   * Unpinning does not stop a tile being worked — the assignment may well pick
   * it again on merit, which is the honest answer to "unpin" rather than a
   * second, invisible kind of "never work this".
   */
  function toggleCitizen(hover: HoverInfo): boolean {
    const city = openCity();
    if (!city) return false;

    const { state } = getGame();
    const target = assignableTiles(state, city).find(
      (tile: Tile) => tile.col === hover.tile.col && tile.row === hover.tile.row,
    );
    if (!target) return false;

    if (!canOrder()) {
      reject(`You have ended turn ${state.turn}`);
      return true;
    }

    const cells = city.lockedTiles.map((cell) => ({ col: cell.col, row: cell.row }));
    const at = cells.findIndex(
      (cell) => cell.col === target.col && cell.row === target.row,
    );
    if (at >= 0) cells.splice(at, 1);
    else cells.push({ col: target.col, row: target.row });

    const command: Command = {
      type: 'setLockedTiles',
      playerId: localPlayerId,
      cityId: city.id,
      cells,
    };
    const result = commit(command);
    if (!result.ok) {
      // The reducer's own words — "this city has 3 citizens and cannot pin 4"
      // is exactly what the player needs to hear.
      reject(result.error);
      return true;
    }

    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), hover);
    return true;
  }

  // --- clicks --------------------------------------------------------------

  /**
   * The local player's units on a tile, in `state.units` order. Order is part of
   * the state, so click-cycling visits them in the same sequence every time.
   * Other players' pieces are never returned — they are information, not
   * something this client may command.
   */
  function ownUnitsAt(col: number, row: number): Unit[] {
    const { state } = getGame();
    return unitsOnTile(state, col, row).filter((unit) => unit.ownerId === localPlayerId);
  }

  /**
   * Selects on a tile the way a click on it always has: your topmost unit
   * there, or the next one along if it is already selected.
   *
   * One function because there are two ways to aim at a unit — its ground and
   * its badge — and they must not drift apart. A badge hit deliberately does
   * *not* select the unit whose tag was struck: a stack fans its badges out
   * around one tile centre, and "the badge I hit" would make a stack cycle in an
   * order that depends on where the pointer landed rather than on the click
   * before it. Cycling belongs to the tile.
   */
  function selectOnTile(col: number, row: number): boolean {
    const mine = ownUnitsAt(col, row);
    if (mine.length === 0) return false;
    const at = mine.findIndex((unit) => unit.id === selectedId);
    select(mine[(at + 1) % mine.length]!.id);
    return true;
  }

  /**
   * The unit whose badge the pointer is on, or `null`.
   *
   * Ownership is the renderer's filter (see `MapView.pickUnitBadge`), and it is
   * re-checked here because the answer crosses a module boundary and this module
   * is the one that owns the rule that only the local seat may be commanded.
   */
  function badgeUnitAt(screen: { x: number; y: number }): Unit | null {
    const id = renderer.pickUnitBadge?.(screen.x, screen.y, localPlayerId) ?? null;
    if (id === null) return null;
    const unit = unitById(getGame().state, id);
    if (!unit || unit.ownerId !== localPlayerId) return null;
    return unit;
  }

  /**
   * The left button: pick things up and put them down.
   *
   * The authoritative order. Everything above a row wins over everything below
   * it, and the first row that takes the click ends the gesture:
   *
   *   1. move mode armed      move, or attack if something hostile is there.
   *                           The left button is standing in for the right one
   *                           and does nothing else — including when the click
   *                           lands on a badge.
   *   2. one of your badges   selects on that badge's tile (`selectOnTile`:
   *                           topmost, cycling on repeat). Global, and ahead of
   *                           the citizen board: the tag over a piece is the one
   *                           gesture that always means "that unit", and it is
   *                           how a garrison is reached while the ground it
   *                           stands on has become a pin target. Selecting
   *                           closes an open city panel, because the two share
   *                           one slot. An *enemy* badge is not a target and
   *                           falls through to the rows below.
   *  3a. city panel open,     buys the hex, or says why it cannot be bought.
   *      buy mode armed,      Above the citizen board because an armed mode is
   *      click in the ring    what the ring *means* while it is up, and the tag
   *                           on the hex has already quoted the price.
   *   3. city panel open,     pins or unpins a citizen, whatever is standing on
   *      click in its work    the tile. Tile management is what a city screen is
   *      radius               for, and it must work on every hex of the ring or
   *                           a garrisoned tile becomes unmanageable. A tile in
   *                           the ring that this city cannot work — its own
   *                           centre, a rival's ground — takes nothing and falls
   *                           through with the panel still open.
   *   4. city panel open,     closes the panel and falls through, so this same
   *      click outside it     click still means whatever it would have meant
   *                           with no panel open. Clicking away from a city is
   *                           how you leave it, exactly as clicking away from a
   *                           unit is how you put it down.
   *   5. your own unit(s)     selects, cycling on repeat — the same call row 2
   *      on the tile          makes. This is the path for a click on the ground
   *                           under a piece rather than on its tag.
   *   6. your own city        opens its panel. Below the units, because a
   *      on the tile          garrison is what you click a city tile to select
   *                           and the banner is a click away when a piece is in
   *                           the way.
   *   7. anything else        deselects: empty ground, an enemy, a mountain.
   *                           Clicking away is how you put a unit down.
   *
   * Rows 2 and 3 are the pair that has been argued twice, and this is the settled
   * form. The previous pass let the ground under a unit select it, which made a
   * worked tile with a garrison standing on it impossible to pin at all; the
   * answer here is that inside an open city's ring the *ground* always pins and
   * the *badge* always selects, so both jobs have a gesture of their own and
   * neither has to be guessed from what happens to be standing where.
   */
  function handleLeftClick(hover: HoverInfo | null, screen: { x: number; y: number }): void {
    if (moveMode) {
      // Move mode stands in for the right button, so it stands in for the whole
      // of it: aiming the armed click at an enemy attacks, exactly as a right
      // click would. The trackpad path must not be a lesser one.
      if (!hover) return;
      if (!issueAttack(hover)) issueMove(hover);
      return;
    }

    // Row 2. The badge's own tile, not the hovered one: a tag floats above the
    // piece and the ground behind it is often the tile to the north — which is
    // also why this is asked before the board is: a badge belonging to a unit on
    // the top row can float clean off the map, where there is no tile at all.
    const badged = badgeUnitAt(screen);
    if (badged && selectOnTile(badged.col, badged.row)) return;

    // Past the poles, on no badge: there is nothing here to mean anything.
    if (!hover) return;
    const { col, row } = hover.tile;

    // Rows 3 and 4. While a city screen is open its work radius is a citizen
    // board, and now an unconditional one: the badges above are what keep a
    // garrison selectable, so the pin no longer has to step around units.
    const open = openCity();
    if (open) {
      // The *radius*, not the assignable list: the city's own tile and any
      // ground a rival owns inside the ring are still this panel's subject, so
      // clicking them must not be read as walking away from it.
      if (withinWorkRadius(getGame().state, open, col, row)) {
        // Row 3a. Buy mode outranks the citizen board for the same reason move
        // mode outranks everything: while it is armed it is what the ring
        // *means*, and a click that pinned a citizen instead of spending the
        // gold the tag just quoted would be the mode lying about itself.
        if (buyMode && purchaseTile(col, row)) return;
        if (toggleCitizen(hover)) return;
        // Inside the radius but not a tile this city may work — its own centre,
        // or ground another city owns. The panel stays open and the click falls
        // through to the ordinary contract, which on the city tile itself means
        // re-opening the panel that is already open: a no-op, and the right one.
      } else {
        // Outside the radius: the player has looked away. Close the screen and
        // let this same click mean what it always means, so leaving a city and
        // selecting the unit you left it for is one gesture.
        setOpenCity(null);
      }
    }

    // Row 5. Reached when no open panel claimed the click — there was none, it
    // was closed by the row above, or the tile is one this city cannot work — so
    // the ordinary board still selects by clicking the ground a piece stands on.
    if (selectOnTile(col, row)) return;

    // Row 6. An empty tile of your own with a city on it opens that city.
    const city = cityAt(getGame().state, col, row);
    if (city && city.ownerId === localPlayerId) {
      selectedId = null;
      setOpenCity(city.id);
      return;
    }

    // Row 7. Clicking away. With nothing selected this still costs a repaint of
    // the hover readout, which is what the player is looking at when they click
    // an enemy or a stretch of ocean.
    if (selectedId !== null) select(null);
    else onUpdate(selectedUnit(), hover);
  }

  /**
   * The right button: order the selected unit to the clicked tile.
   *
   * With nothing selected it is not an input at all — deliberately, so that a
   * stray two-finger tap on a trackpad cannot do anything. It is also the exit
   * from move mode, because a player who reached for the right button has
   * already said which gesture they meant.
   */
  function handleRightClick(hover: HoverInfo): void {
    if (!selectedUnit()) return;
    // "Act on this target" already covers both verbs: a tile with somebody
    // else's piece or town on it is a fight, and everything else is a march.
    // The player aims at a thing, not at a mode.
    if (issueAttack(hover)) return;
    issueMove(hover);
  }

  /**
   * Sends the selected unit to the hovered tile, whichever gesture asked for it.
   *
   * Every refusal is spoken (see the module docblock) and none of them cost the
   * selection: a player who clicked a mountain wants to aim again, not to start
   * over. Success disarms move mode — one arming, one order.
   */
  function issueMove(hover: HoverInfo): void {
    const unit = selectedUnit();
    if (!unit) return;

    const { col, row } = hover.tile;
    if (!canOrder()) {
      // This seat is done for the turn. Keep the selection so the card still
      // describes the unit, but do not send an order the reducer would refuse.
      reject(`You have ended turn ${getGame().state.turn}`);
      onUpdate(unit, hover);
      return;
    }
    if (col === unit.col && row === unit.row) {
      // Ordering a unit onto its own tile is not an error, it is a no-op; say
      // nothing and leave the selection exactly as it was.
      setMoveMode(false);
      onUpdate(unit, hover);
      return;
    }

    // A new order supersedes whatever was still sliding.
    renderer.skipAnimations();
    const from = { col: unit.col, row: unit.row };
    const route = findPath(getGame().state, unit, hover.tile) ?? [];

    const command: Command = {
      type: 'moveUnit',
      playerId: localPlayerId,
      unitId: unit.id,
      target: { col, row },
    };
    const result = commit(command);
    if (!result.ok) {
      // The reducer's own words: it knows why better than this module does.
      reject(result.error);
      onUpdate(unit, hover);
      return;
    }

    setMoveMode(false);

    // `unit` is a live reference into the state, so it is already at its
    // destination here; the walked prefix is the route up to that tile.
    const walked = walkedPrefix(route, { col: unit.col, row: unit.row });
    if (walked.length > 0) renderer.animateMove(unit.id, from, walked);

    reportArrivals(result, { col: unit.col, row: unit.row });
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), hover);
  }

  /**
   * Says what a march or a charge turned up, and puts a claimed offer on screen.
   *
   * Reads the reducer's own report (`CommandResult.arrivals`) rather than
   * re-deriving anything from the board: the camp is gone by the time this runs
   * and its bounty is already banked, so "which town received the provisions" is
   * a question only the command that paid them can answer. See `arrival.ts`.
   *
   * The bounty gets a notice line and the discovery does not, and that is the
   * split it should be: a camp cleared is *news*, over in a sentence, while an
   * offer is a **decision** and the card is how it announces itself. Saying both
   * would put a line in the bar that the modal on top of it immediately hides.
   *
   * `at` is where the piece that filed these reports came to rest, and it is the
   * caller's because the report itself does not carry a hex — `ArrivalReport` is
   * a list of what was *found*, not a gazetteer, and widening a simulation type
   * to give a toast something to pan to would be the interface reaching into the
   * rules. It is exact for every single-step arrival, which is every advance
   * after a kill and every march that found one thing; a march that burnt out a
   * camp halfway and then claimed a ruin at its destination pans to the
   * destination. That is a courtesy landing a hex or two out, not a wrong claim,
   * and the alternative costs a field on a sim report.
   */
  function reportArrivals(result: CommandResult, at: CellRef): void {
    if (!result.ok || !result.arrivals) return;
    for (const arrival of result.arrivals) {
      const { camp } = arrival;
      /**
       * Who came with the ground (`arrival.ts`). Split by where they came from,
       * because the two readings are different news even though the mechanic is
       * one mechanic: a laborer the wild stole is **freed**, and anybody else's
       * worker is taken. The wild parks its cargo *on* its camp, so the rescue
       * is nearly always the same step that burnt the camp out — hence one line
       * with the bounty rather than a second flash that would replace it.
       */
      const freed = arrival.captured.filter((taken) => taken.fromWild);
      const spoils = [
        ...(freed.length > 0 ? ['Your laborers are freed!'] : []),
        ...arrival.captured
          .filter((taken) => !taken.fromWild)
          .map((taken) => `${unitDef(taken.type).name} captured`),
      ];
      const tail = spoils.length > 0 ? ` · ${spoils.join(', ')}` : '';
      if (camp) {
        const parts = [`+${camp.gold}${YIELD_GLYPH.gold}`];
        if (camp.cityName !== null) {
          const grew = camp.grownTo === null ? '' : ` · grows to ${camp.grownTo}`;
          parts.push(`+${camp.food}${YIELD_GLYPH.food} → ${camp.cityName}${grew}`);
        } else if (camp.warning !== null) {
          // The forfeited half, said out loud. An empire with no towns has
          // nowhere to put provisions, and a boon that vanished silently is the
          // interface keeping a secret.
          parts.push(camp.warning);
        }
        announce(`⚔ Camp cleared: ${parts.join(', ')}${tail}`, { cell: at });
      } else if (spoils.length > 0) {
        announce(`⚔ ${spoils.join(', ')}`, { cell: at });
      }
      // A caravan ridden down by a piece that simply *walked onto* it — the
      // arrival's own half of plunder, beside the camp above and reported the
      // same way and for the same reason: the gold is banked, the grain is in a
      // basket and the caravan is gone, so only the command that paid it can
      // say what it was worth (`ArrivalReport.plundered`).
      for (const plunder of arrival.plundered) {
        const victim = playerById(getGame().state, plunder.fromOwnerId)?.name ?? 'an empire';
        announce(plunderSpoilsSentence(plunder, victim), { cell: at });
      }
      // The card is the announcement for a discovery — see the docblock.
      if (arrival.discovery) onOfferDiscovery?.();
    }
  }

  /**
   * The first player after `from` who has not ended the turn, or null when
   * everyone is finished. Wraps, and considers `from` itself last.
   */
  function nextOpenSeat(from: number): number | null {
    const { state } = getGame();
    // The roster this cycles is `realPlayers` — the one register for who counts
    // (`state.ts`), which the interface's other three rosters (the seat strip,
    // the status line's waiting list, the Abacus) now ask as well. It used to
    // hand-roll `!player.barbarian` here, which was the right answer written in
    // the wrong place: "which seats can a human sit in" is a fact about the
    // roster, not a clause this loop should own, and the copy of it that was
    // *not* written is how a chip for the wild reached the top bar.
    const seats = realPlayers(state);
    const count = seats.length;
    if (count === 0) return null;
    // `from` is a seat id, and a real seat's id is its index in this list —
    // barbarians are seated last (`seatBarbarians`) precisely so that holds. A
    // scan rather than arithmetic anyway, so the day it stops holding this stops
    // being wrong rather than starting to be subtly wrong.
    const start = seats.findIndex((player) => player.id === from);
    for (let step = 1; step <= count; step++) {
      const player = seats[(start + step + count) % count];
      if (player && !hasEndedTurn(state, player.id)) return player.id;
    }
    return null;
  }

  /**
   * Ends the local seat's turn — and only it. Everyone else is still playing.
   *
   * What happens next is the harness: if seats remain open, the local seat hops
   * to the next of them, so one tester can drive a whole table without hunting
   * for who is outstanding. If that command was the last one, the turn resolved
   * (the `turn` counter moved), every seat reopened, and the local seat stays
   * where it is — the player who pressed the button keeps playing themselves.
   */
  /**
   * Where every unit under a standing order is standing, and what that order
   * still is, captured immediately before a dispatch that might resolve the turn.
   *
   * This is the only moment the information exists. `resetMovement` walks those
   * orders in place, so a heartbeat later the unit is at its new tile and the
   * waypoints it crossed have been consumed from its `path` — there is nothing
   * left to reconstruct the walk from. Only units that actually hold an order
   * are captured, because they are the only ones resolution can move.
   */
  interface StandingOrder {
    id: number;
    col: number;
    row: number;
    route: CellRef[];
  }

  function standingOrders(): StandingOrder[] {
    const orders: StandingOrder[] = [];
    for (const unit of getGame().state.units) {
      if (!unit.path || unit.path.length === 0) continue;
      orders.push({
        id: unit.id,
        col: unit.col,
        row: unit.row,
        route: unit.path.map((cell) => ({ col: cell.col, row: cell.row })),
      });
    }
    return orders;
  }

  /**
   * Slides every piece that resolution just marched, from where it was to where
   * it now is.
   *
   * Without this a turn change is a room full of teleports: the player presses
   * End Turn, the pipeline walks a dozen stored orders, and the next frame draws
   * every one of those units somewhere else with nothing in between. The
   * simulation is already final by the time this runs — it is the same powerless
   * cosmetic replay a fresh `moveUnit` gets (see `animation3d.ts`), fed from the
   * routes captured a moment ago and cut to the tiles actually entered.
   *
   * Every player's units, not just the local seat's: turns are simultaneous, and
   * an enemy column arriving is exactly the thing a player must not miss. Which
   * of those marches the seat is actually *entitled* to watch is the renderer's
   * question and is answered there (`Renderer3D.animateMove` refuses one that
   * ends out of sight), for the same reason the piece itself is filtered there:
   * fog is a property of the board, and this module would only be able to
   * re-derive it.
   */
  function animateResolvedMarches(orders: readonly StandingOrder[]): void {
    if (orders.length === 0 || prefersReducedMotion()) return;
    const { state } = getGame();
    for (const order of orders) {
      const unit = unitById(state, order.id);
      if (!unit) continue;
      if (unit.col === order.col && unit.row === order.row) continue;
      // The route it was holding, cut at wherever it actually stopped — the
      // walk may have run out of movement or been blocked half way.
      const walked = walkedPrefix(order.route, { col: unit.col, row: unit.row });
      if (walked.length === 0) continue;
      renderer.animateMove(unit.id, { col: order.col, row: order.row }, walked);
    }
  }

  /**
   * One line per sleeper the resolution woke, each pointing at the piece.
   *
   * Read as a *difference* (`wakesSince`) rather than reported by the phase, and
   * that is the same trade `researchSince` and `announceDeficits` make: the flag
   * `wakeSleepers` cleared leaves nothing behind on the board, so the only
   * honest way to ask is to have remembered. It also means a second future cause
   * of waking is announced without this function hearing about it.
   *
   * The sentence names the piece rather than the enemy, deliberately. The player
   * knows what a worker is and does not yet know what walked up to it; "enemies
   * near" plus a hex to click is the whole of what they need, and naming the
   * intruder would be the interface telling them something the fog might not.
   */
  function announceWakes(asleep: readonly number[]): void {
    if (asleep.length === 0) return;
    for (const unit of wakesSince(getGame().state, localPlayerId, asleep)) {
      const name = unitDef(unit.type).name.toLowerCase();
      announce(`Your ${name} wakes — enemies near.`, {
        cell: { col: unit.col, row: unit.row },
      });
    }
  }

  /**
   * One toast, once per game: the first Statecraft draft this empire has ever
   * been dealt.
   *
   * Checked from `commit`, after *every* accepted command, the same choke
   * point `pollSightings` uses and for the same reason: a draft is not only
   * settled at end of turn (`runStatecraft`, the turn phase) but also by any
   * of the mid-turn windfalls that route through `settleCultureWindfall`
   * (clearing a camp, a ruin, a completed improvement, a finished tech) — a
   * check that only ran inside `endTurn` would miss every one of those. The
   * tier a first draft lands on is always 1: `settleDraft` deals an Order at
   * every draft and never a government before whatever tier the ladder first
   * gates one at, so "drafts went from 0 to nonzero" is unambiguous.
   *
   * `statecraftDraftAnnounced` is the flag, not a before/after snapshot,
   * because the moment worth catching can be several commands after the one
   * that is easy to snapshot around. It starts wherever `refresh` finds the
   * seat's own drafts count — zero for a new game, already-crossed for a
   * loaded save with history — so resuming a game past its first draft does
   * not replay this toast.
   *
   * The existing `statecraft` turn blocker already stops End Turn and opens the
   * offer card the moment a player *tries* to end a turn a draft is sitting
   * on — this fires earlier and beside it, not instead of it: a player who has
   * never seen the screen is pointed at it the instant the draft appears,
   * rather than only learning it exists by tripping the blocker later. Its
   * action opens the Statecraft screen itself (`openStatecraft`), not the offer
   * card and not a camera pan — the empire is the subject, exactly as the
   * blocker's own guidance line reads for `research` and `statecraft`.
   */
  function checkFirstStatecraftDraft(): void {
    if (statecraftDraftAnnounced) return;
    const player = playerById(getGame().state, localPlayerId);
    if (!player || player.statecraft.drafts === 0) return;
    statecraftDraftAnnounced = true;
    announce('Your first Order awaits — open the Statecraft.', { openStatecraft: true });
  }

  /**
   * **A name is waiting to be called.** One line, on the turn the bucket fills.
   *
   * `checkFirstStatecraftDraft`'s sibling with one difference, and the
   * difference is the mechanic: a first draft happens once in a game and is
   * latched, while a recruitment happens every twenty-odd turns and each one is
   * news — so this is a **rising edge** against the offer actually on the seat
   * rather than a flag that is never lowered.
   *
   * The line carries the card's own door (`openGreatPerson`), because a chip
   * that has quietly turned gold is not a thing a player who has never seen a
   * great person knows to hover.
   */
  function checkGreatPersonOffer(): void {
    const player = playerById(getGame().state, localPlayerId);
    const waiting = player !== undefined && hasGreatPersonOffer(player);
    if (waiting && !greatPersonOfferOutstanding) {
      announce('✦ A great person awaits your call.', { openGreatPerson: true });
    }
    greatPersonOfferOutstanding = waiting;
  }

  // --- handing the new turn over -------------------------------------------

  /**
   * The three-beat hand-over: why End Turn is not one instant.
   *
   * The bug this exists to answer was reported twice as "queued moves seem to
   * happen at the *start* of the next turn rather than when I press End Turn",
   * and the simulation was never at fault — stored paths walk during resolution
   * and `animateResolvedMarches` slides them on the resolving click, which is
   * exactly Civ. What was wrong was that the click did *four* things in one
   * synchronous breath: it started the marches, dropped a card in the middle of
   * the board for a second and a half, and glided the camera off to the first
   * idle piece. A one-hex march is 160ms of sliding under a 1600ms card while
   * the ground itself is moving; the player never sees a consequence of their
   * click, only a new turn that arrives with the pieces already elsewhere.
   *
   * So the three things are three beats, in the order a player reads them:
   *
   *   1. **the marches**, on a still camera and an unobstructed board — the
   *      consequence of the click, and the only one of the three that is about
   *      the turn that just *ended*;
   *   2. **the card**, once the board has stopped moving — "your turn" is a
   *      hand-over, and a hand-over comes after the handing;
   *   3. **the camera**, a beat later, to the first piece still awaiting orders
   *      — the interface pointing, which is a gesture the player has to have
   *      finished reading the card to follow.
   *
   * Nothing here delays the *simulation* by so much as a frame: the state is
   * final before beat one, and every one of these beats is a thing said about a
   * board that has already stopped. The player may act straight through all
   * three — the animations are powerless (`animation3d.ts`) and a command
   * issued mid-walk simply overtakes them.
   *
   * How long beat one lasts is the renderer's answer, not a guess
   * (`pendingAnimationMs`): it is the walk it actually started, cut to the tiles
   * actually entered, and `0` when there was nothing to animate — reduced
   * motion, a march the fog refused, or no standing orders at all. At `0` the
   * whole thing collapses to the synchronous sequence it has always been, which
   * is what the frozen 2D pipelines and a reduced-motion reader get.
   */
  const HANDOVER_PAN_MS = 450;

  /** Timers beats two and three are waiting on. At most two, usually none. */
  let handOverTimers: number[] = [];

  /**
   * Drops a hand-over that has been overtaken, without running it.
   *
   * Cancelled rather than flushed, and by the two things that can overtake one:
   * another turn resolving (its own hand-over is the one worth having) and the
   * seat changing (the card and the camera glide belong to a player who is no
   * longer at the table — see `setLocalPlayer`, which clears the selection and
   * the skip set for the same reason).
   */
  function cancelHandOver(): void {
    for (const timer of handOverTimers) window.clearTimeout(timer);
    handOverTimers = [];
  }

  /** Beat `n`: now when there is nothing to wait for, on a timer when there is. */
  function afterBeat(ms: number, beat: () => void): void {
    if (ms <= 0) {
      beat();
      return;
    }
    handOverTimers.push(window.setTimeout(beat, ms));
  }

  /**
   * Beats two and three, once the marches beat one started have run their
   * course. See `HANDOVER_PAN_MS` for the whole argument.
   */
  function scheduleHandOver(
    research: ResearchReport,
    deficits: readonly string[],
    triumphs: readonly TriumphAward[],
  ): void {
    const marching = renderer.pendingAnimationMs?.() ?? 0;
    afterBeat(marching, () => {
      onTurnHandedOver?.(getGame().state.turn, research);
      // **After the card, before the camera.** A Triumph earned in the
      // resolution is the loudest thing that happened in it, and it is raised
      // in the same beat the card is rather than on a fourth timer of its own:
      // the card is a two-second announcement over the board, the sheet is a
      // surface with a button, and one landing on top of the other is exactly
      // what "your turn" is for. The camera glide below still runs — it is
      // pointing at a piece the player will find when they proceed, and a pan
      // held hostage to a button press would be a beat that never arrives if
      // the sheet is answered from the keyboard mid-glide.
      if (triumphs.length > 0) onTriumphs?.(triumphs);
      // A reader who has asked for less motion has asked for fewer beats too:
      // the card and the camera arrive together, as they always did.
      afterBeat(prefersReducedMotion() ? 0 : HANDOVER_PAN_MS, () => {
        // The Civ gesture: the same click that marched the standing orders hands
        // the new turn over *on* the first piece still awaiting one — a unit
        // whose walk finished with movement to spare would otherwise stand
        // unnoticed until the next End Turn press tripped over it. Units only:
        // the blocker gate still catches production and research on the next
        // press, but auto-opening a city screen or the star chart at every turn
        // open would be the interface grabbing the wheel, where a camera glide
        // to a waiting piece is it pointing.
        //
        // Asked *here* rather than carried from the resolution, because a player
        // who spent the marches giving orders has answered it already.
        const idle = endTurnBlocker();
        if (idle?.kind === 'idleUnit') focusBlocker(idle);
        // A culture meter that filled during the resolution is **news**, and it
        // is said rather than shown: Entry XVIII.4's rule is that a screen
        // auto-opens only when it is already the open subject, and the card is
        // reached by End Turn's blocker or by `C`. Without this line the only
        // sign of a draft would be a badge nobody was looking at.
        //
        // A discovery is the deliberate contrast one line up (`onOfferDiscovery`
        // in `reportArrivals`): that card opens on the spot because the player
        // *just walked onto the ruin* and the offer is the announcement. A draft
        // lands in a resolution the player did not aim at any particular hex, so
        // it gets the chronicle instead of the wheel.
        const seat = playerById(getGame().state, localPlayerId);
        if (seat) {
          const owed = statecraftBlocker(seat);
          if (owed !== null) announce(`🎵 The meter is full — ${owed}.`);
          else if (seat.statecraft.pendingGovernment !== undefined) {
            announce('🎵 A new charter is ready to be sworn.');
          }
        }
        // Last, so it wins the notice line: a meter going under is rarer than a
        // waiting unit and outranks it, and the camera glide the blocker just
        // performed is the useful half of that prompt anyway.
        if (deficits.length > 0) announce(deficits.join(' '));
      });
    });
  }

  // --- unfinished business -------------------------------------------------

  /**
   * What End Turn would stop on. A straight read of the pure helper for the
   * seat this client is playing, past whatever units this seat has skipped —
   * the seat and the skip set are the only two things this module adds.
   */
  function endTurnBlocker(): TurnBlocker | null {
    return firstBlocker(getGame().state, localPlayerId, { skippedUnitIds });
  }

  /** Brings one cell into view, respecting the viewer's motion preference. */
  function panToCell(cell: CellRef): void {
    renderer.panToCells?.([cell], !prefersReducedMotion());
  }

  /**
   * Takes the player to a piece of unfinished business, and says what it is.
   *
   * Every arm does the same three things in the same order — look at it, put it
   * in hand, name it — because that is what "find the thing I forgot" means: the
   * camera answers *where*, the selection or the open panel answers *which*, and
   * the manicule line answers *what now*. The notice is `guide` rather than
   * `announce` or `reject`: this is guidance the player asked for by pressing
   * the button, not news and not a refusal, and it should not flinch at them
   * or steal a slot in the chronicle (module docblock's three-way split).
   */
  function focusBlocker(blocker: TurnBlocker): void {
    const { state } = getGame();
    switch (blocker.kind) {
      case 'idleUnit': {
        const unit = unitById(state, blocker.unitId);
        if (!unit) return;
        panToCell({ col: unit.col, row: unit.row });
        select(unit.id);
        // A settler is the one idle piece whose job the interface can guess, so
        // it gets its own line. Everything else is told, honestly, that it is
        // waiting to be told.
        guide(
          unitDef(unit.type).foundsCity
            ? '☞ Your settlers await a home.'
            : '☞ A unit awaits your command.',
        );
        return;
      }
      case 'cityProduction': {
        const city = cityById(state, blocker.cityId);
        if (!city) return;
        panToCell({ col: city.col, row: city.row });
        // The two right-hand panels share a slot, and a city screen is what
        // answers this blocker; drop the selection the way a click on a city
        // tile does rather than leaving a unit sheet fighting it for the space.
        selectedId = null;
        setOpenCity(city.id);
        guide(`☞ ${cityDisplayName(state, city)} wants for work — choose a production.`);
        return;
      }
      case 'research': {
        guide('☞ Your scholars await direction.');
        onOpenTechTree?.();
        return;
      }
      case 'discovery': {
        const offer = playerById(state, localPlayerId)?.pendingDiscovery;
        if (offer) panToCell({ col: offer.col, row: offer.row });
        guide('☞ A discovery awaits your judgment.');
        onOfferDiscovery?.();
        return;
      }
      case 'statecraft': {
        // No camera: the empire is the subject, exactly as it is for research.
        // Two sentences rather than one, because the two drafts are two
        // different weights of decision and the player should know which is up
        // before the card lands.
        guide(
          blocker.what === 'order'
            ? '☞ Your council awaits an Order.'
            : '☞ A Doctrine awaits — and it is permanent.',
        );
        onOfferStatecraft?.();
        return;
      }
      case 'religion': {
        // No camera either, and for the same reason: the pantheon is the
        // empire's, not a place on the board.
        guide('☞ A god awaits a name.');
        onOfferReligion?.();
        return;
      }
      case 'greatPerson': {
        // And no camera for the fourth, for the third's reason: the roster is
        // the world's and the offer is the empire's. The piece the pick mints
        // arrives in the capital, and *that* is what gets a pan — from the
        // recruitment's own announcement, once there is somebody to look at.
        guide('☞ A great person awaits your call.');
        onOfferGreatPerson?.();
        return;
      }
    }
  }

  /**
   * Both empire meters for the local seat, as one reading.
   *
   * Taken before a turn is dispatched and again after it resolved, so the
   * interface can say *the turn a meter crosses into deficit* and never again —
   * which is the only moment worth a line, since the chip in the bar carries the
   * standing state from then on (design ledger, Entry XIV.C).
   */
  function meterReading(): { happiness: number; authority: number } {
    const { state } = getGame();
    return {
      happiness: happinessOf(state, localPlayerId),
      authority: authorityOf(state, localPlayerId),
    };
  }

  /**
   * The one line a meter gets when it goes under, and it never gates anything.
   *
   * Deficits are legal gambits (Entry I's first commitment): End Turn does not
   * stop on one, the reducer does not know about one, and this is the whole of
   * the interface's response — a sentence, in the same slot a captured city
   * announces itself in. A crossing back up says nothing, because the chip going
   * quiet has already said it.
   *
   * Split into the *reading* and the *saying* because the two no longer happen
   * at the same instant: the crossing is a difference against a snapshot taken
   * before the dispatch and stops being true the moment anything else moves a
   * meter, while the sentence waits for the marches to finish with the rest of
   * the hand-over (see `endTurn`). So the comparison is made on resolution and
   * the words are carried, rather than the state being asked again a second
   * later — by which time the player may have bought a tile.
   */
  function deficitLines(before: { happiness: number; authority: number }): string[] {
    const after = meterReading();
    const lines: string[] = [];
    if (before.happiness >= 0 && after.happiness < 0) lines.push('Your people murmur.');
    if (before.authority >= 0 && after.authority < 0) {
      lines.push("The Magister's writ grows thin.");
    }
    return lines;
  }

  /**
   * Ends the local seat's turn, or stops on the first thing it still owes.
   *
   * `force` is Shift. The gate is entirely local — see the module docblock: the
   * command is unchanged and nobody else at the table is held to this.
   */
  function endTurn(force = false): void {
    if (!force) {
      const blocker = endTurnBlocker();
      if (blocker) {
        focusBlocker(blocker);
        return;
      }
    }

    // A hand-over still owed by an earlier press has been overtaken: the turn it
    // was going to announce is not the turn about to begin.
    cancelHandOver();

    const turnBefore = getGame().state.turn;
    // Captured before the dispatch: if this is the command that resolves the
    // turn, the walk is over by the time it returns — and so is the research
    // that completed inside it, which is only visible as a difference.
    const orders = standingOrders();
    const research = researchSnapshot(getGame().state, localPlayerId);
    const meters = meterReading();
    // The third thing that is only visible as a difference, beside the research
    // and the meters: `wakeSleepers` clears a flag, and afterwards there is
    // nothing on the board to say it ever stood.
    const asleep = sleepingSnapshot(getGame().state, localPlayerId);
    // Collecting, for the whole of this dispatch and no longer: any Triumph the
    // resolution awards this seat belongs to the hand-over rather than to now.
    // See `reportTriumphs`, which is what fills it, and note that it is emptied
    // on **both** branches below — a turn that did not resolve has nothing to
    // wait for, and a sheet nobody raised is renown a player never saw awarded.
    heldTriumphs = [];
    const result = commit({ type: 'endTurn', playerId: localPlayerId });
    const earned = heldTriumphs;
    heldTriumphs = null;
    if (!result.ok) return;

    // Whatever was still sliding belongs to the turn that just ended.
    renderer.skipAnimations();
    renderer.invalidate();
    clearSelection();

    if (getGame().state.turn !== turnBefore) {
      // A fresh turn owes nothing to the one that just ended: every unit gets
      // its idle question asked again in earnest, skipped or not.
      skippedUnitIds.clear();
      // **First, and alone.** Everything below is held back until these have
      // finished — see `scheduleHandOver`.
      animateResolvedMarches(orders);
      const report = researchSince(getGame().state, localPlayerId, research);
      // The world moved, and that is not an announcement: whoever is listening
      // takes their save now, before a card, a camera or a player can intervene.
      onTurnResolved?.(getGame().state.turn, report);
      // Immediately, and not with the hand-over: this is *news*, it goes to the
      // toast stack and the chronicle rather than to the notice line or the
      // camera, and it is the one thing in a resolution a player must not first
      // read three seconds later. Its pan is a link the player follows, never a
      // camera move of its own — so it cannot fight the marches.
      announceWakes(asleep);
      scheduleHandOver(report, deficitLines(meters), earned);
      return;
    }
    // The turn did not resolve — other seats are still playing — so there is no
    // hand-over to hold anything for and whatever was earned is shown now.
    if (earned.length > 0) onTriumphs?.(earned);
    const next = nextOpenSeat(localPlayerId);
    if (next !== null) {
      setLocalPlayer(next);
      onSeatAdvanced?.(next);
    }
  }

  // --- hover ---------------------------------------------------------------

  function refreshHover(): void {
    if (!pointer) return;
    const hover = renderer.pick(pointer.x, pointer.y);
    renderer.setHover(hover);
    // The spotlight follows the pointer, so it is refreshed here rather than in
    // `refreshOverlays` — which recomputes the reachable set and has no business
    // running on every mouse move. Both renderer setters ignore an unchanged
    // value, so resting the pointer on one tile costs nothing.
    refreshSpotlight();
    // The settler lens's radius preview follows the pointer for the same reason
    // the spotlight does, and is guarded the same way on the renderer's side.
    refreshSiteRadius();
    refreshPathPreview();
    onUpdate(selectedUnit(), hover);
  }

  // --- wiring --------------------------------------------------------------

  // The browser's context menu is suppressed **at the document**, not here —
  // see `wantsNativeContextMenu` below and its one installer in `main.ts`. A
  // listener on the viewport was the bug: right-drag pans with the pointer
  // *captured* by the viewport, but `contextmenu` is a mouse event and is
  // hit-tested normally, so a pan that ended with the cursor over a banner, a
  // price tag, a toast or the unit sheet fired the menu on a surface that never
  // heard of the rule. Right click is a game input for as long as a game is on
  // screen, and that is a fact about the page rather than about one element.

  viewport.addEventListener('pointerdown', (event) => {
    // Left and right only, and only one at a time: a second button pressed
    // mid-drag is a slip, not a gesture.
    if (event.button !== 0 && event.button !== 2) return;
    if (dragButton !== null) return;
    dragButton = event.button;
    travelled = 0;
    pressX = event.clientX;
    pressY = event.clientY;
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (dragButton !== null) {
      const dx = event.clientX - pressX;
      const dy = event.clientY - pressY;
      travelled += Math.abs(dx) + Math.abs(dy);
      pressX = event.clientX;
      pressY = event.clientY;
      renderer.panByScreen(dx, dy);
    }

    const rect = viewport.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    refreshHover();
  });

  /**
   * Ends a press. `fire` is false for a cancelled pointer, and for a release
   * that travelled far enough to have been a pan — the slop guard, which is
   * what keeps a right-drag pan (how a two-finger trackpad drag often arrives)
   * from ending in a move order the player never asked for.
   */
  function endDrag(event: PointerEvent, fire: boolean): void {
    if (dragButton === null) return;
    const button = dragButton;
    dragButton = null;
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    if (!fire || travelled > CLICK_SLOP_PX) return;

    const rect = viewport.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const hover = renderer.pick(screen.x, screen.y);
    // The left button asks a second picking question — which badge is under the
    // pointer — so it needs the position itself, and it is worth asking even
    // where the board answers nothing: a badge rides above its tile and one on
    // the top row floats past the north pole. See `handleLeftClick`.
    if (button === 0) handleLeftClick(hover, screen);
    else if (hover) handleRightClick(hover);
  }

  viewport.addEventListener('pointerup', (event) => {
    // Releasing a button other than the one that started the drag leaves the
    // drag running; the gesture is not over until its own button comes up.
    if (event.button !== dragButton) return;
    endDrag(event, true);
  });
  viewport.addEventListener('pointercancel', (event) => endDrag(event, false));

  viewport.addEventListener('pointerleave', () => {
    pointer = null;
    renderer.setHover(null);
    renderer.setPathPreview([]);
    // The pointer took the spotlight with it. A banner keeps its own — moving
    // onto one does not leave the viewport, since banners live inside it.
    refreshSpotlight();
    onUpdate(selectedUnit(), null);
  });

  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      renderer.zoomBy(factor, pointer.x, pointer.y);
      refreshHover();
    },
    { passive: false },
  );

  window.addEventListener('keydown', (event) => {
    // A screen in front of the board owns the keyboard while it is up, Escape
    // included: there is nothing behind it for Escape to back out of.
    if (inputBlocked?.()) return;

    const target = event.target as HTMLElement | null;
    const typing =
      target !== null &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);

    // A letter typed into the seed box is a letter, not a hotkey — but Escape
    // is always Escape, or a popover opened from the keyboard would be one you
    // could not close from the keyboard.
    if (typing && event.key !== 'Escape') return;

    if (event.key === 'Escape') {
      // One layer at a time, outermost first. Each of these is something the
      // player put on the screen, and Escape takes back the most recent thing
      // they did — not everything at once.
      if (moveMode) setMoveMode(false);
      else if (closePopovers?.()) return;
      // Buy mode is a layer *inside* the city screen, so it comes off before
      // the screen it lives on: one Escape stops buying, a second closes the
      // panel. Backing out of both at once would lose the city a player only
      // meant to stop shopping in.
      else if (buyMode) setBuyMode(false);
      else if (openCity()) setOpenCity(null);
      else clearSelection();
      return;
    }
    if (event.key === 'g' || event.key === 'G') {
      // Only the 2D renderer draws a grid to toggle; in 3D the grout lines
      // between the tiles already are one, and there is nothing to hide.
      renderer.toggleGrid?.();
      return;
    }
    if (event.key === 'b' || event.key === 'B') {
      foundCity();
      return;
    }
    if (event.key === 'f' || event.key === 'F') {
      // Silent with nothing selected, or on a unit that cannot dig in: the
      // blocker decides, exactly as the button's disabled state does.
      fortify();
      return;
    }
    if (event.key === 'z' || event.key === 'Z') {
      // Fortify's civilian twin gets the key beside it in spirit if not on the
      // board: `S` is taken by nothing yet but reads as "settle", and Civ has
      // trained a generation on `Z` for sleep. Silent on a soldier, on nothing
      // selected, or on a unit already asleep — the blocker decides, exactly as
      // the button's disabled state does.
      sleepUnit();
      return;
    }
    if (event.key === 'y' || event.key === 'Y') {
      // Toggles the player's own switch, never the automatic rule: pressing Y
      // under an open city panel sets what will be up when the panel closes,
      // which is the only reading that does not lose a keystroke.
      setYields(!yieldsOn);
      return;
    }
    if (event.key === 'r' || event.key === 'R') {
      // The roundels. One switch, no automatic rule to reconcile with — see
      // `effectiveLens`.
      setResources(!resourcesOn);
      return;
    }
    if (event.key.length === 1 && event.key >= '0' && event.key <= '9') {
      // Reserved for the lens menu (see `lensForDigit`'s docblock): 0 clears,
      // 1..9 read `lensOrder`'s positions. No other feature may bind a digit —
      // this branch is meant to be the only place `event.key` is compared
      // against a numeral in this file.
      const target = lensForDigit(Number(event.key), lensOrder, manualLens);
      if (target !== null) setLens(target);
      return;
    }
    if (event.key === 't' || event.key === 'T') {
      // The tech screen. It takes the keyboard from here while it is up, so
      // this is only ever the way in.
      onToggleTechTree?.();
      return;
    }
    if (event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      onToggleStatecraft?.();
      return;
    }
    if (event.key === 'a' || event.key === 'A') {
      // The Abacus. Like the star chart, it takes the keyboard from here while
      // it is up, so this is only ever the way in.
      onToggleAbacus?.();
      return;
    }
    if (event.key === 'm' || event.key === 'M') {
      // The trackpad's right click. Silent when there is nothing to order:
      // `setMoveMode` refuses to arm without a unit that could move.
      setMoveMode(!moveMode);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      // A focused button is already listening for these two keys. Ending the
      // turn, skipping a unit, and pressing whatever the player had tabbed to
      // are three keystrokes doing one job each, and the browser's own
      // activation is the one to keep.
      if (target?.tagName === 'BUTTON') return;
      if (event.key === 'Enter') {
        event.preventDefault();
        // Shift ⏎ is the same override the button carries: end the turn
        // whatever is still outstanding.
        endTurn(event.shiftKey);
        return;
      }
      // Space is the Civ convention for "do nothing this turn". Silent with
      // nothing selected, or on a unit with nothing left to skip: `skipUnit`
      // decides, exactly as every other hotkey here defers to its blocker.
      event.preventDefault();
      skipUnit();
    }
  });

  /** Puts a lens up. The menu's rows; a no-op if it is already up. */
  function setLens(next: LensMode): void {
    if (manualLens === next) return;
    manualLens = next;
    refreshLens();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /** Turns the yield glyphs on or off. The menu's checkbox and the `Y` key. */
  function setYields(on: boolean): void {
    if (yieldsOn === on) return;
    yieldsOn = on;
    refreshLens();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /** Turns the resource roundels on or off. The menu's checkbox and the `R` key. */
  function setResources(on: boolean): void {
    if (resourcesOn === on) return;
    resourcesOn = on;
    refreshLens();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  function setHoveredCity(cityId: number | null): void {
    if (hoveredCityId === cityId) return;
    hoveredCityId = cityId;
    refreshSpotlight();
  }

  // The board starts masked by the seat this client is playing. Sent once, here,
  // rather than being an argument to the renderer's constructor: whose game this
  // is belongs to the UI (CLAUDE.md, hard rule 3), and a renderer that had to be
  // told at construction could not be handed a different seat later.
  renderer.setFogSeat?.(localPlayerId);

  return {
    clearSelection,
    endTurn,
    guide,
    sendStatecraft,
    endTurnBlocker,
    setLocalPlayer,
    lens: () => manualLens,
    setLens,
    yieldsShown: () => yieldsOn,
    setYields,
    resourcesShown: () => resourcesOn,
    setResources,
    setHoveredCity,
    foundCity,
    foundCityBlocker,
    cancelOrder,
    cancelOrderBlocker,
    fortify,
    fortifyBlocker,
    sleepBlocker,
    sleepUnit,
    skipUnit,
    skipBlocker,
    isUnitSkipped,
    improvementOptions,
    buildImprovement,
    chopBlocker,
    chopPreview,
    chopTechName,
    chop,
    pillage,
    pillageBlocker,
    greatPersonView,
    greatPersonAct: () => spendGreatPerson('act'),
    greatPersonWork: () => spendGreatPerson('work'),
    consecrateBlocker,
    consecrate,
    riteOptions,
    performRite,
    combatForecast,
    openCity,
    setOpenCity,
    setMoveMode,
    setBuyMode,
    purchaseTileAt: purchaseTile,
    startRouteBlocker,
    routeReading,
    setAutoResend,
    cancelRoute,
    startRouteFrom,
    setAutoResendOf,
    cancelRouteOf,
    routeSlotsLine: () => routeSlotsLineOf(getGame().state, localPlayerId),
    selectedUnit,
    isMoveMode: () => moveMode,
    isBuyMode: () => buyMode,
    localPlayerId: () => localPlayerId,
    announce,
    panTo: panToCell,
    /**
     * Re-reads the game after it has been replaced. A new game is a new table:
     * the local seat goes to the seat asked for — the first, for a new game, and
     * whichever seat a loaded save implies for a resumed one — and the camera
     * opens on their units, instantly, because there is no previous view to
     * travel from.
     */
    refresh: (seatId = 0) => {
      selectedId = null;
      openCityId = null;
      // City ids do not survive a new game; the lens the player chose does.
      hoveredCityId = null;
      // Nor do unit ids — a stale skip could otherwise silence a fresh unit
      // that only happens to reuse a low id.
      skippedUnitIds.clear();
      localPlayerId = seatId;
      // A new table starts this at zero; a loaded save inherits whatever the
      // resumed seat's own history already crossed — see
      // `checkFirstStatecraftDraft`.
      statecraftDraftAnnounced = (playerById(getGame().state, seatId)?.statecraft.drafts ?? 0) > 0;
      // Deliberately **false** rather than "whatever this seat holds": a resumed
      // game with a name already waiting should say so once, which is exactly
      // what a rising edge against `false` does on the next commit.
      greatPersonOfferOutstanding = false;
      // A new table, or a loaded one. Nobody has been told anything about this
      // world, and everything already on it — a resumed game's charted ruins,
      // the camps its borders watch — is the state of play rather than news, so
      // the watcher is emptied and immediately re-baselined for this seat.
      sightings.reset();
      baselineSightings();
      // The board is masked by whoever is sitting at it, and this seat may not
      // be the one the last game left behind — the same first move
      // `setLocalPlayer` makes, and for the same reason: an overlay computed
      // against the previous seat's fog would be drawn over ground this one has
      // never seen.
      renderer.setFogSeat?.(localPlayerId);
      setMoveMode(false);
      refreshOverlays();
      showLocalPlayer(false);
      onUpdate(null, renderer.getHover());
    },
  };
}
