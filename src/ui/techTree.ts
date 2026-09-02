/**
 * The star chart: the technology tree as the magister's sky.
 *
 * A full-screen overlay opened from the HUD's research card (or `T`), and the one
 * deliberately dark surface in a light interface — ink ground, gilt stars,
 * hairline sight-lines between a node and the nodes it depends on (see the
 * flourish set in Entry VII of `docs/design-notes.md`). Everything else on the
 * screen is parchment on a table; this is the table at night.
 *
 * It also fills the HUD's research card, the fixed surface at the top-left that
 * says what the empire is learning (`renderStatus`, at the foot of this file).
 * The card is this screen's handle and its readout at once, and it lives here
 * rather than in a module of its own for the same reason the bar line it
 * replaced did: one file reads `researching`, so the card and the lit node in
 * the chart cannot come to two different conclusions about it.
 *
 * It reads the simulation and sends exactly one command
 * -----------------------------------------------------
 * Every state a node can be in — researched, being researched, available,
 * locked — is derived from `src/sim/tech.ts`, and whether a node can be clicked
 * is `researchError(...) === null`, which is the *same* function the reducer
 * validates `chooseResearch` with. A node this screen lets you press is a node
 * the reducer accepts; a node it dims explains itself with the reducer's own
 * words. There is no second opinion about the rules anywhere in this file.
 *
 * Glanceable numbers (Entry VIII)
 * ------------------------------
 * Each node carries its cost and "~N turns" at the player's *current* science
 * rate, and each building it unlocks carries what that building would add to
 * this empire's yields today — computed by `buildingYieldDelta`, which asks
 * `cityYields` twice rather than reimplementing it. Both are present-state
 * figures and the screen says so ("now"), because a delta that quietly assumed
 * future growth would be a promise the game never made.
 *
 * A chart that travels sideways
 * -----------------------------
 * The screen is a dependency chart on a horizontally scrolling stage, not a
 * list of ages: a node's column is `techDepth` — the longest chain of
 * prerequisites behind it — and its row is the lane hand-authored in
 * `data/techs.json` (the lane principle is written down in `techData.ts`). So a
 * chain reads as a chain, left to right, and the ages are demoted to what they
 * always were: an annotation, painted as dim gilt numerals behind the columns
 * they happen to own (`techAgeBands`).
 *
 * Travel is by drag, by wheel and by the arrow keys. On opening, the stage
 * jumps — no tween; the player asked to see the chart, not to watch it arrive —
 * to whatever they are researching, or to the leftmost thing they *could*
 * research if they are researching nothing.
 *
 * Sideways is the direction it *mostly* goes, and for a while it was the only
 * one: the wheel was turned across unconditionally, which was right for a chart
 * that fitted its window and was a trap for one that did not. The bottom lane of
 * a seven-lane sky sat below the fold of a 900px screen with no gesture that
 * would reach it. So the rule now asks the stage rather than assuming: the wheel
 * goes **down while there is down to go** and sideways otherwise, drag has
 * always moved both axes, `↑`/`↓` join `←`/`→`, and `centreOn` travels in both.
 * What made that livable is `fitLanes` (`techFit.ts`) — the lanes are spaced
 * from the height actually available, so a five-lane chart usually has no down
 * to go and the wheel behaves exactly as it always did.
 *
 * Reading one node's dependencies (the focus mode)
 * -----------------------------------------------
 * Forty-odd hairlines behind twenty-six cards is a sky, not a diagram, and the
 * complaint it earned was the fair one: you cannot tell which line is yours.
 * Hovering — or tabbing to — a node lights its own connectors solid and drops
 * the rest to a whisper, and rings the nodes at the other ends: gilt on what it
 * needs, parchment on what it opens. Nothing is added to the palette and no
 * layout moves; the chart just stops saying everything at once. It is bound on
 * the card rather than in CSS because the connectors are not descendants of the
 * node they belong to — they are one SVG behind all of them.
 *
 * Why the lines are drawn after layout
 * ------------------------------------
 * The connectors are one SVG behind the cards, and they are measured from the
 * cards themselves rather than from a hand-maintained coordinate table: the
 * chart is a grid that reflows with the window and with the length of a
 * building's name, and a diagram that had its own idea of where the nodes were
 * would drift the first time somebody resized. Measurement needs a laid-out
 * DOM, so it happens on the frame after the overlay is shown, and again on
 * resize while it is open. The SVG lives *inside* the scrolling field and is
 * measured in field coordinates, so scrolling moves the lines with the cards
 * for free — a diagram drawn in viewport coordinates would need repainting on
 * every scroll event and would still lag by a frame.
 */

import { buildingDef, isWonder } from '../sim/buildingData';
import { unitProductionCost } from '../sim/cities';
import type { Command } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { improvementDef } from '../sim/improvementData';
import { projectDef, projectRate } from '../sim/projectData';
import { type GameState, type Player, hasEndedTurn } from '../sim/state';
import { describeCard, stripRefs } from '../sim/statecraft';
import {
  type CityBaselines,
  availableTechs,
  buildingYieldDelta,
  cityBaselines,
  dequeueResearchError,
  playerScience,
  prereqsMet,
  queueTurns,
  researchError,
  researchPlan,
  researchPlanWithout,
  turnsToTech,
} from '../sim/tech';
import {
  TECH_IDS,
  type TechAge,
  type TechId,
  techAgeBands,
  techColumnCount,
  techDef,
  techColumn,
  techRowCount,
} from '../sim/techData';
import { type TechGift, techGifts } from '../sim/techUnlocks';
import type { TileYield } from '../sim/terrainData';
import { unitDef } from '../sim/unitData';
import { HAMMER, PROJECT_GLYPHS, YIELD_GLYPH, turnsLabel } from './figures';
import { setYieldText } from './yieldMark';
import { createInfoCard } from './infoCard';
import { keywordNode } from './keywords';
import { LANE_GAP_MIN, fitColumns, fitLanes } from './techFit';
import { BEAKER, researchProgress } from './researchProgress';
import { resourceMarkNode } from './resourceMark';

/**
 * ÆRA I … IV — the ages, in the numerals the specimen sets them in, and the
 * names `docs/tech-tree.md` Part 1 rules them by (the tree pass of 2026-08-30:
 * Omens · Heroes · Empire · Cathedrals; Magister arrives with its own nodes).
 */
const AGE_NUMERALS: Record<TechAge, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
const AGE_NAMES: Record<TechAge, string> = {
  1: 'Omens',
  2: 'Heroes',
  3: 'Empire',
  4: 'Cathedrals',
};

/**
 * The yield voices, in the order the city panel lists them. The glyphs are the
 * shared set (`figures.ts`) — an unlock line reads `15⚙`, exactly as the city
 * panel's buttons do, because it is literally the same glyph.
 */
const YIELD_GLYPHS: [keyof ReturnType<typeof buildingYieldDelta>, string][] = [
  ['food', YIELD_GLYPH.food],
  ['production', YIELD_GLYPH.production],
  ['gold', YIELD_GLYPH.gold],
  ['science', YIELD_GLYPH.science],
  ['culture', YIELD_GLYPH.culture],
  ['faith', YIELD_GLYPH.faith],
];

/** How a gift's mark is drawn: which class the small box beside it wears. */
const GIFT_MARK: Record<TechGift['kind'], string> = {
  unit: 'is-unit',
  building: 'is-building',
  // A project is a thing a city builds, so it wears the build mark: what
  // separates it from a building is that it repeats, and the row's own glyph
  // (↻) and note carry that.
  project: 'is-building',
  improvement: 'is-improvement',
  ability: 'is-ability',
  reveal: 'is-reveal',
  renewal: 'is-renewal',
  buildingRenewal: 'is-renewal',
  buildingTileYield: 'is-renewal',
  // A rule is not a thing, and it wears the ability mark for that reason: what
  // an empire gains here is a *verb the world does differently*, which is the
  // same kind of news as being allowed to embark.
  techEffect: 'is-ability',
};

/**
 * Which Compendium entry a gift's name points at, or `null` for a gift the
 * reference book has no page about.
 *
 * The address is the book's own (`compendiumId` — `section:id`), composed here
 * rather than imported, because the gift union is `techUnlocks.ts`'s and the
 * mapping from one to the other is a fact about *this card*. A building is on
 * one of two shelves and `isWonder` is the split, exactly as it is in the
 * describers' `buildingWords`; a renewal names the thing being renewed, which is
 * what a reader clicking it wants to read about.
 *
 * Two kinds answer `null` on purpose. A **project** has no shelf yet, and an
 * **ability** is a verb rather than a thing — "Clear Forest" is not an entry,
 * and a link that opened the wrong page would be worse than a plain word.
 */
function giftEntryId(gift: TechGift): string | null {
  switch (gift.kind) {
    case 'unit':
      return `unit:${gift.id}`;
    case 'building':
    case 'buildingRenewal':
    case 'buildingTileYield':
      return `${isWonder(gift.id) ? 'wonder' : 'building'}:${gift.id}`;
    case 'improvement':
    case 'renewal':
      return `improvement:${gift.id}`;
    case 'reveal':
      return `resource:${gift.id}`;
    case 'project':
    case 'ability':
    // A node's own rules have no shelf of their own in the book — the node does,
    // and clicking the node you are already reading is not a link.
    case 'techEffect':
      return null;
    default: {
      const unhandled: never = gift;
      void unhandled;
      return null;
    }
  }
}

/** A gift's name as a keyword, wearing the row's own class as well. */
function nameKeyword(entryId: string, name: string): HTMLElement {
  const node = keywordNode(entryId, name);
  node.classList.add('info-card-gift-name');
  return node;
}

/** The sentence each kind of gift is introduced by, in the card's list. */
const GIFT_HEADING: Record<TechGift['kind'], string> = {
  unit: 'Units',
  building: 'Buildings',
  project: 'Repeating projects',
  improvement: 'Workers may build',
  // Deliberately not "Workers may clear": the kind is a *verb* gained, and the
  // gift's own name ("Clear Forest") is where the specifics belong.
  ability: 'Workers may also',
  reveal: 'Reveals on the map',
  renewal: 'Improvements renewed',
  buildingRenewal: 'Buildings renewed',
  // Deliberately not folded in with the line above: a renewed building pays its
  // city more, and this one pays its city's *ground* more. The heading is what
  // tells a player to go and look at the map rather than at the panel.
  buildingTileYield: 'Buildings pay new ground',
  // The rules the node hands over. Deliberately not "Effects": what a player
  // gains is a change in how the world works, and `describeCard`'s own sentences
  // are what follow the heading.
  techEffect: 'Changes the rules',
};

