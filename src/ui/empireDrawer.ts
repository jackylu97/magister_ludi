/**
 * The empire panel and its drawer (batch UX3). The spec is
 * `docs/plans/hud-empire-panel-spec.md` §3 to §5, and the agreed drawing is
 * `docs/plans/mockups/hud-e2-final.html`.
 *
 * The panel is the top-left corner of the HUD: the seat's banner and two thin
 * bars, research and the draft meter, each followed by its turns. The whole
 * panel is one button. The drawer opens to its right, so it never covers the
 * commission chips under the panel, and it has two depths:
 *
 * - **Depth one** opens when the pointer rests on the panel for
 *   `PEEK_DELAY_MS`, or when the keyboard tabs onto it. It shows the research
 *   and culture sections. Each section is one large button: research opens the
 *   star chart and culture opens Statecraft.
 * - **Depth two** opens on a click, a tap, Enter or Q. It adds the Faith,
 *   Leader and age wager rows and the Supply counts, and it stays open until
 *   Escape, a press outside it, its ×, Q again, or any screen opening.
 *
 * It replaced three things: the research card, the dock (Statecraft, Religion
 * and Leader as three square buttons) and the always-visible strategic
 * resources card (`holdingsRail.ts`).
 *
 * What is pure and what is not
 * ----------------------------
 * What the panel and drawer print (`empireGlance` and the word helpers) and
 * the rule for moving between depths (`drawerStep`, `mayPeek`) are pure
 * functions above `createEmpireDrawer`, because the test suite has no DOM.
 * `createEmpireDrawer` fills the static markup in `index.html` and wires the
 * gestures.
 *
 * Who writes what
 * ---------------
 * The research section keeps the old research card's ids (`#hud-research`,
 * `#tech-current`, `#research-figures`, `#research-turns`, `#research-dial`,
 * `#research-glyph`). `techTree.ts`'s `renderStatus` still writes them, and the
 * star chart still owns the click that opens it from that section. This module
 * writes everything else: the panel, the research section's rate and "next"
 * lines, the culture section, the three rows and the Supply list. The panel's
 * research bar and the section's figures agree because both go through
 * `researchProgress` at the star chart's own rate (`playerScience`).
 *
 * Peeking, pinning, and the screen registry
 * -----------------------------------------
 * The drawer is registered as a card in the screen registry
 * (`screenRegistry.ts`). Pinning it calls `onOpen`, which `main.ts` wires to
 * `screens.opening('drawer')`, so a pinned drawer closes the other cards and
 * screens, and any card or screen opening closes the drawer.
 *
 * Depth one is a **peek** and tells the registry nothing. A pointer crossing
 * the corner on its way somewhere else should not close the Lens card or the
 * chronicle the player has open. A peek still counts as open, so Escape closes
 * it before it reaches the selection, and a card or screen opening still
 * closes it.
 *
 * A peek never starts while a mouse button is held (the map is being dragged),
 * on a touch (there is no hover; a tap pins instead), or while `canPeek` says
 * no (`main.ts`: a sheet or a piece of news is up, or a move is being aimed).
 *
 * Keyboard
 * --------
 * At depth two the drawer behaves like the HUD's other cards (`popover.ts`):
 * pinning moves the keyboard to the first section, Tab and Shift-Tab wrap
 * inside the drawer, and closing it while the keyboard is inside puts the
 * keyboard back on the panel. At depth one nothing is trapped: Tab walks from
 * the panel into the research and culture sections and on to the commission
 * chips, and the peek closes when the keyboard and the pointer have both left.
 *
 * Only Tab opens a peek from the keyboard. The panel is also where the
 * keyboard lands when a sheet opened from the drawer closes, and a drawer that
 * opened by itself every time a sheet closed would be in the way.
 *
 * This module follows `popover.ts`'s pattern rather than calling
 * `createPopover`, for two reasons: a popover has one depth and always traps
 * Tab, and its listeners cannot be removed. Every listener here is bound with
 * one `AbortController` and removed by `dispose`, which `main.ts` puts in
 * `gameDisposers`.
 *
 * Supply: why the counts are no longer on the board
 * -------------------------------------------------
 * Until this batch the strategic resource counts sat in a card that was always
 * on screen (the holdings rail, `holdingsRail.ts`, removed here), under a rule
 * its docblock recorded: a player should be able to answer "can I build
 * another horseman?" without clicking anything
 * (`docs/strategic-resources-proposal.md` §7: "If the counts are buried in a
 * submenu, all it does is refuse people."). The user reversed that rule on
 * 2026-10-15 (`docs/flags.md` (ssssss) 1): the counts moved into this drawer's
 * Supply section and to the head of each town's build list, where building
 * decisions are made. The case that needs attention without a click is a
 * resource with no spare copy, and that lights the red dot on the banner.
 */

