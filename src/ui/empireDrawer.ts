/**
 * The corner panel (batch SS2): the Corner board's variant A, with variant C's
 * live figures on two of its buttons. The board is
 * `docs/plans/mockups/scholars-study/Corner.dc.html`; the user's ruling is in
 * `docs/plans/ui-critique-2026-10-16.md`, "iteration 3". The file keeps its old
 * name, because the screen registry, the tutorial and the tests know it.
 *
 * The panel is one card in the top-left corner, 248 px wide, in three parts:
 *
 * - **The top part** (`#empire-panel`) is one button: the seat's banner, the
 *   technology being learnt and the next draft, each with its turns and a bar.
 *   A click, a tap, Enter or Q opens the card **downward, in place**. It does
 *   not open to the side any more (the user: "What i don't like about the
 *   corner panel is that it opens to the side").
 * - **Four quick buttons** (`#empire-quick`) are always there and never move:
 *   Diplomacy, Routes, Faith and Standings, the screens the user opens most.
 *   Each opens its sheet in one click. Routes carries the routes running
 *   against the cap and Faith carries the faith banked against the next god's
 *   price (variant C's figures). Faith used to be two clicks away.
 * - **The open part** (`#empire-drawer`) holds the rows: Research (T), Culture
 *   (C), Leader (L), the age wager and the Supply counts. It covers the
 *   commission chips until it closes, as the board draws it.
 *
 * There is no hover peek any more. The board opens the card on a click, and a
 * card that grew on hover would cover the chips every time the pointer crossed
 * the corner on its way to a quick button.
 *
 * What is pure and what is not
 * ----------------------------
 * What the panel prints (`empireGlance` and the word helpers) and the rule for
 * opening and closing (`panelStep`) are pure functions above
 * `createEmpireDrawer`, because the test suite has no DOM. `createEmpireDrawer`
 * fills the static markup in `index.html` and wires the gestures.
 *
 * Who writes what
 * ---------------
 * The star chart (`techTree.ts`, `renderStatus`) writes the technology's name
 * into the top part (`#tech-current`), and the figures, the title and the
 * prompting state of the Research row (`#hud-research`, `#research-figures`).
 * It also owns the Research row's click. This module writes everything else:
 * the banner, both bars and their turns, the quick buttons' figures, the
 * research rate and "next", the culture row, the Leader and wager notes and the
 * Supply list. The top part's research bar and the star chart agree because
 * both go through `researchProgress` at the star chart's own rate.
 *
 * The figures on the quick buttons are the game's own readings: Routes is the
 * top bar's Trade figure (`tabFigures`, which reads `tradeLedger`, the trade
 * sheet's ledger), and Faith is `explainNextRung`, the reading the Faith
 * sheet's empty place and the old Faith row printed as a sentence
 * (`nextRungWords`). Nothing here composes a total of its own.
 *
 * The screen registry
 * -------------------
 * The open card is registered as a card in the screen registry
 * (`screenRegistry.ts`). Opening it calls `onOpen`, which `main.ts` wires to
 * `screens.opening('drawer')`, so the open card closes the other cards and
 * screens, and any card or screen opening closes it. A quick button opens a
 * screen, so a press on one also folds the card back up.
 *
 * Keyboard
 * --------
 * Opening the card moves the keyboard to the first row (Research), Tab and
 * Shift-Tab wrap inside the whole card (the top part, the quick buttons and the
 * rows), and closing it while the keyboard is inside puts the keyboard back on
 * the top part. Every listener is bound with one `AbortController` and removed
 * by `dispose`, which `main.ts` puts in `gameDisposers`.
 *
 * Supply: why the counts are not always on the board
 * --------------------------------------------------
 * Until batch UX3 the strategic resource counts sat in a card that was always
 * on screen (the holdings rail), under a rule its docblock recorded: a player
 * should be able to answer "can I build another horseman?" without clicking
 * anything (`docs/strategic-resources-proposal.md` §7). The user reversed that
 * rule on 2026-10-15 (`docs/flags.md` (ssssss) 1): the counts moved into this
 * panel's Supply section and to the head of each town's build list, where
 * building decisions are made. The case that needs attention without a click is
 * a resource with no spare copy, and that lights the red dot on the banner.
 */

