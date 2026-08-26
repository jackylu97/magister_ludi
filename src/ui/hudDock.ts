/**
 * The HUD dock: two square buttons under the research card, top-left, in the
 * same ink/parchment lozenge language — the front door to Statecraft and to
 * whatever Religion becomes.
 *
 * Why a dock and not two more chips
 * ----------------------------------
 * The research card earned a fixed corner of its own because it is "the one
 * decision a player checks every single turn" (its own docblock). Statecraft
 * is close behind it — a drafted Order or a banked charter is exactly that
 * kind of standing question — and Religion is being seated at the table
 * before it has a screen, on the same reasoning the design ledger gives the
 * research card: a permanent card is a promise about where a system lives,
 * made before the system is finished earning it. Two buttons, not two more
 * entries crowded onto the culture chip's hover card, because "front and
 * center" is a claim about position on the screen, not about how deep a
 * click goes.
 *
 * One badge, not two
 * -------------------
 * Statecraft's waiting badge (`hasStatecraftOffer`) used to pulse on the top
 * bar's culture chip (`topBar.ts`, before this file existed). It has moved
 * here rather than being drawn twice: this dock is now the more prominent of
 * the two entrances — a fixed corner beats a chip in a scrolling strip — and
 * a player told the same thing in two places starts wondering if they are two
 * different things. The culture chip keeps its click affordance
 * (`civ-yield-clickable` in `topBar.ts`) and its own hint line ("press C") in
 * its hover card; only the pulsing dot moved. `hudBadgeWaiting` below is the
 * pure half of that fact, kept separate from the DOM write so it can be
 * tested without one.
 *
 * Statecraft opens a screen; Religion opens a card
 * --------------------------------------------------
 * The Statecraft button is a bare trigger — `main.ts` wires its click to
 * `statecraft.open()`, the same call the ☰ menu's own door uses, because
 * opening a *screen* means closing every other HUD surface first and this
 * module has no business knowing what those are. Religion has no screen yet,
 * so its button owns a small popover itself, built the same way the top bar
 * builds its meter cards (`topBar.ts`'s `happinessCard`/`authorityCard`): a
 * `createPopover` wired to elements `main.ts` hands in, content rebuilt on
 * open and kept live for as long as the card stays open. When religion lands,
 * the seam is exactly this module's `HudDock.close()`/`isOpen` pair plus the
 * one line in `main.ts` that opens the popover — the button itself does not
 * change.
 *
 * The Religion button's icon: a reuse, not a second drawing
 * ------------------------------------------------------------
 * The button *is* the faith screen for now — there is nothing behind it that
 * is not already summarised on the card — so it wears faith's own flame
 * (`yieldMarkDataUri('faith')`, `src/art/yieldMarks.ts`) rather than a new
 * icon picked to mean roughly the same thing. One identity, one drawing.
 * Statecraft's scroll is vendored fresh beside it in `src/art/dockMarks.ts`.
 */

import { statecraftMarkDataUri } from '../art/dockMarks';
import type { Game } from '../sim/game';
import { hasStatecraftOffer } from '../sim/statecraft';
import { type GameState, type Player, playerById } from '../sim/state';
import { civYields } from './topBar';
import { poolFigure } from './figures';
import { type Popover, createPopover } from './popover';
import { yieldMarkDataUri } from '../art/yieldMarks';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * Is Statecraft owed a look? The dock button's badge, factored out of the DOM
 * write so it is testable without one — see `test/ui/hudDock.test.ts`.
 *
 * Delegates to `hasStatecraftOffer` rather than reading `player.statecraft`
 * itself: a draft, a Doctrine draw or a banked government are the sim's own
 * definition of "something is waiting" (`src/sim/statecraft.ts`), and this
 * function's whole job is to say what a missing player means for it — nothing
 * is waiting for a seat that is not there.
 */
export function hudBadgeWaiting(player: Player | undefined): boolean {
  return player !== undefined && hasStatecraftOffer(player);
}