import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import { seatInks } from '../art/seatInks';
import { turnsToFill } from '../sim/cities';
import type { Game } from '../sim/game';
import { seatName } from '../sim/leaderData';
import { readEmpire } from '../sim/readings';
import { explainNextRung, hasReligionOffer, nextRungWords } from '../sim/religion';
import { type GameState, type Player, playerById } from '../sim/state';
import { hasStatecraftOffer, nextDraftCost } from '../sim/statecraft';
import { GOVERNMENT_TIERS } from '../sim/statecraftData';
import { availableTechs, playerScience, researchPlan } from '../sim/tech';
import { techDef } from '../sim/techData';
import { dealtWagers, openWagerDeal, wagerClaimedBy } from '../sim/wagers';
import { element, requireElement } from './dom';
import { figure, signedFigure, turnsLabel } from './figures';
import { openKeyword } from './keywords';
import { researchProgress } from './researchProgress';
import { techCostFor } from './techPrice';
import { type CopyCount, copiesFigureNode, strategicHoldings } from './resourceCopies';
import { resourceMarkNode } from './resourceMark';

// --- timing and depth --------------------------------------------------------

/** How long the pointer rests on the panel before the drawer opens (spec §4). */
export const PEEK_DELAY_MS = 200;

/** How long after the pointer leaves both surfaces a peek closes (spec §4). */
export const LEAVE_DELAY_MS = 300;

/** 0: closed. 1: peeking (research and culture). 2: pinned (everything). */
export type DrawerDepth = 0 | 1 | 2;

/**
 * What can happen to the drawer.
 *
 * - `peek`: the pointer has rested on the panel, or the keyboard has tabbed
 *   onto it.
 * - `leave`: the pointer and the keyboard have both left the panel and the
 *   drawer.
 * - `toggle`: a click or tap on the panel, Enter on it, or Q.
 * - `close`: Escape, the ×, a press outside, or another card or screen
 *   opening.
 */
export type DrawerEvent = 'peek' | 'leave' | 'toggle' | 'close';

/**
 * The drawer's depth after an event.
 *
 * A peek never lowers a pinned drawer, and leaving never closes one: once
 * pinned, the drawer stays until it is closed on purpose.
 */
export function drawerStep(depth: DrawerDepth, event: DrawerEvent): DrawerDepth {
  switch (event) {
    case 'peek':
      return depth === 0 ? 1 : depth;
    case 'leave':
      return depth === 1 ? 0 : depth;
    case 'toggle':
      return depth === 2 ? 0 : 2;
    case 'close':
      return 0;
  }
}

/** What decides whether resting the pointer on the panel may open a peek. */
export interface PeekConditions {
  /** A mouse button is held, so the map is being dragged. */
  buttonsHeld: boolean;
  /** The pointer is a finger. Touch has no hover; a tap pins instead. */
  touch: boolean;
  /** A sheet or a piece of news is up, or a move is being aimed. */
  busy: boolean;
}

/** Whether a peek may start (spec §4: never while dragging, aiming or behind a sheet). */
export function mayPeek(at: PeekConditions): boolean {
  return !at.buttonsHeld && !at.touch && !at.busy;
}

// --- what is owed ------------------------------------------------------------

/**
 * Is Statecraft waiting on this seat? A draft, a Doctrine offer or a charter to
 * swear.
 *
 * Delegates to `hasStatecraftOffer`, the simulation's own definition of
 * "something is waiting". This function only adds what a missing seat means:
 * nothing is waiting for a seat that is not there. It was the dock's badge
 * (`hudBadgeWaiting` in the old `hudDock.ts`) and now feeds the banner's dot
 * and the culture section's owed line.
 */
export function statecraftOwed(player: Player | undefined): boolean {
  return player !== undefined && hasStatecraftOffer(player);
}