import { diplomacyMarkDataUri, standingsMarkDataUri, tradeMarkDataUri } from '../art/dockMarks';
import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import { seatInks } from '../art/seatInks';
import { yieldMarkDataUri } from '../art/yieldMarks';
import { turnsToFill } from '../sim/cities';
import type { Game } from '../sim/game';
import { seatName } from '../sim/leaderData';
import { readEmpire } from '../sim/readings';
import { type NextRung, explainNextRung, hasReligionOffer, nextRungWords } from '../sim/religion';
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
import { tabFigures } from './topBar';
import { type CopyCount, copiesFigureNode, strategicHoldings } from './resourceCopies';

// --- opening and closing -----------------------------------------------------

/**
 * What can happen to the card.
 *
 * - `toggle`: a click or tap on the top part, Enter on it, or Q.
 * - `close`: Escape, a press outside the card, or another card or screen
 *   opening (a quick button opens one).
 */
export type PanelEvent = 'toggle' | 'close';

/** Whether the card is open after an event. */
export function panelStep(open: boolean, event: PanelEvent): boolean {
  return event === 'toggle' ? !open : false;
}

// --- what is owed ------------------------------------------------------------

/**
 * Is Statecraft waiting on this seat? A draft, a Doctrine offer or a charter to
 * swear.
 *
 * Delegates to `hasStatecraftOffer`, the simulation's own definition of
 * "something is waiting". This function only adds what a missing seat means:
 * nothing is waiting for a seat that is not there. It feeds the banner's dot
 * and the Culture row's owed line.
 */
export function statecraftOwed(player: Player | undefined): boolean {
  return player !== undefined && hasStatecraftOffer(player);
}

/**
 * Is a belief waiting to be chosen? The Faith button's dot.
 *
 * Only a decision lights it, never a rite the seat could afford, which would be
 * true on most turns (`docs/flags.md` (ssssss) 4.7). Delegates to
 * `hasReligionOffer` for `statecraftOwed`'s reason.
 */
export function beliefOwed(player: Player | undefined): boolean {
  return player !== undefined && hasReligionOffer(player);
}

/**
 * The four things that light the banner's red dot: a card to pick (a draft or a
 * Doctrine offer), a charter to swear, a belief to choose, and a strategic
 * resource with no spare copy.
 */
type OwedDecision = 'card' | 'charter' | 'belief' | 'supply';

/** Each cause, in the words the panel's accessible name uses. */
export const OWED_WORDS: Readonly<Record<OwedDecision, string>> = {
  card: 'a card to pick',
  charter: 'a charter to swear',
  belief: 'a belief to choose',
  supply: 'a strategic resource with none spare',
};

// --- the readings ------------------------------------------------------------

/** Where the seat's research stands. */
type ResearchStage = 'learning' | 'choosing' | 'finished';

