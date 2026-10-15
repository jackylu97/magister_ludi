/**
 * The HUD dock: three square buttons under the research card, top-left, in the
 * same ink and parchment as the rest of the HUD. They open Statecraft, Religion
 * and the leader sheet ("your civ").
 *
 * Diplomacy, Trade and the standings had doors here too until batch UX1. They
 * are labelled tabs at the right end of the top bar now (`topBar.ts`), as the
 * screens about the other empires; the dock keeps the screens about this one.
 * The dock itself goes in batch UX3, when the empire panel and its drawer take
 * over these three doors (`docs/plans/hud-empire-panel-spec.md` §4).
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
 * different things. The culture chip keeps its own hint line ("press C") in
 * its hover card; only the pulsing dot moved. `hudBadgeWaiting` below is the
 * pure half of that fact, kept separate from the DOM write so it can be
 * tested without one.
 *
 * Every button opens a screen
 * ---------------------------
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
import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import type { Game } from '../sim/game';
import { hasReligionOffer } from '../sim/religion';
import { hasStatecraftOffer } from '../sim/statecraft';
import { type Player, playerById } from '../sim/state';
import { yieldMarkDataUri } from '../art/yieldMarks';
import { element } from './dom';

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
  /** The dock's own element — three buttons, built once and never rebuilt. */
  container: HTMLElement;
  getGame: () => Game;
  localPlayerId: () => number;
}

export interface HudDock {
  /** The three bare triggers. `main.ts` wires their clicks — see the docblock. */
  readonly statecraftButton: HTMLButtonElement;
  readonly religionButton: HTMLButtonElement;
  /**
   * The leader door (batch L2b, `docs/flags.md` (dddd)).
   *
   * The only one of the three that wears **the seat's own charge** rather than
   * a drawn mark of its own: the sheet behind it is about the figure at *your*
   * table, and heraldry is already the game's way of saying "yours"
   * (`heraldryFor`, and the charge on a parchment canton — never straight in
   * seat ink). So its icon is written on every `render` rather than once at
   * construction: a hot-seat player changing chairs changes banners.
   *
   * It wears **no waiting badge** (batch L6b): a figure is a known quantity
   * from the landing screen on, and the sheet behind this door is a record
   * rather than a decision.
   */
  readonly leaderButton: HTMLButtonElement;
  /** Refreshes the badges. */
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
  // An empty mark is the leader door's, and it is deliberate: its icon is the
  // *seat's* charge, which is a fact about a game that does not exist yet at
  // construction, so it is written on the first `render` instead of here. A
  // `url("")` in the meantime would be a mask that fails rather than one that
  // has not arrived.
  if (markUri.length > 0) icon.style.setProperty('--dock-mark', `url("${markUri}")`);
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
  // The leader door, third. Its mark is written on every `render` rather than
  // here, because it is the seat's charge and the seat can change — see
  // `HudDock.leaderButton`.
  const leaderButton = buildButton('hud-dock-leader', 'Leader', 'Your leader', '');
  container.append(statecraftButton, religionButton, leaderButton);

  return {
    statecraftButton,
    religionButton,
    leaderButton,
    render(): void {
      const { state } = getGame();
      const player = playerById(state, localPlayerId());
      statecraftButton.classList.toggle('hud-badge-waiting', hudBadgeWaiting(player));
      // The same dot on the other button, for the same reason: a belief offer
      // is a decision the empire owes the game, and the front door is where a
      // player is told there is one.
      religionButton.classList.toggle('hud-badge-waiting', religionBadgeWaiting(player));
      // **The banner, redrawn** — the one door whose icon is a fact about the
      // seat rather than about the system. A seat with no figure keeps the door:
      // the sheet behind it says so in a sentence, which is a better answer than
      // a door that is there in one game and gone in the next.
      const icon = leaderButton.firstElementChild;
      if (icon instanceof HTMLElement) {
        // The mark's own colour is discarded — `.hud-dock-icon` wears it as a
        // *mask* over `currentColor`, so the charge prints in the dock's ink
        // like the two doors beside it and never straight in seat ink, which
        // is the heraldry rule kept by the drawing rather than by discipline.
        const uri = heraldryMarkDataUri(heraldryFor(localPlayerId(), player?.charge, player?.leader));
        icon.style.setProperty('--dock-mark', `url("${uri}")`);
      }
      // **No dot on the banner** (batch L6b): a figure is a known quantity from
      // the landing screen, and the sheet behind this door is a record rather
      // than a decision — there is nothing for the seat to answer, so there is
      // nothing to be told about.
    },
  };
}