/**
 * Is a belief waiting to be chosen? The Faith row's dot.
 *
 * Only a decision lights it, never a rite the seat could afford, which would be
 * true on most turns (`docs/flags.md` (ssssss) 4.7). Delegates to
 * `hasReligionOffer` for `statecraftOwed`'s reason.
 */
export function beliefOwed(player: Player | undefined): boolean {
  return player !== undefined && hasReligionOffer(player);
}

/**
 * The four things that light the banner's red dot (spec §3): a card to pick (a
 * draft or a Doctrine offer), a charter to swear, a belief to choose, and a
 * strategic resource with no spare copy.
 */
export type OwedDecision = 'card' | 'charter' | 'belief' | 'supply';

/** Each cause, in the words the panel's accessible name uses. */
export const OWED_WORDS: Readonly<Record<OwedDecision, string>> = {
  card: 'a card to pick',
  charter: 'a charter to swear',
  belief: 'a belief to choose',
  supply: 'a strategic resource with none spare',
};

// --- the readings ------------------------------------------------------------

/** Where the seat's research stands. */
export type ResearchStage = 'learning' | 'choosing' | 'finished';

export interface ResearchGlance {
  stage: ResearchStage;
  /** The technology being learnt, or `null` unless `stage` is `learning`. */
  name: string | null;
  /** Progress toward it, 0 to 1. */
  fraction: number;
  /** Turns to finish it, `0` when it is already paid, `null` with no science. */
  turns: number | null;
  /** Science a turn, the star chart's own figure (`playerScience`). */
  rate: number;
  /** The next technology in the research plan, or `null` with no queue. */
  next: string | null;
}

export interface DraftGlance {
  /** Culture banked toward the next draft, as a whole number. */
  banked: number;
  /** What the next draft costs, discounts included (`nextDraftCost`). */
  cost: number;
  /** `banked` against `cost`, 0 to 1. */
  fraction: number;
  /** Turns until the meter fills at the current rate; `null` with no culture. */
  turns: number | null;
  /** Drafts taken so far, which Statecraft calls the tier. */
  tier: number;
  /** The tier at which the next government is offered, or `null` past the last. */
  nextGovernment: number | null;
  /** What Statecraft is waiting on: a charter first, else any card. */
  owed: 'card' | 'charter' | null;
}

export interface WagerGlance {
  /** Bars on the table this age; nought when this age dealt none. */
  dealt: number;
  /** How many of them this seat has met. */
  met: number;
}

/** Everything the panel and the drawer print for one seat. */
export interface EmpireGlance {
  playerId: number;
  seatName: string;
  research: ResearchGlance;
  draft: DraftGlance;
  /** The next god, in the simulation's own sentence (`nextRungWords`). */
  faithLine: string;
  beliefOwed: boolean;
  wager: WagerGlance;
  /** Every strategic resource held or spent (`strategicHoldings`). */
  supply: CopyCount[];
  /** What lights the banner's dot, in `OwedDecision` order. */
  owed: OwedDecision[];
}

/** Research, read the way the star chart's `renderStatus` reads it. */
export function researchGlance(state: GameState, player: Player): ResearchGlance {
  const rate = playerScience(state, player.id);
  const current = player.researching;
  if (current === null) {
    const choosing = availableTechs(state, player.id).length > 0;
    return {
      stage: choosing ? 'choosing' : 'finished',
      name: null,
      fraction: choosing ? 0 : 1,
      turns: null,
      rate,
      next: null,
    };
  }
  const def = techDef(current);
  // The folded price (Scientific batch S0), the figure the star chart quotes
  // for the same node: a charter technology costs more than its column, and a
  // seated card can move any price. `techCostFor` is the one reader.
  const progress = researchProgress(player.sciencePool, techCostFor(state, player, current), rate);
  const following = researchPlan(player)[1];
  return {
    stage: 'learning',
    name: def.name,
    fraction: progress.fraction,
    turns: progress.turns,
    rate,
    next: following === undefined ? null : techDef(following).name,
  };
}

/**
 * The draft meter: the culture pool against the next draft's cost, at the
 * empire's culture rate (the top bar's own figure, `readEmpire`).
 */