interface ResearchGlance {
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

interface DraftGlance {
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

interface WagerGlance {
  /** Bars on the table this age; nought when this age dealt none. */
  dealt: number;
  /** How many of them this seat has met. */
  met: number;
}

/** The figure on the Faith button, and what it says aloud. */
interface FaithFigure {
  /** "51/60", "full", or nothing at all when no figure is true. */
  text: string;
  /** The simulation's own sentence (`nextRungWords`): the title and the name. */
  words: string;
  /** True when a god is waiting to be named, which is the button's dot. */
  owed: boolean;
}

/** The figure on the Routes button: the top bar's Trade figure. */
interface RoutesFigure {
  /** "1/3": routes running, against the routes the empire's markets allow. */
  text: string;
  /** "Trade: 1 of 3 routes running". */
  words: string;
}

/** Everything the corner panel prints for one seat. */
interface EmpireGlance {
  playerId: number;
  seatName: string;
  research: ResearchGlance;
  draft: DraftGlance;
  faith: FaithFigure;
  routes: RoutesFigure;
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
 * The Faith button's figure, out of the next-rung reading.
 *
 * "51/60" is the faith banked against the next god's price, both of them the
 * reading's own figures. The other three states have no such pair: a god
 * waiting to be named (the dot says so), a full pantheon, and a pantheon whose
 * next place a technology has still to open. Those print no figure, or the one
 * word, and the button's title and name carry the reading's whole sentence.
 */
export function faithFigure(reading: NextRung): FaithFigure {
  const words = nextRungWords(reading);
  if (reading.kind === 'open') {
    return { text: `${figure(reading.banked)}/${figure(reading.cost)}`, words, owed: false };
  }
  if (reading.kind === 'full') return { text: 'full', words, owed: false };
  return { text: '', words, owed: reading.kind === 'waiting' };
}

/**
 * Everything the corner panel prints for this seat, or `null` for a seat that
 * is not there.
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
  const bar = tabFigures(state, playerId);
  return {
    playerId,
    seatName: seatName(state, playerId),
    research: researchGlance(state, player),
    draft,
    faith: faithFigure(explainNextRung(state, playerId, readEmpire(state, playerId).totals.faith)),
    routes: { text: bar.routes, words: bar.routesSpoken },
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

/** The line at the foot of the open card: the way out. */
export const CLOSE_HINT = 'Q or Esc closes';

/** "1 turn", "3 turns", "this turn", or what a missing rate means. */
function turnsPhrase(turns: number | null, never: string): string {
  if (turns === null) return never;
  if (turns === 0) return 'this turn';
  return turns === 1 ? '1 turn' : `${turns} turns`;
}

/** The research half of the panel's accessible name. */
function researchWords(research: ResearchGlance): string {
  if (research.stage === 'choosing') return 'nothing being researched';
  if (research.stage === 'finished') return 'every technology researched';
  return `researching ${research.name}, ${turnsPhrase(research.turns, 'no science being made')}`;
}

/** The draft half of the panel's accessible name. */
function draftWords(draft: DraftGlance): string {
  if (draft.turns === null) return 'no culture being made';
  if (draft.turns === 0) return 'next draft this turn';
  return `next draft in ${turnsPhrase(draft.turns, '')}`;
}

/**
 * The top part's accessible name: "Your empire: researching Code of Laws, 1
 * turn; next draft in 2 turns", and what is waiting, when anything is.
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

/** The Culture row's red line, or `null` when nothing is owed. */
export function cultureOwedWords(draft: DraftGlance): string | null {
  if (draft.owed === 'charter') return 'a charter is ready to be sworn';
  if (draft.owed === 'card') return 'a card awaits';
  return null;
}

/**
 * The Culture row's line: "120/450 · Tier 14 · next government at 18". The
 * draft's turns are on the top part already, beside its bar.
 */
export function draftFigures(draft: DraftGlance): string {
  return `${figure(draft.banked)}/${figure(draft.cost)} · ${tierWords(draft)}`;
}

/** The research rate after the star chart's figures: "+91 a turn", or nothing. */
export function researchRateWords(research: ResearchGlance): string {
  return research.stage === 'learning' ? `${signedFigure(research.rate)} a turn` : '';
}

/** "next: Mathematics", or nothing when nothing is queued. */
export function researchNextWords(research: ResearchGlance): string {
  return research.next === null ? '' : `next: ${research.next}`;
}

/** The age wager row's note: "2 of 3 bars met". */
export function wagerWords(wager: WagerGlance): string {
  if (wager.dealt === 0) return 'no wager this age';
  return `${wager.met} of ${wager.dealt} bars met`;
}

/**
 * The Leader row's note: the seat's name. It was the old drawer's heading,
 * which the open card no longer has; the board's "your civ" is the row's
 * accessible name instead, because both do not fit in 248 px.
 */
export function leaderWords(name: string): string {
  return name;
}

/** The turns after the top part's research bar: "1t", or a mark for the two other states. */
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

/** The four quick buttons, in the board's order, and the screen each opens. */
export const QUICK_BUTTONS = ['diplomacy', 'routes', 'faith', 'standings'] as const;
export type QuickButton = (typeof QUICK_BUTTONS)[number];

// --- the surface -------------------------------------------------------------

interface EmpireDrawerOptions {
  /** The whole card, `#empire-corner`. */
  corner: HTMLElement;
  /** The top part, `#empire-panel`: one button. */
  panel: HTMLButtonElement;
  /** The open part, `#empire-drawer`. Hidden with `hidden` while closed. */
  drawer: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  /** The card is opening. `main.ts` tells the screen registry. */
  onOpen: () => void;
  /** The card opened or closed, so the tutorial's ring can move with it. */
  onChange?: () => void;
  /** The Culture row's door (C). */
  openStatecraft: () => void;
  /** The Leader row's door (L). */
  openLeader: () => void;
  /** The age wager row's door: the wager's one standing way in. */
  openWager: () => void;
  /** The four quick buttons' doors: Diplomacy (W), Routes (E), Faith (H), Standings. */
  openQuick: Readonly<Record<QuickButton, () => void>>;
}

export interface EmpireDrawer {
  /** True while the card is open. What the screen registry and Escape ask. */
  readonly isOpen: boolean;
  /** Opens the card, or closes it when it is open. Q, and a press on the top part. */
  toggle(): void;
  /** Closes it. Safe on a closed card. */
  close(): void;
  /** Re-reads the seat, and rewrites what changed. Called with the rest of the HUD. */
  render(): void;
  /** Removes every listener. Registered in `gameDisposers`. */
  dispose(): void;
}

/** Controls that can hold the keyboard inside the card. */
const FOCUSABLE = 'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

/** Each quick button's mark: the top bar's tab marks, and the faith yield's candle. */
const QUICK_MARKS: Readonly<Record<QuickButton, () => string>> = {
  diplomacy: () => diplomacyMarkDataUri(),
  routes: () => tradeMarkDataUri(),
  faith: () => yieldMarkDataUri('faith'),
  standings: () => standingsMarkDataUri(),
};

export function createEmpireDrawer(options: EmpireDrawerOptions): EmpireDrawer {
  const { corner, panel, drawer, getGame, localPlayerId } = options;

  // The top part's parts. The technology's name is the star chart's.
  const banner = requireElement('empire-banner');
  const researchBar = requireElement('empire-research-bar');
  const researchFill = requireElement('empire-research-fill');
  const researchTurns = requireElement('empire-research-turns');
  const draftFill = requireElement('empire-draft-fill');
  const draftTurns = requireElement('empire-draft-turns');
  // The quick buttons.
  const quick: Record<QuickButton, HTMLButtonElement> = {
    diplomacy: requireElement<HTMLButtonElement>('quick-diplomacy'),
    routes: requireElement<HTMLButtonElement>('quick-routes'),
    faith: requireElement<HTMLButtonElement>('quick-faith'),
    standings: requireElement<HTMLButtonElement>('quick-standings'),
  };
  const routesFigure = requireElement('quick-routes-figure');
  const faithFigureEl = requireElement('quick-faith-figure');
  // The open part's parts. The research row's figures are the star chart's.
  const researchRate = requireElement('research-rate');
  const researchNext = requireElement('research-next');
  const culture = requireElement<HTMLButtonElement>('drawer-culture');
  const cultureFigures = requireElement('culture-figures');
  const cultureOwed = requireElement('culture-owed');
  const leaderRow = requireElement<HTMLButtonElement>('drawer-leader');
  const leaderNote = requireElement('drawer-leader-note');
  const wagerRow = requireElement<HTMLButtonElement>('drawer-wager');
  const wagerNote = requireElement('drawer-wager-note');
  const supplyList = requireElement('drawer-supply');
  const supplyCaption = requireElement('drawer-supply-caption');

  supplyCaption.textContent = SUPPLY_CAPTION;
  requireElement('drawer-close-hint').textContent = CLOSE_HINT;
  for (const name of QUICK_BUTTONS) {
    const mark = quick[name].querySelector<HTMLElement>('.quick-mark');
    mark?.style.setProperty('--quick-mark', `url("${QUICK_MARKS[name]()}")`);
  }

  let open = false;

  // What the last render drew for. `-1` is "nothing drawn yet".
  let drawnState: GameState | null = null;
  let drawnRevision = -1;
  let drawnSeat = -1;
  let drawnSupply = '';

  const listening = new AbortController();
  const { signal } = listening;

  /** False while the card is not drawn at all, as on the city screen. */
  function shown(): boolean {
    return panel.getClientRects().length > 0;
  }

  /** Every control in the card the keyboard can stand on, in order. */
  function focusables(): HTMLElement[] {
    return Array.from(corner.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => node.getClientRects().length > 0,
    );
  }

  function setOpen(next: boolean): void {
    if (next === open) return;
    // Asked before the rows are hidden: once they are, the browser has already
    // moved the keyboard off whatever was inside them.
    const heldKeyboard = drawer.contains(document.activeElement);
    open = next;
    drawer.hidden = !next;
    corner.classList.toggle('is-open', next);
    panel.classList.toggle('is-open', next);
    panel.setAttribute('aria-expanded', String(next));
    if (next) {
      options.onOpen();
      // The first row rather than the top part: a card that opens with the
      // keyboard on its own toggle opens with nothing to read.
      drawer.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    } else if (heldKeyboard) {
      // Closing with the keyboard on a row puts it back on the top part. A row
      // that opened a screen has its keyboard taken by that screen next.
      panel.focus({ preventScroll: true });
    }
    options.onChange?.();
  }

  function toggle(): void {
    // A stood-down card (the city screen) opens nothing: rows nobody can see
    // would still swallow the next Escape.
    if (!open && !shown()) return;
    setOpen(panelStep(open, 'toggle'));
  }

  function close(): void {
    setOpen(panelStep(open, 'close'));
  }

  // A click, a tap, Enter and Space all arrive here as the button's click.
  panel.addEventListener('click', () => toggle(), { signal });

  // A press outside the card closes it. Captured, so the card has folded before
  // the board starts a drag under it, and so a handler that stops the press
  // cannot keep it open.
  window.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target as Node | null;
      if (target !== null && corner.contains(target)) return;
      if (open) close();
    },
    { capture: true, signal },
  );