// --- the plan, read four ways ------------------------------------------------
//
// The queue landed in the simulation as one list — `researching` and everything
// standing behind it (`researchPlan`, `src/sim/tech.ts`) — and this screen shows
// that list in three places at once: a numeral on every node that is in it, a
// line on the hover card, and the strip along the foot. All three are folds of
// the same list, and the four functions below are what they fold with, kept pure
// and exported so the rules can be asserted without a browser. Nothing here
// keeps a second opinion about the tree: `planDependants` asks the *reducer's*
// cascade what a removal would take with it, rather than walking `prereqs` a
// second time and drifting the first time that rule changes.

/**
 * Where this technology stands in the plan, counting the current research as 1,
 * or `null` for a node that is not in it at all.
 *
 * The whole of the numbered chips (user, playtest batch two: "show a numbered
 * icon clarifying what order it is in the queue"). A plan is head-first and its
 * head is what the beakers are pointed at, so 1 is always the thing being
 * researched now — which is what makes the numerals a schedule rather than a
 * list of things somebody clicked.
 */
export function planPlace(plan: readonly TechId[], techId: TechId): number | null {
  const at = plan.indexOf(techId);
  return at < 0 ? null : at + 1;
}

/**
 * Is there a *queue* here, as opposed to merely a current research?
 *
 * The user's own condition — "when a queue exists on the tech screen, show a
 * numbered icon" — and the reason it is a function rather than three `> 1`s: it
 * gates the numerals, the hover card's plan line and the strip at the foot, and
 * two of those agreeing while the third does not is a lone ① floating over a
 * node with no list anywhere to be first in.
 *
 * A plan of one is not a queue but a research, and the HUD's card at the
 * top-left has said which one since long before this screen had a strip.
 */
export function planIsQueue(plan: readonly TechId[]): boolean {
  return plan.length > 1;
}

/**
 * What else would leave the plan if this technology did — the transitive
 * dependants, in plan order.
 *
 * `dequeueResearch` drops a node **and everything behind it that only made
 * sense because of it**, so a × that promised to remove one row and removed
 * four would be the interface lying about a command it is about to send. The
 * answer is the difference between the plan and `researchPlanWithout`, which is
 * the reducer's own routine: there is no copy of the cascade here to fall out
 * of step with it.
 *
 * Empty for a technology the plan does not hold, which is also the case the ×
 * is never drawn for.
 */
export function planDependants(plan: readonly TechId[], techId: TechId): TechId[] {
  if (!plan.includes(techId)) return [];
  const kept = researchPlanWithout(plan, techId);
  return plan.filter((id) => id !== techId && !kept.includes(id));
}

/**
 * The sentence a chip's × carries: what pressing it would cost.
 *
 * Two shapes, because a player is in two different situations. Dropping the
 * last row of a plan is exactly what it looks like; dropping a row with things
 * standing on it is not, and the ones that go with it are **named** rather than
 * summarised — "and what depends on it" alone would leave the player to work out
 * which of the six chips it meant.
 */
export function dequeueTitle(plan: readonly TechId[], techId: TechId): string {
  const name = techDef(techId).name;
  const dependants = planDependants(plan, techId);
  if (dependants.length === 0) return `Removes ${name} from the plan`;
  const named = dependants.map((id) => techDef(id).name).join(', ');
  return `Removes ${name} and what depends on it: ${named}`;
}

/**
 * The command a click on a node sends: aim, or — with shift down — add.
 *
 * The unshifted form deliberately **omits `queue`** rather than writing
 * `'replace'`. An absent mode *is* replace (see `ChooseResearchCommand`), so a
 * plain click writes byte-for-byte the log entry this screen has always written
 * and every save made before the queue existed still replays against it. Shift
 * is the second destination rather than the second mind, and it is the only
 * thing on this screen that names the mode at all.
 */
export function chooseResearchCommand(
  playerId: number,
  techId: TechId,
  append: boolean,
): Command {
  return append
    ? { type: 'chooseResearch', playerId, techId, queue: 'append' }
    : { type: 'chooseResearch', playerId, techId };
}

export interface TechTree {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /** Rebuilds the chart if it is open, and always refreshes the research card. */
  render(): void;
  /** Unbinds the window listeners. See the dispose method's docblock. */
  dispose(): void;
}

export interface TechTreeOptions {
  /** The full-screen overlay. Hidden with the `hidden` attribute while closed. */
  overlay: HTMLElement;
  /**
   * The scrolling stage. Emptied and rebuilt per render; the chart's field is
   * built inside it, and this element is what pans.
   */
  chart: HTMLElement;
  /** The overlay's own × button. */
  closeButton: HTMLElement;
  /**
   * The strip along the foot of the sheet: the research plan, head first.
   *
   * Emptied and rebuilt per render, and `hidden` while the plan is one node
   * long — a strip that said "① Pottery" and nothing else would be the research
   * card's job done worse. A *sibling* of the stage rather than something
   * floating over it, so `spaceLanes` measures the height the lanes actually
   * have left; see `renderPlanStrip`.
   */
  planStrip: HTMLElement;
  /**
   * The head's caption line — normally how to travel the chart, and for a beat
   * and a half after a refused click, the reducer's own sentence.
   *
   * This screen is full-window, so the context card the rest of the game says
   * "no" in is behind it. Rather than open a second channel, the refusal takes
   * the one line in the head that is already there for saying things quietly.
   * See `refuse`.
   */
  hintLine: HTMLElement;
  /**
   * The HUD's research card (top-left, under the bar). The whole card is a
   * button: it opens this screen, and it is where what is being learnt is
   * written between visits. See `renderStatus`.
   */
  statusCard: HTMLButtonElement;
  /** The card's second line: the technology's name, or the prompt to pick one. */
  statusName: HTMLElement;
  /** The dial: its `--progress` custom property is the ring's whole story. */
  statusDial: HTMLElement;
  /** The glyph lit at the centre of the dial's sky. */
  statusGlyph: HTMLElement;
  /** The small parchment boss overlapping the dial's edge — turns left. */
  statusBoss: HTMLElement;
  /** The card's mono figures line — banked over cost. */
  statusFigures: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  /** Called after a command lands, so the rest of the page catches up. */
  onChanged: () => void;
  /**
   * A command this screen sent, and what the reducer said — accepted or not.
   *
   * `main.ts` hands it `controls.reportCommand`. Optional like `onOpen`: a page
   * that mounts the chart without a board (there is none today) simply has no
   * listener.
   */
  onCommitted?: (command: Command, result: ReturnType<typeof dispatch>) => void;
  /**
   * The chart folded away — by any of its five doors. `onOpen`'s twin; see
   * `setOpen`, which is the one place either fires.
   */
  onClose?: () => void;
  /**
   * Called as this screen opens, so whatever else was up can get out of the way.
   *
   * The same hook the HUD's popovers take, and it exists for the same reason:
   * two full-screen surfaces at the same z-index are not a layering question,
   * they are one of them being invisible. There is now a second one (the
   * Abacus), so each closes the other on the way in.
   */
  onOpen?: () => void;
}

/**
 * The chart's element builder, and — since the yield glyphs became drawn marks —
 * its yield printer.
 *
 * `setYieldText` rather than `textContent`, the same one-line change the city
 * panel made and for the same reason: every figure on this screen is composed as
 * text in `YIELD_GLYPH` (`figures.ts`) and lands here — a node's unlock lines, a
 * gift's `40⚙`, a renewal's `+1🌾`. Routing the builder leaves the composition
 * above untouched and makes an emoji impossible to reintroduce by accident.
 */
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) setYieldText(el, text);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * How long a refused choice stays in the head's caption line.
 *
 * The same beat and a half `controls.ts` gives a refused order, and typed here
 * rather than imported because the two screens share a *convention* and not a
 * module — reaching into the board's controller for a duration would be this
 * overlay depending on the surface it is drawn over.
 */
const REFUSAL_MS = 1800;

/**
 * The parts of a node card that the *state* decides, kept so that a render can
 * write over them instead of building twenty-seven new cards.
 *
 * The chart used to be rebuilt from scratch whenever anything changed, which
 * meant that aiming the beakers at a different star threw away every card, every
 * connector and both layout passes and made them again — twice over, since the
 * click's own render is followed by the host's (`onChanged`). It was slow the
 * way a screen is slow when it has to be *redrawn to be read*, and it got slower
 * with every city founded, because most of what a card costs is what it says
 * about the empire (see `unlocksFrom`).
 *
 * So a card is built once and repainted after that. What is in here is exactly
 * what can change without the chart itself changing: the researched star, the
 * "~Nt", the progress bar, the plan numeral, the refusal a screen reader hears,
 * and `choosable` — which the click handler reads *through this record* rather
 * than off a closure, because a closure would still hold the answer the card was
 * built with. Everything else on a card (its name, its glyph, its epigram, its
 * grid cell) is a fact about the tree and never moves.
 */
interface NodeFace {
  card: HTMLButtonElement;
  /** The row the researched star hangs on the end of. */
  head: HTMLElement;
  star: HTMLElement;
  /** The mono line the cost and the estimate share. */
  figures: HTMLElement;
  turns: HTMLElement;
  bar: HTMLElement;
  fill: HTMLElement;
  progress: HTMLElement;
  place: HTMLElement;
  /** The line only a screen reader hears: why this star cannot be pressed. */
  refusal: HTMLElement;
  /**
   * The unlock list. Replaced rather than repainted, because it is the one part
   * of a card whose *shape* changes with the empire — see `unlocksFrom`.
   */
  unlocks: HTMLElement;
  choosable: boolean;
}

/**
 * What one render already knows, so that twenty-seven stars do not each go and
 * ask the empire for it again.
 *
 * `rate` is the whole reason this exists. `playerScience` sums `cityYields` over
 * every city an empire holds, and the chart wanted it once per node (through
 * `turnsToTech`), once more for the current node's bar, once for the strip's
 * schedule and once for the HUD's card — thirty readings of one number, each of
 * them a sweep of the whole empire. It is now read **once**, in `beginPass`, and
 * handed down; `turnsToTech` and `queueTurns` take it as a parameter precisely so
 * that the figure on a node is still that function's own answer (hard rule 5)
 * rather than something this screen worked out beside it.
 *
 * The rest is here because it is asked of every node too and is free to carry.
 */