export function draftGlance(state: GameState, player: Player): DraftGlance {
  const cost = nextDraftCost(state, player);
  const pool = Math.max(0, player.culturePool);
  const tier = player.statecraft.drafts;
  const nextGovernment = GOVERNMENT_TIERS.find((at) => at > tier);
  const charter = player.statecraft.pendingGovernment !== undefined;
  return {
    banked: Math.floor(pool),
    cost,
    fraction: cost <= 0 ? 1 : Math.min(1, pool / cost),
    turns: turnsToFill(cost - pool, readEmpire(state, player.id).totals.culture),
    tier,
    nextGovernment: nextGovernment ?? null,
    owed: charter ? 'charter' : statecraftOwed(player) ? 'card' : null,
  };
}

/** The age wager: how many of this age's bars the seat has met. */
export function wagerGlance(state: GameState, playerId: number): WagerGlance {
  const deal = openWagerDeal(state);
  if (deal === null) return { dealt: 0, met: 0 };
  const dealt = dealtWagers(deal);
  const met = dealt.filter((id) => wagerClaimedBy(deal, playerId, deal.dealt.indexOf(id))).length;
  return { dealt: dealt.length, met };
}

/**
 * Everything the panel and the drawer print for this seat, or `null` for a
 * seat that is not there.
 */
export function empireGlance(state: GameState, playerId: number): EmpireGlance | null {
  const player = playerById(state, playerId);
  if (player === undefined) return null;
  const draft = draftGlance(state, player);
  const supply = strategicHoldings(state, playerId);
  const belief = beliefOwed(player);
  const owed: OwedDecision[] = [];
  if (draft.owed !== null) owed.push(draft.owed);
  if (belief) owed.push('belief');
  if (supply.some((row) => row.spare === 0)) owed.push('supply');
  return {
    playerId,
    seatName: seatName(state, playerId),
    research: researchGlance(state, player),
    draft,
    faithLine: nextRungWords(
      explainNextRung(state, playerId, readEmpire(state, playerId).totals.faith),
    ),
    beliefOwed: belief,
    wager: wagerGlance(state, playerId),
    supply,
    owed,
  };
}

// --- the words ---------------------------------------------------------------

/** The Supply section's caption: what the two figures are. */
export const SUPPLY_CAPTION = 'spare of what you hold';

/** The Supply section with nothing in it. */
export const SUPPLY_EMPTY = 'No strategic resources yet';

/** The line at the foot of a peek, saying what a click adds. */
export const PEEK_FOOT = '▾ click for Faith, Leader, Supply';

/** The drawer's header hint at each open depth. */
export const DEPTH_HINT: Readonly<Record<1 | 2, string>> = {
  1: 'click or Q to keep open',
  2: 'Esc or Q to close',
};

/** "1 turn", "3 turns", "this turn", or what a missing rate means. */
function turnsPhrase(turns: number | null, never: string): string {
  if (turns === null) return never;
  if (turns === 0) return 'this turn';
  return turns === 1 ? '1 turn' : `${turns} turns`;
}

/** The research half of the panel's accessible name. */
export function researchWords(research: ResearchGlance): string {
  if (research.stage === 'choosing') return 'nothing being researched';
  if (research.stage === 'finished') return 'every technology researched';
  return `researching ${research.name}, ${turnsPhrase(research.turns, 'no science being made')}`;
}

/** The draft half of the panel's accessible name. */
export function draftWords(draft: DraftGlance): string {
  if (draft.turns === null) return 'no culture being made';
  if (draft.turns === 0) return 'next draft this turn';
  return `next draft in ${turnsPhrase(draft.turns, '')}`;
}

/**
 * The panel's accessible name: "Your empire: researching Code of Laws, 1 turn;
 * next draft in 2 turns", and what is waiting, when anything is.
 */
export function panelLabel(glance: EmpireGlance): string {
  const head = `Your empire: ${researchWords(glance.research)}; ${draftWords(glance.draft)}`;
  if (glance.owed.length === 0) return head;
  return `${head}. Waiting on you: ${glance.owed.map((cause) => OWED_WORDS[cause]).join(', ')}`;
}

/** "Tier 14 · next government at 18", or the tier alone past the last government. */
export function tierWords(draft: DraftGlance): string {
  const tier = `Tier ${draft.tier}`;
  return draft.nextGovernment === null ? tier : `${tier} · next government at ${draft.nextGovernment}`;
}

/** The culture section's vermilion line, or `null` when nothing is owed. */
export function cultureOwedWords(draft: DraftGlance): string | null {
  if (draft.owed === 'charter') return 'a charter is ready to be sworn';
  if (draft.owed === 'card') return 'a card awaits';
  return null;
}