export interface HudDockFaithElements {
  /** The card itself. Hidden with the `hidden` attribute while closed. */
  panel: HTMLElement;
  /** Filled fresh on every open, and kept live while the card stays open. */
  body: HTMLElement;
  /** The card's own × button — every popover in this HUD has one. */
  closeButton: HTMLElement;
}

export interface HudDockOptions {
  /** The dock's own element — two buttons, built once and never rebuilt. */
  container: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
  faith: HudDockFaithElements;
  /** Told whenever the Faith card opens, so the HUD's other one-at-a-time
   *  cards can shut — the same contract `CivYieldStripOptions.onOpenPopover`
   *  keeps for the meter cards. */
  onOpenPopover?: () => void;
}

export interface HudDock {
  /** The bare trigger. `main.ts` wires its click — see the module docblock. */
  readonly statecraftButton: HTMLButtonElement;
  readonly isOpen: boolean;
  close(): void;
  /** Opens or closes the Faith card — the `H` hotkey's way in, wired from
   *  `main.ts` alongside the dock's own standalone keydown listener (see
   *  that wiring's comment for why it is not one more branch in
   *  `controls.ts`'s switch). */
  toggle(): void;
  /** Refreshes the badge, and the Faith card's figures if it is open. */
  render(): void;
}

/** The "coming" list — Religion's own eyebrow line, from `docs/religion.md`. */
const FAITH_COMING = 'Augurs · Pantheons · Prophets';

/** The one sentence the Faith card says about what faith is for, today. */
const FAITH_IDENTITY = 'The faithful gather. Their purpose comes later.';

function buildButton(id: string, label: string, title: string, markUri: string): HTMLButtonElement {
  const button = element('button', 'hud-dock-btn');
  button.type = 'button';
  button.id = id;
  button.title = title;
  button.setAttribute('aria-label', title);
  const icon = element('span', 'hud-dock-icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.style.setProperty('--dock-mark', `url("${markUri}")`);
  const text = element('span', 'hud-dock-label', label);
  button.append(icon, text);
  return button;
}

/** Fills the Faith card's body: the pool, the identity line, the coming list. */
function renderFaithBody(body: HTMLElement, state: GameState, playerId: number): void {
  body.replaceChildren();
  const player = playerById(state, playerId);
  const rate = civYields(state, playerId).faith;
  const figures = element('div', 'meter-group');
  figures.append(
    element('span', 'meter-line-source', 'Gathered'),
    element('span', 'meter-line-value', player ? poolFigure(player.faithPool, rate) : '—'),
  );
  body.append(
    figures,
    element('p', 'hint', FAITH_IDENTITY),
    element('p', 'eyebrow', FAITH_COMING),
  );
}

export function createHudDock(options: HudDockOptions): HudDock {
  const { container, getGame, localPlayerId, faith, onOpenPopover } = options;

  container.replaceChildren();

  const statecraftButton = buildButton(
    'hud-dock-statecraft',
    'Statecraft',
    'Statecraft (C)',
    statecraftMarkDataUri(),
  );
  const religionButton = buildButton(
    'hud-dock-religion',
    'Religion',
    'Religion (H)',
    yieldMarkDataUri('faith'),
  );
  container.append(statecraftButton, religionButton);

  const faithCard: Popover = createPopover({
    panel: faith.panel,
    trigger: religionButton,
    closeButton: faith.closeButton,
    onOpen: () => {
      onOpenPopover?.();
      const { state } = getGame();
      renderFaithBody(faith.body, state, localPlayerId());
    },
  });

  return {
    statecraftButton,
    get isOpen() {
      return faithCard.isOpen;
    },
    close(): void {
      faithCard.close();
    },
    toggle(): void {
      faithCard.toggle();
    },
    render(): void {
      const { state } = getGame();
      const player = playerById(state, localPlayerId());
      statecraftButton.classList.toggle('hud-badge-waiting', hudBadgeWaiting(player));
      // An open card is showing figures from before whatever just happened —
      // the same reason the meter cards in `topBar.ts` re-render themselves
      // on every HUD refresh while they are up rather than only on open.
      if (faithCard.isOpen) renderFaithBody(faith.body, state, localPlayerId());
    },
  };
}