interface Pass {
  state: GameState;
  playerId: number;
  player: Player | undefined;
  /** Beakers a turn, read once. */
  rate: number;
  plan: readonly TechId[];
  ended: boolean;
  /**
   * Every city of this seat as things stand, filled in on the first ask.
   *
   * The unlock line under a star is `buildingYieldDelta`, which is `cityYields`
   * asked twice per city — and the first of the two, "as things stand", is the
   * same answer for every building in the sky. Hoisted, it is read once a render
   * instead of forty-two times a city.
   *
   * Lazy rather than summed in `beginPass` because most renders never look at
   * it: a repaint that carries the unlock lines over (see `unlocksFrom`) has
   * nothing to price, and building a baseline for it would put a sweep of the
   * empire back into the cheap path this pass exists to keep cheap.
   */
  baselines?: CityBaselines;
}

export function createTechTree(options: TechTreeOptions): TechTree {
  const {
    overlay,
    chart,
    closeButton,
    planStrip,
    hintLine,
    statusCard,
    statusName,
    statusDial,
    statusGlyph,
    statusBoss,
    statusFigures,
    getGame,
    localPlayerId,
    onChanged,
    onCommitted,
    onClose,
    onOpen,
  } = options;

  let open = false;
  let restoreTo: HTMLElement | null = null;
  /** Where each node card ended up, so the sight-lines can be measured. */
  const cards = new Map<TechId, HTMLButtonElement>();
  /** The mutable face of each card, so a render can repaint rather than rebuild. */
  const faces = new Map<TechId, NodeFace>();
  /**
   * Every connector and the two nodes it joins, kept because the focus mode
   * asks a question of a *line* ("is either end the node under the pointer?")
   * that the drawn `d` attribute cannot be asked. Rebuilt with the lines.
   */
  const connectors: { path: SVGPathElement; from: TechId; to: TechId }[] = [];
  /** The one SVG the connectors live in, kept so the focus mode can dim it. */
  let lines: SVGSVGElement | null = null;
  /** The node the chart is currently reading out, or none. */
  let reading: TechId | null = null;

  // --- what one render knows -----------------------------------------------

  /**
   * The pass in hand. Written by `beginPass` and by nothing else, and read by
   * every printer on this screen — the nodes, the strip, the hover card and the
   * HUD's research card, which is what stops the four of them quoting four
   * separately-summed science rates.
   */
  let pass: Pass | null = null;

  /** Opens a render. The one place `playerScience` is called on this screen. */
  function beginPass(): Pass {
    const { state } = getGame();
    const playerId = localPlayerId();
    const player = state.players[playerId];
    const plan = player ? researchPlan(player) : [];
    pass = {
      state,
      playerId,
      player,
      rate: playerScience(state, playerId),
      plan,
      ended: hasEndedTurn(state, playerId),
    };
    return pass;
  }

  /**
   * The pass, or a fresh one — for the hover card, which is raised long after
   * the render that built the star under it and has no render of its own.
   */
  function passNow(): Pass {
    return pass ?? beginPass();
  }

  /**
   * The empire as things stand, priced once for the whole unlock sweep.
   *
   * `Pass.baselines`' one filler and one reader. The `??=` is what makes the
   * claim exact: twenty-seven calls to `renderUnlocks` in a row see one map, and
   * the render after this one — a different pass — builds its own.
   */
  function baselines(): CityBaselines {
    const at = passNow();
    at.baselines ??= cityBaselines(at.state, at.playerId);
    return at.baselines;
  }

  /**
   * When the unlock lines under the stars were last priced.
   *
   * They are the expensive half of this screen by an order of magnitude: a
   * building's line is `buildingYieldDelta`, which prices *every city of the
   * empire twice*, and there are forty-odd building lines in the sky. At a dozen
   * cities that is a thousand `cityYields` calls, which is the whole of why the
   * chart got heavier the longer a game ran.
   *
   * They are also the half that nothing on this screen can change. So they are
   * carried across renders, and the question "could they have moved?" is asked
   * of the **log** rather than of the numbers: hard rule 1 says every mutation in
   * this game is a command and an accepted command is a logged command, so a log
   * that has not grown is a state that has not moved. That is deliberately the
   * bluntest possible test — it re-prices on a founding, a build, a turn, a
   * chop, anything at all — because a key that tried to name what a delta
   * *depends on* would be a second opinion about a number this screen is
   * forbidden to have one about.
   *
   * The seat is in the key because a hot-seat change is not a command, and the
   * prices are the seat's own. The state's identity is, because loading a save
   * hands over a different game whose log may be the same length.
   *
   * `keptOwnCommand` is the one exception, and it is narrow on purpose: see
   * `send`.
   */
  let unlocksFrom: { state: GameState; commands: number; playerId: number } | null = null;

  /** Records that the unlock lines are priced for the state as it now stands. */
  function markUnlocksPriced(): void {
    const game = getGame();
    unlocksFrom = { state: game.state, commands: game.log.length, playerId: localPlayerId() };
  }

  /** Whether anything at all has happened since the unlock lines were priced. */
  function unlocksAreStale(): boolean {
    const game = getGame();
    return (
      unlocksFrom === null ||
      unlocksFrom.state !== game.state ||
      unlocksFrom.commands !== game.log.length ||
      unlocksFrom.playerId !== localPlayerId()
    );
  }

  /**
   * Sends one of this screen's commands, and notes that the log grew by it.
   *
   * The **only** place this module dispatches, and that is what makes the note
   * safe. This screen sends exactly two commands — aim the beakers, drop a row
   * from the plan — and both change what is *planned* and nothing else: no
   * citizen moves, nothing is built, no technology completes, so no unlock line
   * can have changed. Counting the command in rather than re-pricing forty
   * buildings against every city is the difference between a click that lands in
   * a frame and one that thinks about it first.
   *
   * A command from anywhere else still invalidates the lines, because the log
   * will have grown by more than the ones this screen counted. **A third command
   * added to this screen inherits that claim and must be worth it** — if it can
   * change what a building would pay, it must not go through here.
   */
  function send(command: Command): ReturnType<typeof dispatch> {
    const result = dispatch(getGame(), command);
    if (result.ok && unlocksFrom) unlocksFrom.commands += 1;
    // This screen dispatches for itself (see above), so it reports for itself
    // too — `controls.reportCommand`, the same seam the board's own funnel
    // ends on. Without it a listener that watches what the player *does*
    // never hears the one command this screen exists to send.
    onCommitted?.(command, result);
    return result;
  }

  // --- saying no -----------------------------------------------------------

  /** The travel hint as the document wrote it, so a refusal can be taken back. */
  const hintText = hintLine.innerHTML;
  /** The timer that puts it back. */
  let refusalTimer = 0;

  /**
   * Speaks the reducer's own refusal, briefly, in the head's caption slot.
   *
   * Every refusal on this screen is the reducer's sentence and not this
   * module's: a node's `disabled` and a chip's × are both derived from the very
   * error functions the commands validate with, so a click that is nonetheless
   * refused means the board moved under the player — a technology finished by a
   * ruin between the render and the press. That is rare and it is *news*, so it
   * is said rather than swallowed, which is what the old `if (!ok) return` did.
   *
   * The caption slot rather than the context card at the bottom of the screen
   * for the plainest of reasons: this overlay covers that card. `NOTICE_MS`
   * matches `controls.ts` so a "no" lasts the same beat and a half wherever the
   * player meets one.
   */
  function refuse(text: string): void {
    hintLine.textContent = text;
    hintLine.classList.add('is-refusing');
    window.clearTimeout(refusalTimer);
    refusalTimer = window.setTimeout(() => {
      hintLine.innerHTML = hintText;
      hintLine.classList.remove('is-refusing');
    }, REFUSAL_MS);
  }

  /**
   * Light one node's dependencies and hush everything else.
   *
   * Three writes and no layout: the SVG takes a class that dims every line
   * *not* marked, the node's own lines take that mark, and the nodes at the far
   * ends take a ring — `is-prereq` for what it waits on, `is-heir` for what
   * waits on it. `null` puts the sky back.
   *
   * Idempotent by the early return, because a pointer crossing a card's border
   * raises enter and leave in pairs and a card that re-lit on every one of them
   * would flicker.
   */
  function readNode(id: TechId | null): void {
    if (reading === id) return;
    reading = id;
    lines?.classList.toggle('is-reading', id !== null);
    for (const { path, from, to } of connectors) {
      path.classList.toggle('is-lit', id !== null && (from === id || to === id));
    }
    const needs = id === null ? [] : techDef(id).prereqs;
    for (const [other, card] of cards) {
      card.classList.toggle('is-prereq', needs.includes(other));
      card.classList.toggle('is-heir', id !== null && techDef(other).prereqs.includes(id));
    }
  }

  // --- one node ------------------------------------------------------------

  /**
   * The small marks under a node's name: what it hands over.
   *
   * A unit wears its own glyph — the same letter the board draws on its disc —
   * and a building wears the voice it speaks in, followed by what it would be
   * worth to this empire right now.
   */
  function renderUnlocks(id: TechId): HTMLElement {
    const { state, playerId } = passNow();
    const list = element('ul', 'tech-unlocks');
    const { units = [], buildings = [] } = techDef(id).unlocks;

    for (const unit of units) {
      const def = unitDef(unit);
      const row = element('li');
      row.append(element('span', 'tech-mark is-unit', def.glyph));
      row.append(element('span', 'tech-unlock-name', def.name));
      // Priced for *this* player, through the simulation's own evaluator: a
      // settler quoted here is quoted at what the next one would actually cost.
      row.append(
        element(
          'span',
          'tech-unlock-note',
          `${unitProductionCost(state, playerId, unit)}${HAMMER}`,
        ),
      );
      list.append(row);
    }

    for (const building of buildings) {
      const def = buildingDef(building);
      const row = element('li');
      row.append(element('span', 'tech-mark is-building', '▣'));
      row.append(element('span', 'tech-unlock-name', def.name));

      // Entry VIII: the actual computed delta, for the cities this player has
      // today. An empire with nowhere to build it says only what it costs.
      const delta = buildingYieldDelta(state, playerId, building, baselines());
      const parts = YIELD_GLYPHS.filter(([key]) => delta[key] !== 0).map(
        ([key, glyph]) => `${delta[key] > 0 ? '+' : ''}${delta[key]}${glyph}`,
      );
      row.append(
        element(
          'span',
          parts.length > 0 ? 'tech-unlock-note is-delta' : 'tech-unlock-note',
          parts.length > 0 ? `${parts.join(' ')} now` : `${def.cost}${HAMMER}`,
        ),
      );
      list.append(row);
    }
    return list;
  }

  /**
   * The note that comes up beside a node. `is-night` is the whole difference
   * from the city screen's card: this screen is the one deliberately dark
   * surface in a light interface, and a parchment card glaring over the sky
   * would undo the reason it is dark.
   */
  const info = createInfoCard({ className: 'info-card is-night', sticky: true });

  /**
   * What a renewal is worth, written as the delta it is: `+1🌾`, and the
   * condition when it has one. Improvements pay in the three tile yields only,
   * so the row is those three and never the five.
   */
  function tileYieldNote(add: TileYield): string {
    const parts: string[] = [];
    if (add.food !== 0) parts.push(`${add.food > 0 ? '+' : ''}${add.food}${YIELD_GLYPH.food}`);
    if (add.production !== 0) {
      parts.push(`${add.production > 0 ? '+' : ''}${add.production}${HAMMER}`);
    }
    if (add.gold !== 0) parts.push(`${add.gold > 0 ? '+' : ''}${add.gold}${YIELD_GLYPH.gold}`);
    return parts.join(' ');
  }

  function renewalNote(gift: TechGift & { kind: 'renewal' }): string {
    const delta = tileYieldNote(gift.add);
    return gift.requiresFreshwater ? `${delta} on fresh water` : delta;
  }

  /**
   * What an ability is worth, in the same three voices — with `once` on the end,
   * because that single word is the whole difference between a chop and a farm
   * and the card would otherwise read as though the forest paid every turn.
   */
  function abilityNote(gift: TechGift & { kind: 'ability' }): string {
    // A verb that banks nothing says nothing about banking: Sailing's embark
    // gift has no `pays`, and the card's own name ("Embark") is the sentence.
    return gift.pays ? `${tileYieldNote(gift.pays)} once` : '';
  }

  /**
   * The same sentence for a building renewal, which pays in six voices rather
   * than three — a building can hand a city beakers, culture and faith, and an
   * improvement never can. Written off the delta's *present* fields, so a
   * renewal that says only `{food: 1}` reads as `+1🌾` and not as four zeroes.
   */
  function buildingRenewalNote(gift: TechGift & { kind: 'buildingRenewal' }): string {
    const add = gift.add;
    const parts: string[] = [];
    const voices: [number | undefined, string][] = [
      [add.food, YIELD_GLYPH.food],
      [add.production, HAMMER],
      [add.gold, YIELD_GLYPH.gold],
      [add.science, YIELD_GLYPH.science],
      [add.culture, YIELD_GLYPH.culture],
      [add.faith, YIELD_GLYPH.faith],
    ];
    for (const [value, glyph] of voices) {
      if (value === undefined || value === 0) continue;
      parts.push(`${value > 0 ? '+' : ''}${value}${glyph}`);
    }
    if (add.sciencePerPop) {
      parts.push(`${add.sciencePerPop > 0 ? '+' : ''}${add.sciencePerPop}${YIELD_GLYPH.science}/pop`);
    }
    return parts.join(' ');
  }

  /**
   * What a node's own rules do, in the vocabulary the rest of the game already
   * words cards in.
   *
   * `describeCard` (`statecraft.ts`) is the one describer for a card, and a
   * technology **is** a card now (`CardId`'s ninth class), so the node's rules
   * are asked of it by id rather than a second table being written — the same
   * bargain every card screen keeps: a shape that grows a clause grows it once.
   * `stripRefs` because this is a plain span and not a `setDescriptorText`
   * surface, and a raw `[[` on any surface is what the sweep forbids.
   */
  function techEffectNote(gift: TechGift & { kind: 'techEffect' }): string {
    return describeCard(gift.id)
      .map((clause) => stripRefs(clause.text))
      .filter((text) => text.length > 0)
      .join(' · ');
  }

  /**
   * The whole of what a node hands over, which is more than a node card holds.
   *
   * The card in the chart lists the units and buildings, because those are what
   * a player is usually shopping for. This says the rest: the resources the
   * technology reveals (`isResourceVisible` — the ore was always in the ground,
   * and from the moment it is named it is also worth something, on the board and
   * in the panel), and the improvements already on the ground that quietly start
   * paying more. Both are gifts nobody would otherwise find out about except by
   * noticing a number had changed.
   *
   * Every figure in it comes from an evaluator that already exists —
   * `techGifts` for what, `unitProductionCost` for what a unit costs *this*
   * player, `turnsToTech` for the schedule — so this card cannot promise a
   * number some other surface disagrees with.
   */
  function techCard(id: TechId): Node {
    const { state, playerId, player, rate } = passNow();
    const def = techDef(id);
    const researched = player?.techsResearched.includes(id) ?? false;
    const box = element('div');

    const head = element('div', 'info-card-head');
    const name = element('span', 'info-card-name');
    name.append(element('span', 'info-card-glyph', def.glyph));
    name.append(document.createTextNode(def.name));
    head.append(name);
    head.append(
      element('span', 'info-card-kind', `ÆRA ${AGE_NUMERALS[def.age]} · ${AGE_NAMES[def.age]}`),
    );
    box.append(head);

    const figures = element('div', 'info-card-figures');
    figures.append(element('span', 'info-card-cost', `${def.cost}${BEAKER}`));
    // A researched node has no schedule left to quote; everything else is
    // measured against the pool, which is what makes the estimate on a node
    // three columns away an honest answer to "and if I went for that instead?".
    if (!researched) {
      figures.append(
        element('span', 'info-card-turns', turnsLabel(turnsToTech(state, playerId, id, rate))),
      );
      figures.append(element('span', 'info-card-rate', `+${rate}${BEAKER}/t`));
    }
    box.append(figures);

    // The state of the node in one line: done, in hand, or the reducer's own
    // sentence about why not. `researchError` is the same function the node's
    // `disabled` is derived from, so the card and the card's button agree.
    const problem = researchError(state, playerId, id);
    if (researched) {
      box.append(element('p', 'info-card-state', 'Researched'));
    } else if (player?.researching === id) {
      const progress = researchProgress(player.sciencePool, def.cost, rate);
      box.append(
        element('p', 'info-card-state', `Being researched · ${progress.banked}/${progress.cost}`),
      );
    } else if (problem) {
      box.append(element('p', 'info-card-state is-blocked', problem));
    }

    // "3 in the plan · ~11 turns" — what the corner numeral means, spelled out
    // where there is room for words. The schedule is `queueTurns`, which is the
    // *cumulative* reading (the third node is paid for by what is left after the
    // first two, and no more than one technology lands per turn), so this is the
    // turn the plan actually delivers it on rather than the turn it would land
    // if the beakers were pointed at it alone — which is what the `~Nt` on the
    // node's own figures line already says.
    if (player && planIsQueue(researchPlan(player))) {
      const steps = queueTurns(state, playerId, rate);
      const at = steps.findIndex((step) => step.techId === id);
      if (at >= 0) {
        // An empire making no science has no schedule at all, and "~null turns"
        // is the shape of bug this says a sentence about instead.
        const turns = steps[at]!.turns;
        const when = turns === null ? 'no science being made' : `~${turns} turns`;
        box.append(element('p', 'info-card-state is-planned', `${at + 1} in the plan · ${when}`));
      }
    }

    const gifts = techGifts(id);
    if (gifts.length === 0) {
      box.append(element('p', 'info-card-state', 'Hands over nothing on its own'));
    }
    let heading: TechGift['kind'] | null = null;
    let list: HTMLElement | null = null;
    for (const gift of gifts) {
      if (gift.kind !== heading) {
        heading = gift.kind;
        box.append(element('p', 'info-card-heading', GIFT_HEADING[gift.kind]));
        list = element('ul', 'info-card-gifts');
        box.append(list);
      }
      const row = element('li');
      // A reveal names a *resource*, and this interface draws its resources
      // (`src/ui/resourceMark.ts`). Every other gift keeps the glyph its own
      // table declares — `techGifts` still hands over the row's `emoji`, which
      // is the fallback the mark falls back *to*, so a resource nobody has
      // drawn still arrives with something in the box.
      const mark = element('span', `info-card-mark ${GIFT_MARK[gift.kind]}`);
      if (gift.kind === 'reveal') mark.append(resourceMarkNode(gift.id));
      else setYieldText(mark, gift.glyph);
      row.append(mark);
      // **The one card whose keywords are live** (user ruling, 2026-08-28): the
      // card is sticky, so a pointer can reach the name and the Compendium can
      // be opened on it. A gift the book has no shelf for — a project, an
      // ability — is a plain span, because a dead link is worse than none.
      const entry = giftEntryId(gift);
      row.append(
        entry === null
          ? element('span', 'info-card-gift-name', gift.name)
          : nameKeyword(entry, gift.name),
      );
      // Units are priced through the simulation's own evaluator; buildings
      // quote their flat cost; a project quotes its *rate*, because a
      // repeatable item has no total; an improvement quotes the charges it
      // spends;
      // a reveal, an ability and the two renewals cost nothing at all, so the
      // ability and the renewals say what they *pay* instead and the reveal
      // says nothing.
      const note =
        gift.kind === 'unit'
          ? `${unitProductionCost(state, playerId, gift.id)}${HAMMER}`
          : gift.kind === 'building'
            ? `${buildingDef(gift.id).cost}${HAMMER}`
            : gift.kind === 'project'
              ? `${projectDef(gift.id).cost}${HAMMER} → ${projectRate(gift.id, PROJECT_GLYPHS)}`
            : gift.kind === 'improvement'
              ? `${improvementDef(gift.id).chargeCost} charge`
              : gift.kind === 'ability'
                ? abilityNote(gift)
                : gift.kind === 'renewal'
                  ? renewalNote(gift)
                  : gift.kind === 'buildingRenewal'
                    ? buildingRenewalNote(gift)
                    : gift.kind === 'techEffect'
                      ? techEffectNote(gift)
                      : '';
      if (note) row.append(element('span', 'info-card-gift-note', note));
      list?.append(row);
    }

    if (def.flavor) box.append(element('p', 'info-card-flavor', def.flavor));
    return box;
  }

  /**
   * Puts a mark on a card or takes it off, and does nothing when it is already
   * where it belongs.
   *
   * A node's face is a handful of marks that come and go — the researched star,
   * the estimate, the bar, the numeral, the refusal — and repainting means
   * asking about each of them rather than throwing the card away. `before` is
   * where the mark goes back in, so the order the card reads in is fixed by the
   * *call*, not by the order things happened to be added in.
   */
  function mark(el: HTMLElement, parent: HTMLElement, on: boolean, before?: Node | null): void {
    if (!on) {
      if (el.parentNode === parent) parent.removeChild(el);
      return;
    }
    if (el.parentNode !== parent) parent.insertBefore(el, before ?? null);
  }

  /** `el` if it is where a `mark` could insert before it, and `null` if not. */
  function inside(el: HTMLElement, parent: HTMLElement): Node | null {
    return el.parentNode === parent ? el : null;
  }

  /**
   * Everything about a star that the *state* decides, written onto a card that
   * already exists.
   *
   * The other half of `renderNode`, split out when the chart stopped rebuilding
   * itself on every click. Nothing here creates an element or reads the
   * document; it is class toggles, text and five marks moving in and out.
   */
  function paintNode(id: TechId, face: NodeFace): void {
    const { state, playerId, player, rate, plan, ended } = passNow();
    const def = techDef(id);
    const card = face.card;

    const researched = player?.techsResearched.includes(id) ?? false;
    const current = player?.researching === id;
    const place = planIsQueue(plan) ? planPlace(plan, id) : null;
    // Two readings of the same click, because there are two clicks: a plain one
    // aims the beakers (and queues whatever the target needs), a shifted one
    // adds to what is already lined up. Both are `researchError`, which is what
    // the reducer validates with, so a node this screen lets you press either
    // way is a node the reducer accepts that way.
    const problem = researchError(state, playerId, id);
    const appendProblem = researchError(state, playerId, id, 'append');
    const choosable = !ended && (problem === null || appendProblem === null);
    // Read by the click handler through this record rather than off a closure:
    // the card outlives the render that built it now, so a captured answer would
    // be the answer this star had the first time it was drawn.
    face.choosable = choosable;

    card.classList.toggle('is-researched', researched);
    card.classList.toggle('is-current', current);
    // **Locked is a fact about the tree, not about the command.** It used to
    // be `researchError !== null`, which was the same question until the queue
    // landed: pointing at a distant node stopped being a refusal (it queues the
    // prerequisites instead), so that reading quietly stopped dimming anything
    // at all and the chart lost the one mark that says how far off a node is.
    // `prereqsMet` is the question that was always meant.
    card.classList.toggle('is-locked', !researched && !current && !prereqsMet(state, playerId, id));
    // A node standing in the plan is lit whatever its prerequisites say: the
    // player has already decided about it, and a decision should not be drawn
    // in the same grey as ground nobody has looked at.
    card.classList.toggle('is-planned', place !== null);
    card.disabled = !choosable;

    mark(face.star, face.head, researched);

    // Cost, and what it would take from here. The pool pays for whichever node
    // it is aimed at, so "~N turns" is honest for a node that is not current.
    // The rate is the pass's — one sum of the empire, not one per star.
    const turns = turnsToTech(state, playerId, id, rate);
    setYieldText(face.turns, turns === null ? '—' : `~${turns}t`);
    mark(face.turns, face.figures, !researched);

    if (current && player) {
      // The same arithmetic the HUD's research card draws, from the same
      // helper: the bar on this node and the bar at the top-left of the screen
      // are one fact shown twice, and they must never round differently.
      const progress = researchProgress(player.sciencePool, def.cost, rate);
      face.fill.style.width = `${(progress.fraction * 100).toFixed(1)}%`;
      setYieldText(face.progress, `${progress.banked} / ${progress.cost}`);
    }
    // In front of the unlock list, which is where they were built: the bar reads
    // as part of the node's figures and the list as what the figures buy.
    mark(face.bar, card, current && player !== undefined, face.unlocks);
    mark(face.progress, card, current && player !== undefined, face.unlocks);

    // The numeral, worn on the card's *corner* rather than set inside it: it is
    // a mark about the node — its place in a list that lives somewhere else —
    // and a figure in the body would read as one more of the node's own numbers.
    // Absolutely placed, so renumbering (a dequeue cascades, and several can
    // vanish at once) never reflows a lane, and appended last for the same
    // reason the refusal below is: the card is read out before it is annotated.
    if (place !== null) {
      setYieldText(face.place, String(place));
      // Spoken as a sentence, because "3" alone beside a technology's name is
      // the one thing on this card a screen reader cannot make sense of.
      face.place.setAttribute('aria-label', `${place} in the research plan`);
    }
    // In front of the refusal when there is one, so the two annotations keep the
    // order they are read in however they arrived: the numeral is a mark about
    // the star, the refusal is the last word about it.
    mark(face.place, card, place !== null, inside(face.refusal, card));

    // Every disabled node says why, in the reducer's own words where there are
    // any: a star you cannot press and cannot ask about is a dead end.
    //
    // It stopped being a `title` when the hover card landed. The card says the
    // same sentence instantly and in this screen's own voice, and a native
    // tooltip would have arrived a second later, on top of it, saying less. So
    // the sentence is carried by a line only a screen reader reads — appended
    // to the card's own content rather than replacing it with an `aria-label`,
    // because a node's cost and its unlocks are worth hearing too. Last, so it
    // is heard after the node has been read out rather than before it has been
    // named.
    const refusal = problem ?? (choosable ? null : `You have ended turn ${state.turn}`);
    face.refusal.textContent = refusal ?? '';
    mark(face.refusal, card, refusal !== null);
  }

  /**
   * Builds one star: the half of a node that never changes, and one repaint.
   *
   * Everything the tree itself decides — the glyph, the name, the cost, the
   * epigram — is written once here. Everything the *state* decides is
   * `paintNode`'s, and the marks it moves are created here whether or not this
   * particular star wears one today, so that a repaint has something to put back.
   */
  function renderNode(id: TechId): HTMLElement {
    const def = techDef(id);

    const card = element('button', 'tech-node');
    card.type = 'button';

    const head = element('div', 'tech-node-head');
    // Glyph and name are one group, so `space-between` still puts only the
    // star (when there is one) at the far end rather than fanning three
    // children evenly across the row.
    const title = element('span', 'tech-node-title');
    title.append(element('span', 'tech-node-glyph', def.glyph));
    title.append(element('span', 'tech-node-name', def.name));
    head.append(title);
    card.append(head);
    const star = element('span', 'tech-node-star', '✦');
    star.setAttribute('aria-hidden', 'true');

    const figures = element('div', 'tech-node-figures');
    figures.append(element('span', 'tech-node-cost', `${def.cost}${BEAKER}`));
    card.append(figures);
    const turns = element('span', 'tech-node-turns');

    const bar = element('div', 'tech-bar');
    const fill = element('div', 'tech-bar-fill');
    bar.append(fill);
    const progress = element('div', 'tech-node-progress');

    const unlocks = renderUnlocks(id);
    card.append(unlocks);
    if (def.flavor) card.append(element('p', 'tech-node-flavor', def.flavor));

    const face: NodeFace = {
      card,
      head,
      star,
      figures,
      turns,
      bar,
      fill,
      progress,
      place: element('span', 'tech-node-place'),
      refusal: element('span', 'sr-only'),
      unlocks,
      choosable: false,
    };
    faces.set(id, face);
    paintNode(id, face);

    // Two gestures, one command. A plain click *aims* — the target's
    // unresearched prerequisites come with it and the whole list becomes the
    // plan — and a shifted one *adds*, keeping what is already lined up. Both
    // are the user's own words for the feature ("clicking a technology that
    // can't be researched will auto-queue all prerequisites. Holding shift will
    // add more technologies to the queue"), and neither is a lesson in the tree:
    // the expansion is `researchExpansion`'s, made by the reducer.
    card.addEventListener('click', (event) => {
      // `face.choosable` and not the answer this card was built with: the card
      // outlives its render now, so the closure would be a stale permission.
      if (!face.choosable) return;
      const result = send(chooseResearchCommand(localPlayerId(), id, event.shiftKey));
      if (!result.ok) {
        // The board moved under the click — say so rather than swallowing it.
        refuse(result.error);
        return;
      }
      // The card that was clicked is still the card that is there — the chart is
      // repainted rather than rebuilt — so the keyboard stays where the player
      // put it and nothing needs handing back.
      render();
      onChanged();
    });

    // Hover, on a node that may well be disabled. A disabled button raises no
    // pointer events in some browsers, so the card is bound and the reading it
    // gives is the whole point of a locked node: a chart you cannot read is not
    // a chart, and `pointer-events: auto` on `.tech-node:disabled` is what lets
    // this fire. It never traps the pointer — see `infoCard.ts`.
    info.bind(card, () => techCard(id));

    // The focus mode, on the same four moments the hover card would use if it
    // took the keyboard: a chart you can only read with a mouse is a chart half
    // the players cannot read. `focus`/`blur` rather than `focusin`/`focusout`
    // because a node card has no focusable children to bubble from.
    card.addEventListener('pointerenter', () => readNode(id));
    card.addEventListener('pointerleave', () => readNode(null));
    card.addEventListener('focus', () => readNode(id));
    card.addEventListener('blur', () => readNode(null));

    cards.set(id, card);
    return card;
  }

  // --- the chart -----------------------------------------------------------

  /** The field the cards are placed on, kept so measurement has an origin. */
  let field: HTMLElement | null = null;

  // --- the plan strip ------------------------------------------------------

  /**
   * The plan along the foot of the sheet, head first: "① Earthenware ~3t ×".
   *
   * The third fold of `researchPlan` on this screen, and the one that answers a
   * question the chart cannot: the numerals on the nodes say *which* order, and
   * this says the order itself, in one line, without the player having to find
   * six stars scattered over four columns to read it.
   *
   *   · **The schedule is `queueTurns`**, not `turnsToTech` per row. The costs
   *     accumulate against one pool and at most one technology lands per turn,
   *     so a per-node reading would promise the whole plan arriving at once.
   *   · **Every × carries what it would take with it** (`dequeueTitle`), because
   *     `dequeueResearch` cascades and a button that removed four rows having
   *     said it would remove one is a button nobody presses twice.
   *   · **A × is greyed with the reducer's own sentence** — `dequeueResearchError`
   *     — for the same reason every other control in this game is.
   *
   * Hidden while the plan is one node long, which is the state every game
   * starts in and returns to: a strip holding only what the research card at
   * the top-left already says would be a second readout of one fact. Hiding is
   * the `hidden` attribute on a flex sibling of the stage, so the height goes
   * back to the lanes — which is why this is called *before* `spaceLanes` runs.
   */
  function renderPlanStrip(): void {
    const { state, playerId, rate, plan, ended } = passNow();
    const steps = queueTurns(state, playerId, rate);

    planStrip.replaceChildren();
    planStrip.hidden = !planIsQueue(plan);
    if (planStrip.hidden) return;

    planStrip.append(element('span', 'tech-plan-label', 'the plan'));
    const list = element('ol', 'tech-plan-list');
    for (const [index, step] of steps.entries()) {
      const def = techDef(step.techId);
      const chip = element('li', 'tech-plan-chip');
      chip.append(element('span', 'tech-plan-place', String(index + 1)));
      chip.append(element('span', 'tech-plan-name', def.name));
      // "~5t", in the node figures' own idiom — a tilde because it is an
      // estimate at the current rate, and an em dash for an empire making no
      // science at all, which has no schedule rather than a long one.
      chip.append(
        element('span', 'tech-plan-turns', step.turns === null ? '—' : `~${step.turns}t`),
      );

      const drop = element('button', 'tech-plan-drop', '✕');
      drop.type = 'button';
      const blocked = ended
        ? `You have ended turn ${state.turn}`
        : dequeueResearchError(state, playerId, step.techId);
      drop.disabled = blocked !== null;
      drop.title = blocked ?? dequeueTitle(plan, step.techId);
      drop.setAttribute('aria-label', drop.title);
      drop.addEventListener('click', () => {
        const command: Command = {
          type: 'dequeueResearch',
          playerId,
          techId: step.techId,
        };
        const result = send(command);
        if (!result.ok) {
          refuse(result.error);
          return;
        }
        render();
        // The chip that was pressed is gone and so, often, are the ones behind
        // it — a cascade can empty half the strip. The keyboard goes to whatever
        // now stands in its place, or to the row's end, or out of the strip
        // entirely once the plan is back to one node.
        const drops = planStrip.querySelectorAll<HTMLButtonElement>('.tech-plan-drop');
        (drops[Math.min(index, drops.length - 1)] ?? closeButton).focus();
        onChanged();
      });
      chip.append(drop);
      list.append(chip);
    }
    planStrip.append(list);
  }

  /**
   * The whole sky, from nothing: twenty-seven cards, the age washes, the
   * connector SVG, and two full layout passes over all of it.
   *
   * **Called when the chart is opened and on nothing else.** It used to run on
   * every accepted command too, which is what made this screen slow: a click on
   * a star threw away every card and every connector and made them again — and
   * then the host's own refresh (`onChanged`) did it a second time. What a
   * command changes is a handful of classes and figures, and `refreshNodes` is
   * what writes those onto the cards that are already there.
   */
  function renderChart(): void {
    // A rebuild is not a journey: a fresh chart is measured from wherever the
    // stage was left, and one that snapped back to column zero would make the
    // player find their place again for nothing.
    const wasAt = { left: chart.scrollLeft, top: chart.scrollTop };

    // Before anything is measured. The strip is a flex sibling of the stage, so
    // it appearing or going takes real height off `chart.clientHeight` — and
    // `spaceLanes` below spends exactly that height on the lanes.
    renderPlanStrip();

    // Every node is about to be replaced, so an open card would be left
    // pointing at a star that no longer exists. Same reason the city panel
    // does it — see `infoCard.ts`.
    info.hide();
    cards.clear();
    faces.clear();
    // Both indexes point at elements that are about to be thrown away, and
    // `reading` at a card that will not exist — cleared here rather than through
    // `readNode(null)`, which would spend three passes tidying the dead.
    connectors.length = 0;
    reading = null;
    const columns = techColumnCount();
    const rows = techRowCount();

    const built = element('div', 'tech-field');
    // The tracks are written from the data rather than from CSS: the chart is
    // exactly as wide as the deepest chain and as deep as the lanes in use, and
    // both are facts `techData` owns.
    built.style.gridTemplateColumns = `repeat(${columns}, var(--tech-col-w))`;
    // The first track is the age strip; the lanes follow it.
    built.style.gridTemplateRows = `min-content repeat(${rows}, min-content)`;

    // ÆRA I/II/III, painted behind whichever columns their techs settled in.
    // Each age is two pieces: a region spanning every lane, which carries the
    // watermark numeral and the hairline seam where the age changes, and a
    // label in the strip along the top. The age no longer says where a tech
    // goes — it says what to call the ground the tech ended up on.
    for (const [index, band] of techAgeBands().entries()) {
      const span = `${band.from + 1} / ${band.to + 2}`;

      const region = element('div', 'tech-age');
      region.classList.toggle('is-seam', index > 0);
      region.style.gridColumn = span;
      region.style.gridRow = '1 / -1';
      region.setAttribute('aria-hidden', 'true');
      region.append(element('span', 'tech-age-numeral', AGE_NUMERALS[band.age]));
      built.append(region);

      const label = element('div', 'tech-age-label');
      label.style.gridColumn = span;
      label.style.gridRow = '1';
      label.append(element('span', 'tech-era', `ÆRA ${AGE_NUMERALS[band.age]}`));
      label.append(element('span', 'tech-era-name', AGE_NAMES[band.age]));
      built.append(label);
    }

    const drawn = document.createElementNS(SVG_NS, 'svg');
    drawn.setAttribute('class', 'tech-lines');
    drawn.setAttribute('aria-hidden', 'true');
    built.append(drawn);
    lines = drawn;

    for (const id of TECH_IDS) {
      const card = renderNode(id);
      card.style.gridColumn = String(techColumn(id) + 1);
      card.style.gridRow = String(techDef(id).row + 2); // past the age strip
      built.append(card);
    }

    field = built;
    chart.replaceChildren(built);
    chart.scrollLeft = wasAt.left;
    chart.scrollTop = wasAt.top;

    // Measured twice, and both are deliberate. Reading `offsetLeft` flushes
    // layout, so the first pass draws lines that are already correct for this
    // paint; the second catches the reflow when a web font finishes loading and
    // every card changes height under them. (A background tab never runs the
    // second, which is exactly right — and why the first is not an animation
    // frame: `requestAnimationFrame` does not fire in a hidden tab at all.)
    //
    // The columns are sized before the lanes are spaced, and the lanes before
    // the lines are drawn, in both passes and in that order. Each step moves
    // what the next one measures: a wider column re-wraps every card's title and
    // therefore changes how tall the lanes are, and the gap between lanes moves
    // every card, so a connector measured before either would be drawn to where
    // the card used to be.
    spaceColumns(built, columns);
    spaceLanes(built, rows);
    drawLines(drawn);
    requestAnimationFrame(() => {
      spaceColumns(built, columns);
      spaceLanes(built, rows);
      drawLines(drawn);
    });
    // The unlock lines under these cards are priced for the state that built
    // them; see `unlocksFrom` for what that buys and when it is given up.
    markUnlocksPriced();
  }

  /**
   * The chart that is already on the screen, brought up to date in place.
   *
   * `renderChart`'s counterpart and the path every state change takes while the
   * sky is up. Nothing is created and nothing is thrown away: each card is
   * repainted (`paintNode`), and the connectors are re-lit off what is now held.
   *
   * The unlock lines are the exception, and they are why this is worth doing at
   * all — they are what a card mostly *costs* (`unlocksFrom`), and they are
   * rebuilt only when something has actually happened to the empire.
   *
   * The lanes are re-spaced and the lines redrawn afterwards because a card's
   * *height* really can change here: the progress bar moves from the star that
   * was being researched to the one that now is. One pass rather than the two
   * with a frame between that a fresh chart needs — nothing is being waited on,
   * the cards are already laid out and only their contents moved.
   */
  function refreshNodes(): void {
    // An open card would be quoting the state before the command; it is taken
    // down rather than re-derived, exactly as a rebuild used to take it down.
    info.hide();
    const reprice = unlocksAreStale();
    for (const id of TECH_IDS) {
      const face = faces.get(id);
      if (!face) continue;
      paintNode(id, face);
      if (!reprice) continue;
      const list = renderUnlocks(id);
      face.card.replaceChild(list, face.unlocks);
      face.unlocks = list;
    }
    if (reprice) markUnlocksPriced();
    if (field) spaceLanes(field, techRowCount());
    if (lines) drawLines(lines);
  }

  /**
   * Fit the columns to the window: `fitColumns` decides, this measures for it.
   *
   * The sideways half of `spaceLanes`, and it landed for the same kind of report
   * — the chart looked wrong on a big display (user, 2026-08-27) because the
   * column width was a constant in the stylesheet and eight of them stopped
   * short of a 2560px window by four hundred pixels, leaving the age washes
   * ending mid-screen with night to their right.
   *
   * `clientWidth` is the stage's *content* box, which is what the field has to
   * fit in, and the field's own horizontal padding is subtracted because that
   * padding is inside the field rather than beside it. The gutter is read off
   * the computed style rather than typed here, so the stylesheet stays the one
   * place a gutter is decided (`--tech-col-gap`) — the arithmetic only spends
   * what it is told.
   *
   * The slack goes to the *stylesheet* as a flag, not as a length: whether a
   * chart that has hit its cap is centred is a question about alignment, and
   * alignment is CSS's job. `is-roomy` is the whole of that hand-off.
   */
  function spaceColumns(built: HTMLElement, columns: number): void {
    const style = window.getComputedStyle(built);
    const gap = Number.parseFloat(style.columnGap) || 0;
    const padding =
      (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const fit = fitColumns(chart.clientWidth - padding, columns, gap);
    built.style.setProperty('--tech-col-w', `${fit.width}px`);
    built.classList.toggle('is-roomy', fit.slack > 0);
  }

  /**
   * Fit the lanes to the window: `fitLanes` decides, this measures for it.
   *
   * The lanes' own height is taken with the gaps closed to their minimum, which
   * is the only way to ask "how tall are the cards" of a grid whose gaps are
   * the thing being chosen. Reading `scrollHeight` flushes layout, so this is
   * one forced reflow rather than a frame's wait — the same bargain `drawLines`
   * makes, and for the same reason: the chart must be right on the paint the
   * player is already looking at.
   *
   * `gaps` is the lane count, not one less: the age strip is a track too, so a
   * five-lane chart has five gaps under six tracks.
   */
  function spaceLanes(built: HTMLElement, rows: number): void {
    const lanesOnly = (): number => {
      built.style.setProperty('--tech-row-gap', `${LANE_GAP_MIN}px`);
      // `offsetHeight` and not `scrollHeight`: the connector SVG is an absolute
      // child of this element and is sized *from* the field's own extent, so
      // asking for the scroll extent asks a question whose answer includes last
      // frame's answer — the chart would climb a little every time it was
      // measured and talk itself into a scrollbar it did not need.
      return built.offsetHeight - LANE_GAP_MIN * rows;
    };

    // Closed up first, then — only if that was not enough — the epigrams go.
    // A chart that will not fit gives up its flavour before it gives up a lane:
    // the epigram is on the hover card too and the name, the cost and the
    // unlocks are not, so it is the one line on a node that is said twice. On a
    // tall window the class comes straight back off, which is why the state is
    // recomputed from scratch here rather than latched.
    built.classList.remove('is-compact');
    let content = lanesOnly();
    if (fitLanes(chart.clientHeight, content, rows).overflow > 0) {
      built.classList.add('is-compact');
      content = lanesOnly();
    }
    const { gap } = fitLanes(chart.clientHeight, content, rows);
    built.style.setProperty('--tech-row-gap', `${gap}px`);
  }

  /**
   * One dotted connector per prerequisite, from the right edge of the earlier
   * node to the left edge of the later one.
   *
   * The curve is a cubic with horizontal handles, so it leaves and arrives flat
   * and a node on the same lane as its prerequisite gets a straight sight-line;
   * the handles are capped, so a connector that spans four columns bends near
   * its ends rather than sagging through the middle of the chart. Because
   * `techDepth` puts every prerequisite in a strictly earlier column, `x2` is
   * always to the right of `x1` and no connector ever doubles back.
   *
   * The SVG sits *behind* the cards, so a line disappears under the two nodes
   * it joins and reads as a sight-line between stars rather than as an arrow.
   */
  function drawLines(svg: SVGSVGElement): void {
    const origin = field;
    if (!origin) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // The field's own box, not its scroll extent: this SVG is an absolute child
    // of the field and sizing it from the scroll extent would make it one of the
    // things being measured — each pass a few pixels larger than the last.
    const width = origin.offsetWidth;
    const height = origin.offsetHeight;
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const { state } = getGame();
    const player = state.players[localPlayerId()];
    // The index is rebuilt with the paths, never appended to: `drawLines` runs
    // twice per render (see `renderChart`), and an index that grew would light
    // each line twice and leak the first pass's dead nodes.
    connectors.length = 0;
    for (const id of TECH_IDS) {
      const to = cards.get(id);
      if (!to) continue;
      const x2 = to.offsetLeft;
      const y2 = to.offsetTop + to.offsetHeight / 2;
      for (const prereq of techDef(id).prereqs) {
        const from = cards.get(prereq);
        if (!from) continue;
        const x1 = from.offsetLeft + from.offsetWidth;
        const y1 = from.offsetTop + from.offsetHeight / 2;
        const reach = Math.max(24, Math.min(90, (x2 - x1) * 0.45));
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute(
          'd',
          `M ${x1.toFixed(1)} ${y1.toFixed(1)} ` +
            `C ${(x1 + reach).toFixed(1)} ${y1.toFixed(1)}, ` +
            `${(x2 - reach).toFixed(1)} ${y2.toFixed(1)}, ` +
            `${x2.toFixed(1)} ${y2.toFixed(1)}`,
        );
        // A line out of ground the player has already covered is lit; the rest
        // is the faint chart under it.
        const held = player?.techsResearched.includes(prereq) ?? false;
        path.setAttribute('class', held ? 'tech-line is-held' : 'tech-line');
        svg.append(path);
        connectors.push({ path, from: prereq, to: id });
      }
    }
  }

  // --- travelling along it -------------------------------------------------

  /**
   * The node the chart should open on: what is being researched, or failing
   * that the leftmost thing that could be. A chart that opened on column zero
   * would open on ground the player covered an hour ago.
   */
  function anchorCard(): HTMLElement | null {
    const player = getGame().state.players[localPlayerId()];
    const current = player?.researching ?? null;
    if (current !== null) {
      const card = cards.get(current);
      if (card) return card;
    }
    let best: HTMLElement | null = null;
    let bestColumn = Number.POSITIVE_INFINITY;
    for (const id of TECH_IDS) {
      const card = cards.get(id);
      if (!card || card.disabled) continue;
      if (techColumn(id) >= bestColumn) continue;
      best = card;
      bestColumn = techColumn(id);
    }
    return best;
  }

  /**
   * The choosable node nearest the anchor, which is where the keyboard starts.
   *
   * The anchor is often the current research, and the current research is not
   * itself choosable — so the cursor goes to the nearest node that *is*, rather
   * than to the first one in file order, which would be a focus ring parked
   * three columns off the left edge of what the player is looking at.
   */
  function nearestChoosable(anchor: HTMLElement | null): HTMLButtonElement | null {
    const wanted = anchor?.style.gridColumn ? Number(anchor.style.gridColumn) - 1 : 0;
    let best: HTMLButtonElement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const id of TECH_IDS) {
      const card = cards.get(id);
      if (!card || card.disabled) continue;
      const distance = Math.abs(techColumn(id) - wanted);
      if (distance >= bestDistance) continue;
      best = card;
      bestDistance = distance;
    }
    return best;
  }

  /**
   * Puts an element in the middle of the stage, at once and without a tween.
   *
   * Both axes, because the chart now has two: on a short window the current
   * research may be a lane below the fold, and a screen that opened having
   * travelled sideways to a node it left off the bottom would be worse than one
   * that had not travelled at all. Writing `scrollTop` on a chart that fits is
   * free — the browser clamps it to zero.
   */
  function centreOn(card: HTMLElement): void {
    const seen = card.getBoundingClientRect();
    const stage = chart.getBoundingClientRect();
    chart.scrollLeft += seen.left - stage.left - (chart.clientWidth - seen.width) / 2;
    chart.scrollTop += seen.top - stage.top - (chart.clientHeight - seen.height) / 2;
  }

  /** One column-ish, for the sideways arrow keys and for a wheel notch. */
  const NUDGE = 260;
  /** One lane-ish, for the vertical pair. Shorter, because a lane is shorter. */
  const NUDGE_DOWN = 150;

  function nudge(by: number): void {
    chart.scrollLeft += by;
  }

  /**
   * Drag to pan, as one would push a paper chart across a table.
   *
   * The click that ends a drag is swallowed: a player who dragged the chart by
   * grabbing a node did not ask to research it. The threshold is what separates
   * the two gestures, and pointer capture only starts once it is crossed, so a
   * plain click on a card still reaches the card.
   */
  let panFrom: { id: number; x: number; y: number; left: number; top: number } | null = null;
  let panned = false;
  let swallowClick = false;

  chart.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    swallowClick = false;
    panned = false;
    panFrom = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: chart.scrollLeft,
      top: chart.scrollTop,
    };
  });

  chart.addEventListener('pointermove', (event) => {
    if (!panFrom || event.pointerId !== panFrom.id) return;
    const dx = event.clientX - panFrom.x;
    const dy = event.clientY - panFrom.y;
    if (!panned) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      panned = true;
      // Capture keeps a drag that wanders off the stage — or off the window —
      // attached to it. A pointer that has already gone (a synthetic event, a
      // device unplugged mid-drag) refuses to be captured, and that is not a
      // reason to stop panning.
      try {
        chart.setPointerCapture(event.pointerId);
      } catch {
        /* the drag simply loses the pointer if it leaves the stage */
      }
      chart.classList.add('is-panning');
    }
    chart.scrollLeft = panFrom.left - dx;
    chart.scrollTop = panFrom.top - dy;
  });

  function endPan(event: PointerEvent): void {
    if (!panFrom || event.pointerId !== panFrom.id) return;
    if (panned) {
      if (chart.hasPointerCapture(event.pointerId)) chart.releasePointerCapture(event.pointerId);
      chart.classList.remove('is-panning');
      swallowClick = true;
    }
    panFrom = null;
    panned = false;
  }

  chart.addEventListener('pointerup', endPan);
  chart.addEventListener('pointercancel', endPan);

  chart.addEventListener(
    'click',
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.stopPropagation();
      event.preventDefault();
    },
    true,
  );

  /**
   * The wheel goes down while there is down to go, and sideways otherwise.
   *
   * It used to go sideways unconditionally, on the grounds that sideways was
   * the only way this chart went — true of the chart, and a trap for the
   * window: a sky taller than the stage had a bottom lane no gesture could
   * reach, because the one gesture that would have reached it had been taken.
   * So the stage is asked rather than assumed, and the answer is nearly always
   * "sideways" anyway, `fitLanes` having spent the height first.
   *
   * A trackpad's horizontal gesture (and the shift-wheel most browsers turn into
   * one) arrives as `deltaX` and is left to the browser; shift is honoured here
   * too for the browsers that do not, and means "across, whatever the stage
   * says". Zoom gestures — ctrl or meta held — are never ours to take.
   */
  chart.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const down = !event.shiftKey && chart.scrollHeight > chart.clientHeight;
      if (!down && chart.scrollWidth <= chart.clientWidth) return;
      // A page-mode notch is a page of whichever axis is about to move.
      const page = down ? chart.clientHeight : chart.clientWidth;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? page : 1;
      event.preventDefault();
      if (down) chart.scrollTop += event.deltaY * unit;
      else chart.scrollLeft += event.deltaY * unit;
    },
    { passive: false },
  );

  // --- the HUD's research card ---------------------------------------------

  /**
   * The card at the top-left: what this seat is learning, how far along it is,
   * and the way in.
   *
   * Three states, and each is a different sentence rather than a blank field.
   * All three share one dial: its rim is a conic-gradient ring sized by the
   * `--progress` custom property (0–100%, no canvas or SVG), and its sky holds
   * either the tech's own glyph or a stand-in star.
   *
   *   · **Learning something.** The name, the ring at the real fraction, the
   *     tech's glyph lit gilt in the sky, "3t" on the dial's boss, and
   *     "230/250 🔬" below the name.
   *   · **Nothing chosen, and there is still something to choose.** The prompt,
   *     the ring faint and stopped, the sky empty but for one dim ✧, and the
   *     same slow gilt pulse the bar button used to wear — now worn by the
   *     card's border. The nag is a pulse rather than a modal: research is a
   *     decision the player should make, and a screen that demanded it before
   *     the game would continue would be a screen that interrupted the game to
   *     ask. (This is the same condition End Turn's "Choose research" blocker
   *     is derived from — see `firstBlocker` in `turnBlockers.ts`. Both read
   *     `researching` and `availableTechs`, so neither can nag while the other
   *     says all is well.)
   *   · **The tree is finished.** The ring goes fully gilt, the sky keeps a lit
   *     ✦, and the name says so, quietly, and stops asking. The card still
   *     opens the chart, because a finished tree is still worth reading.
   *
   * Always the local seat: this is what *you* are researching, and in a hot-seat
   * session the card follows the chair the same way every other HUD surface
   * does — `localPlayerId()` is asked afresh on every render.
   */
  function renderStatus(): void {
    const { state, playerId, player, rate } = passNow();
    if (!player) return;

    const current = player.researching;

    if (current === null) {
      const remaining = availableTechs(state, playerId).length;
      const prompting = remaining > 0;
      statusCard.classList.toggle('is-prompting', prompting);
      statusCard.classList.toggle('is-done', !prompting);
      statusName.textContent = prompting ? 'Choose research…' : 'Philosophy complete';
      // A stopped ring either way: prompting has no fraction to show, and the
      // finished tree's ring is drawn full by the `.is-done` CSS override on
      // `--ring-color` rather than by a fraction here.
      statusDial.style.setProperty('--progress', prompting ? '0%' : '100%');
      // The sky holds a dim stand-in star while nothing is chosen, and a lit
      // one once the tree is finished — the tech's own glyph belongs to
      // neither state, there being no current tech to draw it for.
      statusGlyph.textContent = prompting ? '✧' : '✦';
      statusGlyph.classList.toggle('is-dim', prompting);
      // Neither state has a turn count: prompting has no denominator to count
      // down, and a finished tree has nothing left to finish.
      statusBoss.textContent = '';
      // With no aim there is no denominator, so the figures line says what the
      // pool *is* — banking is real (see the model in `src/sim/tech.ts`), and a
      // player who has forgotten to choose should see the beakers piling up.
      setYieldText(
        statusFigures,
        prompting
          ? `${Math.floor(player.sciencePool)} ${BEAKER} banked · +${rate}/t`
          : `${player.techsResearched.length}/${TECH_IDS.length} ✦`,
      );
      statusCard.title = prompting
        ? 'Choose what to research (T)'
        : 'Every technology is researched — the star chart is T';
      statusCard.setAttribute(
        'aria-label',
        prompting
          ? `Research: nothing chosen, ${Math.floor(player.sciencePool)} beakers banked. Opens the star chart.`
          : 'Research: every technology is researched. Opens the star chart.',
      );
      return;
    }

    statusCard.classList.remove('is-prompting', 'is-done');
    const def = techDef(current);
    const progress = researchProgress(player.sciencePool, def.cost, rate);
    statusName.textContent = def.name;
    statusDial.style.setProperty('--progress', `${(progress.fraction * 100).toFixed(1)}%`);
    // Through the printer, like every other glyph on this screen: a tech whose
    // own glyph *is* one of the six yield marks — Agriculture, Bronze Working,
    // Drama, Currency — wears the drawn one here as it does on its node, rather
    // than the emoji on one surface and the drawing on the other.
    setYieldText(statusGlyph, def.glyph);
    statusGlyph.classList.remove('is-dim');
    statusBoss.textContent = progress.turns === null ? '' : `${progress.turns}t`;
    // The figures line drops the turn count `progress.figures` carries — the
    // dial's boss says it instead, so the two would otherwise repeat a fact.
    setYieldText(statusFigures, `${progress.banked}/${progress.cost} ${BEAKER}`);
    statusCard.title =
      `${def.name}: ${progress.banked} / ${progress.cost} beakers ` +
      `(+${rate} per turn) — the star chart is T`;
    statusCard.setAttribute(
      'aria-label',
      `Research: ${def.name}, ${progress.banked} of ${progress.cost} beakers, ` +
        `${progress.turns === null ? 'no science being made' : `${progress.turns} turns left`}. ` +
        'Opens the star chart.',
    );
  }

  /**
   * The one entry point, and the one place a render begins.
   *
   * `beginPass` first, because everything below it — the HUD's card, the strip,
   * the twenty-seven stars — quotes the same science rate and must not each go
   * and sum the empire for it. Then the chart, if it is up: **built** the first
   * time, **repainted** every time after that. `field` is the whole of that
   * test, and `setOpen(false)` is what clears it, so a chart is rebuilt exactly
   * once per visit and no click ever lays one out again.
   */
  function render(): void {
    beginPass();
    renderStatus();
    if (!open) return;
    if (field === null) {
      renderChart();
      return;
    }
    // Before anything is measured — the strip is a flex sibling of the stage, so
    // it appearing or going takes real height off `chart.clientHeight`, which is
    // the height `refreshNodes` then spends on the lanes.
    renderPlanStrip();
    refreshNodes();
  }

  // --- opening and closing -------------------------------------------------

  function setOpen(next: boolean): void {
    if (open === next) return;
    open = next;
    overlay.hidden = !next;
    statusCard.setAttribute('aria-expanded', String(next));

    if (next) {
      onOpen?.();
      const active = document.activeElement as HTMLElement | null;
      restoreTo = active && active !== document.body ? active : statusCard;
      // A fresh opening starts at the front of the player's own work rather
      // than wherever the last visit was left, so the chart always opens on
      // the decision that is actually in front of them.
      chart.scrollLeft = 0;
      chart.scrollTop = 0;
      // `field` was cleared on the way out, so this is the visit's one build.
      render();
      // The current research if there is one, otherwise the first node the
      // player could actually choose: a screen that opens with the cursor on
      // "close" is a screen that opens with nothing to read. The stage travels
      // to the same node, so what has the keyboard is also what is on screen.
      const anchor = anchorCard();
      if (anchor) centreOn(anchor);
      (nearestChoosable(anchor) ?? closeButton).focus({ preventScroll: true });
      return;
    }
    // A card raised over the chart lives on `document.body`, not inside the
    // overlay, so hiding the overlay would not take it with it. The focus mode
    // is put back for the same reason a pointer leaving a card puts it back:
    // a hidden chart keeping one node lit would reopen mid-sentence.
    // `onOpen`'s twin, and it is one line here rather than one at each door
    // precisely because there are five of them — the ×, Escape, a click on the
    // ink around the chart, the `close()` verb and the toggle. `setOpen` is
    // where they all arrive, so it is where the chart says it has folded away.
    onClose?.();
    info.hide();
    readNode(null);
    restoreTo?.focus();
    restoreTo = null;
    // The next visit builds a fresh sky rather than repainting this one: the
    // window may have been resized, the seat may have changed hands, and a chart
    // is laid out from the stage it is going into. `field` is the mark that says
    // there is nothing to repaint — see `render`.
    field = null;
    render();
  }

  closeButton.addEventListener('click', () => setOpen(false));
  statusCard.addEventListener('click', () => setOpen(!open));

  // Escape belongs to whatever is in front, and while this is up that is this.
  // `main.ts` reports the overlay as blocking, so `controls.ts` never sees the
  // key — two listeners racing for one Escape is how a key starts doing two
  // things at once.
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'INPUT' || target?.isContentEditable) return;
    if (event.key === 't' || event.key === 'T') {
      // Like the Escape branch: stop here, or the window listener in
      // controls.ts sees the same press with the overlay now closed and
      // immediately reopens the chart it just shut.
      event.stopPropagation();
      setOpen(false);
      return;
    }
    // The arrow keys drive the stage in whichever direction it can travel. Tab
    // still walks the nodes; these are for reading, not for choosing.
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      nudge(event.key === 'ArrowLeft' ? -NUDGE : NUDGE);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      // Only claimed when there is somewhere to go: on a chart that fits, up
      // and down belong to whatever the browser would have done with them.
      if (chart.scrollHeight <= chart.clientHeight) return;
      event.preventDefault();
      event.stopPropagation();
      chart.scrollTop += event.key === 'ArrowUp' ? -NUDGE_DOWN : NUDGE_DOWN;
    }
  });

  /**
   * Escape, from **any** focus state — not only from inside the chart.
   *
   * The listener above is the one that runs while the keyboard is in the
   * overlay, which is where `setOpen` puts it and where it usually stays. It
   * does not always: a re-render replaces the node that held focus, the card
   * raised over the sky lives on `document.body` rather than inside the overlay
   * (see `setOpen`'s note), and a click on the ink around the chart lands on the
   * body too. In every one of those states the key reached *nothing at all* —
   * `main.ts` reports this screen as blocking, so `controls.ts` returns before
   * its own Escape branch, and the overlay is not on the path of a press that
   * started outside it. The user found it (playtest, 2026-08-27): "'escape' key
   * should work to exit the tech screen".
   *
   * **Not capturing**, which is what keeps one key doing one thing: a press
   * inside the overlay is handled there and stopped there, so this never sees
   * it. Two closers, and whichever is nearer the press is the one that runs.
   */
  const onWindowKeyDown = (event: KeyboardEvent): void => {
    if (!open || event.key !== 'Escape') return;
    event.stopPropagation();
    setOpen(false);
  };
  window.addEventListener('keydown', onWindowKeyDown);

  // Clicking the ink around the chart closes it, like the popovers do.
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) setOpen(false);
  });

  // A resize changes the height the lanes were spaced for as readily as the
  // width the lines were measured in, so both are redone, in the same order
  // renderChart does them.
  const onWindowResize = (): void => {
    if (!open || !field || !lines) return;
    spaceColumns(field, techColumnCount());
    spaceLanes(field, techRowCount());
    drawLines(lines);
  };
  window.addEventListener('resize', onWindowResize);

  render();

  return {
    get isOpen() {
      return open;
    },
    open: () => setOpen(true),
    close: () => setOpen(false),
    /**
     * Unbinds the window listeners. The chart is built once per game (`boot`),
     * over the same DOM every time — and a stale instance's `open` flag is
     * exactly how the chart froze (Entry LVII): the leaked keydown closure
     * answered `!open` for a chart the *new* instance had drawn, the overlay's
     * own handler stopped the press, and every door no-opped until an open-door
     * resynced the flag. `main.ts` sweeps these on the way to the landing and
     * again at the top of `boot`, so a load that skips the landing is covered.
     */
    dispose(): void {
      window.removeEventListener('keydown', onWindowKeyDown);
      window.removeEventListener('resize', onWindowResize);
    },
    toggle: () => setOpen(!open),
    render,
  };
}