/** The culture section's figures: "120/450 · 2t". */
export function draftFigures(draft: DraftGlance): string {
  return `${figure(draft.banked)}/${figure(draft.cost)} · ${turnsLabel(draft.turns)}`;
}

/** The age wager row's note: "2 of 3 bars met". */
export function wagerWords(wager: WagerGlance): string {
  if (wager.dealt === 0) return 'no wager this age';
  return `${wager.met} of ${wager.dealt} bars met`;
}

/** The turns after the panel's research bar: "1t", or a mark for the two other states. */
export function researchTurnsMark(research: ResearchGlance): string {
  if (research.stage === 'choosing') return '—';
  if (research.stage === 'finished') return '✦';
  return turnsLabel(research.turns);
}

/**
 * The Supply list as one string: a row is its resource and its two figures, so
 * two readings that would draw the same list compare equal. The seat is in it
 * because taking another chair changes the holdings with no change of state.
 * The list is rebuilt only when this moves (the old holdings rail's rule): the
 * revision moves on every accepted command and almost none of them touch a copy.
 */
export function supplyFingerprint(rows: readonly CopyCount[], playerId: number): string {
  return `${playerId}|${rows.map((row) => `${row.id}:${row.spare}/${row.held}`).join(',')}`;
}

// --- the surface -------------------------------------------------------------

export interface EmpireDrawerOptions {
  /** The panel, `#empire-panel`: one button. */
  panel: HTMLButtonElement;
  /** The drawer, `#empire-drawer`. Hidden with `hidden` while closed. */
  drawer: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  /**
   * Whether resting the pointer on the panel may open a peek right now. False
   * while a sheet or a piece of news is up, or a move is being aimed.
   */
  canPeek: () => boolean;
  /** The drawer is being pinned. `main.ts` tells the screen registry. */
  onOpen: () => void;
  /** The depth changed, so the tutorial's ring can move with it. */
  onChange?: () => void;
  /** The culture section's door. */
  openStatecraft: () => void;
  /** The Faith row's door (H). */
  openFaith: () => void;
  /** The Leader row's door (L). */
  openLeader: () => void;
  /** The age wager row's door: the wager's first standing way in. */
  openWager: () => void;
}

export interface EmpireDrawer {
  /** Open at either depth. What the screen registry and Escape ask. */
  readonly isOpen: boolean;
  readonly depth: DrawerDepth;
  /** Pins the drawer, or closes it when it is pinned. Q, and a press on the panel. */
  toggle(): void;
  /** Closes it at any depth. Safe on a closed drawer. */
  close(): void;
  /** Re-reads the seat, and rewrites what changed. Called with the rest of the HUD. */
  render(): void;
  /** Removes every listener and timer. Registered in `gameDisposers`. */
  dispose(): void;
}

/** Controls that can hold the keyboard inside the drawer. */
const FOCUSABLE = 'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