  // Open, Tab and Shift-Tab wrap inside the card, as on every HUD card.
  corner.addEventListener(
    'keydown',
    (event) => {
      if (!open || event.key !== 'Tab') return;
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

  // The research row's click is the star chart's own (`techTree.ts`). Each of
  // these opens a screen, and the screen's opening closes the card.
  culture.addEventListener('click', () => options.openStatecraft(), { signal });
  leaderRow.addEventListener('click', () => options.openLeader(), { signal });
  wagerRow.addEventListener('click', () => options.openWager(), { signal });
  for (const name of QUICK_BUTTONS) {
    quick[name].addEventListener('click', () => options.openQuick[name](), { signal });
  }
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
    button.append(element('span', 'drawer-supply-name', count.name), copiesFigureNode(count));
    button.title = `${count.name} in the Compendium`;
    item.append(button);
    return item;
  }

  function paintBanner(glance: EmpireGlance): void {
    const player = playerById(getGame().state, glance.playerId);
    // The seat's own colour fills the bookmark the board draws, and the seat's
    // charge sits in ink on its parchment canton (the heraldry rule: a charge
    // never sits straight on seat ink). The canton is larger than the board's
    // six pixels, so the charge can be read; it was on the panel before.
    const uri = heraldryMarkDataUri(heraldryFor(glance.playerId, player?.charge, player?.leader));
    banner.style.setProperty('--banner-mark', `url("${uri}")`);
    const ink = seatInks(player).primary;
    if (ink.length > 0) banner.style.setProperty('--seat-ink', ink);
    else banner.style.removeProperty('--seat-ink');
  }

  function paintTop(glance: EmpireGlance): void {
    const { research, draft } = glance;
    paintBanner(glance);
    banner.classList.toggle('is-owed', glance.owed.length > 0);
    researchBar.classList.toggle('is-prompting', research.stage === 'choosing');
    researchBar.classList.toggle('is-finished', research.stage === 'finished');
    researchFill.style.width = `${(research.fraction * 100).toFixed(1)}%`;
    researchTurns.textContent = researchTurnsMark(research);
    draftFill.style.width = `${(draft.fraction * 100).toFixed(1)}%`;
    draftTurns.textContent = turnsLabel(draft.turns);
    panel.setAttribute('aria-label', panelLabel(glance));
  }

  function paintQuick(glance: EmpireGlance): void {
    const { faith, routes } = glance;
    routesFigure.textContent = routes.text;
    routesFigure.classList.toggle('is-long', routes.text.length > 5);
    quick.routes.setAttribute('aria-label', `${routes.words}. Opens the trade routes (E)`);
    quick.routes.title = `${routes.words} (E)`;
    faithFigureEl.textContent = faith.text;
    faithFigureEl.hidden = faith.text === '';
    faithFigureEl.classList.toggle('is-long', faith.text.length > 5);
    quick.faith.classList.toggle('is-owed', faith.owed);
    quick.faith.setAttribute('aria-label', `Faith: ${faith.words}. Opens the Faith sheet (H)`);
    quick.faith.title = `${faith.words} (H)`;
    quick.diplomacy.setAttribute('aria-label', 'Diplomacy. Opens the Diplomacy sheet (W)');
    quick.diplomacy.title = 'Diplomacy (W)';
    quick.standings.setAttribute('aria-label', 'Standings. Opens the standings sheet');
    quick.standings.title = 'Standings';
  }

  function paintRows(glance: EmpireGlance): void {
    const { research, draft } = glance;
    // The research row's rate and next. Its figures are the star chart's.
    researchRate.textContent = researchRateWords(research);
    researchNext.textContent = researchNextWords(research);

    // The culture row.
    const owedLine = cultureOwedWords(draft);
    cultureFigures.textContent = draftFigures(draft);
    cultureOwed.hidden = owedLine === null;
    cultureOwed.textContent = owedLine ?? '';
    culture.classList.toggle('is-owed', owedLine !== null);
    culture.setAttribute(
      'aria-label',
      `Culture: next draft ${draft.banked} of ${draft.cost}, ${turnsPhrase(draft.turns, 'no culture being made')}; ` +
        `${tierWords(draft)}${owedLine === null ? '' : `; ${owedLine}`}. Opens Statecraft.`,
    );

    leaderNote.textContent = leaderWords(glance.seatName);
    leaderRow.setAttribute('aria-label', `Leader: ${glance.seatName}, your civ. Opens your civ's sheet (L)`);
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
    paintTop(glance);
    paintQuick(glance);
    paintRows(glance);
  }

  // The closed state, written once, so the markup's defaults do not matter.
  drawer.hidden = true;
  panel.setAttribute('aria-expanded', 'false');

  return {
    get isOpen(): boolean {
      return open;
    },
    toggle,
    close,
    render,
    dispose(): void {
      listening.abort();
      close();
      drawnState = null;
      drawnSupply = '';
    },
  };
}
