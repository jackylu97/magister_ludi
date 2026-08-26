/**
 * The HUD dock: two square buttons under the research card, top-left, in the
 * same ink/parchment lozenge language — the front door to Statecraft and to
 * Religion.
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
 * Both buttons open a screen now
 * -------------------------------
 * Each is a **bare trigger** — `main.ts` wires the click to
 * `statecraft.open()` / `religion.open()`, the same calls the ☰ menu's own
 * doors use, because opening a *screen* means closing every other HUD surface
 * first and this module has no business knowing what those are.
 *
 * The Religion button used to own a small Faith popover built here, because
 * religion had no screen and a permanent card was a promise about where the
 * system would live. Religion v1 (ledger Entry XXVIII) is that screen, and the
 * popover's whole content — the pool and its rate, in the same figures — is now
 * the first block of `religionScreen.ts`. The prediction that docblock made
 * held exactly: the seam was this module's `close()`/`isOpen` pair and one line
 * in `main.ts`, and the button itself did not change.
 *
 * The Religion button's icon: a reuse, not a second drawing
 * ------------------------------------------------------------
 * The screen behind it is *about* faith — its pool, what buys an augur, what an
 * augur buys — so the button wears faith's own flame
 * (`yieldMarkDataUri('faith')`, `src/art/yieldMarks.ts`) rather than a new icon
 * picked to mean roughly the same thing. One identity, one drawing. Statecraft's
 * scroll is vendored fresh beside it in `src/art/dockMarks.ts`.
 */

import { statecraftMarkDataUri } from '../art/dockMarks';
import type { Game } from '../sim/game';
import { hasReligionOffer } from '../sim/religion';
import { hasStatecraftOffer } from '../sim/statecraft';
import { type Player, playerById } from '../sim/state';
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

/**
 * Is Religion owed a look? The other button's badge, and the same shape.
 *
 * Delegates to `hasReligionOffer` for `hudBadgeWaiting`'s reason: what counts as
 * an outstanding decision is the simulation's own definition (a belief offer
 * awaiting a pick, today), and this function's whole job is to say what a
 * missing player means for it.
 */
export function religionBadgeWaiting(player: Player | undefined): boolean {
  return player !== undefined && hasReligionOffer(player);
}

export interface HudDockOptions {
  /** The dock's own element — two buttons, built once and never rebuilt. */
  container: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
}

export interface HudDock {
  /** The two bare triggers. `main.ts` wires their clicks — see the docblock. */
  readonly statecraftButton: HTMLButtonElement;
  readonly religionButton: HTMLButtonElement;
  /** Refreshes both badges. */
  render(): void;
}

/**
 * Icon-only: `title` is the hover tooltip and `aria-label` is the accessible
 * name, so a screen reader or a mouseover both still say "Statecraft (C)" /
 * "Religion (H)" even though nothing is printed on the button itself. `label`
 * is no longer laid out — see the module docblock's note on this pass — but
 * stays a parameter so a caller reads as "this button means X" at the call
 * site, not just "here is a tooltip string".
 */
function buildButton(id: string, _label: string, title: string, markUri: string): HTMLButtonElement {
  const button = element('button', 'hud-dock-btn');
  button.type = 'button';
  button.id = id;
  button.title = title;
  button.setAttribute('aria-label', title);
  const icon = element('span', 'hud-dock-icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.style.setProperty('--dock-mark', `url("${markUri}")`);
  button.append(icon);
  return button;
}

export function createHudDock(options: HudDockOptions): HudDock {
  const { container, getGame, localPlayerId } = options;

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

  return {
    statecraftButton,
    religionButton,
    render(): void {
      const { state } = getGame();
      const player = playerById(state, localPlayerId());
      statecraftButton.classList.toggle('hud-badge-waiting', hudBadgeWaiting(player));
      // The same dot on the other button, for the same reason: a belief offer
      // is a decision the empire owes the game, and the front door is where a
      // player is told there is one.
      religionButton.classList.toggle('hud-badge-waiting', religionBadgeWaiting(player));
    },
  };
}