export function createEmpireDrawer(options: EmpireDrawerOptions): EmpireDrawer {
  const { panel, drawer, getGame, localPlayerId } = options;

  // The panel's parts.
  const banner = requireElement('empire-banner');
  const researchBar = requireElement('empire-research-bar');
  const researchFill = requireElement('empire-research-fill');
  const researchTurns = requireElement('empire-research-turns');
  const draftFill = requireElement('empire-draft-fill');
  const draftTurns = requireElement('empire-draft-turns');
  // The drawer's parts. The research section's other lines are the star chart's.
  const headBanner = requireElement('drawer-banner');
  const seat = requireElement('drawer-seat');
  const hint = requireElement('drawer-hint');
  const researchRate = requireElement('research-rate');
  const researchNext = requireElement('research-next');
  const culture = requireElement<HTMLButtonElement>('drawer-culture');
  const cultureFigures = requireElement('culture-figures');
  const cultureFill = requireElement('culture-fill');
  const cultureTier = requireElement('culture-tier');
  const cultureOwed = requireElement('culture-owed');
  const foot = requireElement('drawer-foot');
  const faithRow = requireElement<HTMLButtonElement>('drawer-faith');
  const faithNote = requireElement('drawer-faith-note');
  const leaderRow = requireElement<HTMLButtonElement>('drawer-leader');
  const wagerRow = requireElement<HTMLButtonElement>('drawer-wager');
  const wagerNote = requireElement('drawer-wager-note');
  const supplyList = requireElement('drawer-supply');
  const supplyCaption = requireElement('drawer-supply-caption');
  const closeButton = requireElement<HTMLButtonElement>('drawer-close');

  foot.textContent = PEEK_FOOT;
  supplyCaption.textContent = SUPPLY_CAPTION;

  let depth: DrawerDepth = 0;
  let overPanel = false;
  let overDrawer = false;
  /** True when the last input was a Tab press, which is what a keyboard peek waits for. */
  let tabbed = false;
  let peekTimer: number | null = null;
  let leaveTimer: number | null = null;

  // What the last render drew for. `-1` is "nothing drawn yet".
  let drawnState: GameState | null = null;
  let drawnRevision = -1;
  let drawnSeat = -1;
  let drawnSupply = '';

  const listening = new AbortController();
  const { signal } = listening;

  /** False while the panel is not drawn at all, as on the city screen. */
  function shown(): boolean {
    return panel.getClientRects().length > 0;
  }

  function focusables(): HTMLElement[] {
    return Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => node.getClientRects().length > 0,
    );
  }

  function keyboardInside(): boolean {
    const active = document.activeElement;
    return active !== null && (panel.contains(active) || drawer.contains(active));
  }

  function clearPeek(): void {
    if (peekTimer !== null) window.clearTimeout(peekTimer);
    peekTimer = null;
  }

  function clearLeave(): void {
    if (leaveTimer !== null) window.clearTimeout(leaveTimer);
    leaveTimer = null;
  }

  function setDepth(next: DrawerDepth): void {
    if (next === depth) return;
    // Asked before the drawer is hidden: once it is, the browser has already
    // moved the keyboard off whatever was inside it.
    const heldKeyboard = drawer.contains(document.activeElement);
    depth = next;
    drawer.hidden = next === 0;
    drawer.dataset.depth = String(next);
    panel.classList.toggle('is-open', next > 0);
    panel.setAttribute('aria-expanded', String(next > 0));
    if (next !== 0) hint.textContent = DEPTH_HINT[next];
    if (next === 0) {
      clearPeek();
      clearLeave();
      // A hidden drawer may never get its `pointerleave`, and a stale "over
      // the drawer" would hold the next peek open after the pointer had gone.
      overDrawer = false;
    }
    if (next === 2) {
      options.onOpen();
      // The first section rather than the ×: a card that opens with the
      // keyboard on "close" opens with nothing to read.
      focusables().find((node) => node !== closeButton)?.focus({ preventScroll: true });
    } else if (heldKeyboard) {
      // Spec §5: closing the drawer puts the keyboard back on the panel.
      panel.focus({ preventScroll: true });
    }
    options.onChange?.();
  }

  function toggle(): void {
    clearPeek();
    clearLeave();
    // A stood-down panel (the city screen) opens nothing: a drawer nobody can
    // see would still swallow the next Escape.
    if (depth === 0 && !shown()) return;
    setDepth(drawerStep(depth, 'toggle'));
  }

  function close(): void {
    setDepth(drawerStep(depth, 'close'));
  }

  // --- the pointer ---------------------------------------------------------

  function entered(onPanel: boolean, event: PointerEvent): void {
    if (onPanel) overPanel = true;
    else overDrawer = true;
    clearLeave();
    if (!onPanel || depth !== 0) return;
    const conditions = {
      buttonsHeld: event.buttons !== 0,
      touch: event.pointerType === 'touch',
      busy: !options.canPeek(),
    };
    if (!mayPeek(conditions)) return;
    clearPeek();
    peekTimer = window.setTimeout(() => {
      peekTimer = null;
      // Asked again: the pointer may have left, or a sheet may have opened.
      if (!overPanel || !options.canPeek() || !shown()) return;
      setDepth(drawerStep(depth, 'peek'));
    }, PEEK_DELAY_MS);
  }

  function left(onPanel: boolean): void {
    if (onPanel) overPanel = false;
    else overDrawer = false;
    if (overPanel || overDrawer) return;
    clearPeek();
    if (depth !== 1) return;
    clearLeave();
    leaveTimer = window.setTimeout(() => {
      leaveTimer = null;
      if (overPanel || overDrawer || keyboardInside()) return;
      setDepth(drawerStep(depth, 'leave'));
    }, LEAVE_DELAY_MS);
  }

  panel.addEventListener('pointerenter', (event) => entered(true, event), { signal });
  panel.addEventListener('pointerleave', () => left(true), { signal });
  drawer.addEventListener('pointerenter', (event) => entered(false, event), { signal });
  drawer.addEventListener('pointerleave', () => left(false), { signal });

  // A click, a tap, Enter and Space all arrive here as the button's click.
  panel.addEventListener('click', () => toggle(), { signal });
  closeButton.addEventListener('click', () => close(), { signal });

  // A press outside both closes the drawer at either depth. Captured, so the
  // drawer is gone before the board starts a drag under it, and so a handler
  // that stops the press cannot keep a pinned drawer open.
  window.addEventListener(
    'pointerdown',
    (event) => {
      tabbed = false;
      const target = event.target as Node | null;
      if (target !== null && (panel.contains(target) || drawer.contains(target))) return;
      // A press elsewhere is proof the pointer is over neither, whatever the
      // boundary events said (a surface that moved under a resting pointer
      // sends none).
      overPanel = false;
      overDrawer = false;
      if (depth !== 0) close();
    },
    { capture: true, signal },
  );

  // --- the keyboard --------------------------------------------------------

  window.addEventListener(
    'keydown',
    (event) => {
      tabbed = event.key === 'Tab';
    },
    { capture: true, signal },
  );

  // Tabbing onto the panel peeks, so the next Tab walks into the sections.
  panel.addEventListener(
    'focus',
    () => {
      if (tabbed && depth === 0 && shown()) setDepth(drawerStep(depth, 'peek'));
    },
    { signal },
  );

  // The keyboard can sit on a closed panel (after Escape, or after a click
  // closed it): a Tab from there opens the peek first, so it lands in the
  // research section rather than skipping a drawer it cannot see.
  panel.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Tab' || event.shiftKey || depth !== 0 || !shown()) return;
      setDepth(drawerStep(depth, 'peek'));
    },
    { signal },
  );

  // A peek closes once the keyboard has gone somewhere else and the pointer is
  // not holding it open. A pinned drawer stays.
  const keyboardLeft = (event: FocusEvent): void => {
    const to = event.relatedTarget as Node | null;
    if (to !== null && (panel.contains(to) || drawer.contains(to))) return;
    if (depth === 1 && !overPanel && !overDrawer) setDepth(drawerStep(depth, 'leave'));
  };
  panel.addEventListener('focusout', keyboardLeft, { signal });
  drawer.addEventListener('focusout', keyboardLeft, { signal });

  // Pinned, Tab and Shift-Tab wrap inside the drawer, as on every HUD card.
  drawer.addEventListener(
    'keydown',
    (event) => {
      if (depth !== 2 || event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    { signal },
  );

  // --- the doors -----------------------------------------------------------

  // The research section's click is the star chart's own (`techTree.ts`). Each
  // of these opens a screen, and the screen's opening closes the drawer.
  culture.addEventListener('click', () => options.openStatecraft(), { signal });
  faithRow.addEventListener('click', () => options.openFaith(), { signal });
  leaderRow.addEventListener('click', () => options.openLeader(), { signal });
  wagerRow.addEventListener('click', () => options.openWager(), { signal });
  // One listener for the whole list, because the rows are rebuilt when the
  // counts change. A resource opens its Compendium entry.
  supplyList.addEventListener(
    'click',
    (event) => {
      const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-resource]');
      const id = row?.dataset.resource;
      if (id !== undefined) openKeyword(`resource:${id}`);
    },
    { signal },
  );

  // --- drawing -------------------------------------------------------------

  function supplyRow(count: CopyCount): HTMLElement {
    const item = element('li', 'drawer-supply-item');
    const button = element('button', count.spare === 0 ? 'drawer-supply-row is-short' : 'drawer-supply-row');
    button.type = 'button';
    button.dataset.resource = count.id;
    // The mark is `aria-hidden` and the name sits beside it, as on every other
    // surface that prints a resource.
    const mark = element('span', 'drawer-supply-mark');
    mark.append(resourceMarkNode(count.id));
    button.append(mark, element('span', 'drawer-supply-name', count.name), copiesFigureNode(count));
    button.title = `${count.name} in the Compendium`;
    item.append(button);
    return item;
  }

  function paintBanner(target: HTMLElement, glance: EmpireGlance): void {
    const player = playerById(getGame().state, glance.playerId);
    // The charge, masked in ink on a parchment canton, as the dock's Leader
    // button drew it; the ring around it is the seat's own colour.
    const uri = heraldryMarkDataUri(heraldryFor(glance.playerId, player?.charge, player?.leader));
    target.style.setProperty('--banner-mark', `url("${uri}")`);
    const ink = seatInks(player).primary;
    if (ink.length > 0) target.style.setProperty('--seat-ink', ink);
    else target.style.removeProperty('--seat-ink');
  }

  function paintPanel(glance: EmpireGlance): void {
    const { research, draft } = glance;
    paintBanner(banner, glance);
    banner.classList.toggle('is-owed', glance.owed.length > 0);
    researchBar.classList.toggle('is-prompting', research.stage === 'choosing');
    researchBar.classList.toggle('is-finished', research.stage === 'finished');
    researchFill.style.width = `${(research.fraction * 100).toFixed(1)}%`;
    researchTurns.textContent = researchTurnsMark(research);
    draftFill.style.width = `${(draft.fraction * 100).toFixed(1)}%`;
    draftTurns.textContent = turnsLabel(draft.turns);
    panel.setAttribute('aria-label', panelLabel(glance));
  }

  function paintDrawer(glance: EmpireGlance): void {
    const { research, draft } = glance;
    paintBanner(headBanner, glance);
    seat.textContent = glance.seatName;

    // The research section's rate and next lines. The name, the figures, the
    // turns and the bar are the star chart's (`renderStatus`).
    researchRate.textContent =
      research.stage === 'learning' ? `${signedFigure(research.rate)} a turn` : '';
    researchNext.hidden = research.next === null;
    researchNext.textContent = research.next === null ? '' : `next: ${research.next}`;

    // The culture section.
    const owedLine = cultureOwedWords(draft);
    cultureFigures.textContent = draftFigures(draft);
    cultureFill.style.width = `${(draft.fraction * 100).toFixed(1)}%`;
    cultureTier.textContent = tierWords(draft);
    cultureOwed.hidden = owedLine === null;
    cultureOwed.textContent = owedLine ?? '';
    culture.classList.toggle('is-owed', owedLine !== null);
    culture.setAttribute(
      'aria-label',
      `Culture: next draft ${draft.banked} of ${draft.cost}, ${turnsPhrase(draft.turns, 'no culture being made')}; ` +
        `${tierWords(draft)}${owedLine === null ? '' : `; ${owedLine}`}. Opens Statecraft.`,
    );

    // The rows. Only Faith carries a dot, and only for a belief to choose.
    faithNote.textContent = glance.faithLine;
    faithRow.classList.toggle('is-owed', glance.beliefOwed);
    faithRow.setAttribute(
      'aria-label',
      `Faith: ${glance.beliefOwed ? 'a belief to choose' : glance.faithLine}. Opens the Faith sheet.`,
    );
    wagerNote.textContent = wagerWords(glance.wager);

    // Supply, rebuilt only when a count moved.
    const printed = supplyFingerprint(glance.supply, glance.playerId);
    if (printed !== drawnSupply) {
      drawnSupply = printed;
      supplyList.replaceChildren(
        ...(glance.supply.length === 0
          ? [element('li', 'hint drawer-supply-empty', SUPPLY_EMPTY)]
          : glance.supply.map(supplyRow)),
      );
      supplyCaption.hidden = glance.supply.length === 0;
    }
  }

  function render(): void {
    const { state } = getGame();
    const seatId = localPlayerId();
    // The state object as well as the revision: a loaded game is a new object
    // whose revision can equal the old one's by chance.
    if (state === drawnState && state.revision === drawnRevision && seatId === drawnSeat) return;
    drawnState = state;
    drawnRevision = state.revision;
    drawnSeat = seatId;
    const glance = empireGlance(state, seatId);
    if (glance === null) return;
    paintPanel(glance);
    paintDrawer(glance);
  }

  // The closed state, written once, so the markup's defaults do not matter.
  drawer.hidden = true;
  drawer.dataset.depth = '0';
  panel.setAttribute('aria-expanded', 'false');

  return {
    get isOpen(): boolean {
      return depth > 0;
    },
    get depth(): DrawerDepth {
      return depth;
    },
    toggle,
    close,
    render,
    dispose(): void {
      listening.abort();
      clearPeek();
      clearLeave();
      close();
      drawnState = null;
      drawnSupply = '';
    },
  };
}
