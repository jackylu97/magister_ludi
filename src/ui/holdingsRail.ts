/**
 * The holdings rail: **what strategic resources this empire has, and how much of
 * each is still free**, in the HUD where it can be read without opening
 * anything.
 *
 * Why this exists
 * ---------------
 * Batch R1 made a strategic resource something an empire *spends*: a unit that
 * needs one holds a copy while it lives, and a queued row holds one too. Nothing
 * on the screen said so. `docs/strategic-resources-proposal.md` §7 names that as
 * the way the whole model fails:
 *
 *   *"It becomes bookkeeping. The model only earns its place if a player can see
 *   it at a glance and plan around it. If the counts are buried in a submenu,
 *   all it does is refuse people."*
 *
 * So the test this rail has to pass is one sentence: a player should be able to
 * answer *"can I build another horseman?"* without clicking anything.
 *
 * Why here and not the top bar
 * ----------------------------
 * §5 of the proposal offered two homes, the top bar or the Ledger. Neither was
 * taken, and both for measurable reasons.
 *
 * The **top bar** cannot afford seven more items. It already carries six yield
 * chips, two meters, renown, the age, the beads and the routes, and it has two
 * declared steps of shrinking to get through (`STRIP_FIT_STEPS` in `topBar.ts`,
 * driven by a `ResizeObserver` because the row runs out of width on a real
 * window in a real game). Seven resource chips beside those would push the strip
 * to its tightest step on every screen and make the empire's yields harder to
 * read in exchange — a net loss, since yields are checked far more often.
 *
 * The **Ledger** is a full-screen sheet opened by clicking a chip. Putting the
 * counts there fails the one test above by construction: it is a submenu, which
 * is the thing §7 says not to do.
 *
 * What is left is the HUD's left column, which is where this game already puts a
 * *standing* question. The research card is there because research "is the one
 * decision a player checks every single turn"; the dock is under it because
 * Statecraft and Religion are the same kind of standing concern. Army supply is
 * that kind of question too, and the column has room under the dock that nothing
 * else is using. It sits directly above where a city panel's build list will
 * refuse you, in the same parchment lozenge language, and it is visible while
 * the board is — which is when a player is deciding where to settle and what to
 * train.
 *
 * What it shows
 * -------------
 * One row per strategic resource the empire holds or has spent (see
 * `strategicHoldings`), the drawn mark and the name, then the pair of figures:
 * copies still free over copies controlled. A row with nothing spare is drawn in
 * the same vermilion every other surface in this interface uses for a lack.
 *
 * The card **hides itself outright** when there is nothing to say. An empire on
 * turn 5 has no strategic resources and does not need a card of dashes telling
 * it so; it meets the rule when a build row refuses it, and the card appears on
 * the turn the first mine opens.
 *
 * Kept fresh by the fingerprint, not by the frame
 * -----------------------------------------------
 * The counts change when the world moves and at no other time, so the rail is
 * re-read on `GameState.revision` plus the seat — the same two facts the rest of
 * the HUD's derived readouts watch. `render` is called from `updatePanel`, which
 * runs on pointer movement, so a rail that swept the army and rewrote a dozen
 * nodes per mouse-move would be doing work nobody asked for; the fingerprint
 * makes all of those a pair of integer comparisons.
 *
 * `availableCopies` is deliberately not memoised in the simulation (see its
 * docblock — neither clock is safe for it), which is the other half of why the
 * fingerprint is here rather than there: a readout taken at rest may remember,
 * a rule read inside a phase may not.
 *
 * It owns its own element
 * -----------------------
 * Every other fixed HUD surface is markup in `index.html` that a module fills.
 * This one builds its container and hands it to `main.ts` to mount, because
 * batch R4's fence is `src/ui/` and `src/main.ts`. Nothing else about it
 * differs: it is pinned by the same `--research-card-h` / `--hud-dock-h`
 * arithmetic the dock is, in `src/style.css`.
 */

import type { Game } from '../sim/game';
import { type CopyCount, copiesFigureNode, strategicHoldings } from './resourceCopies';
import { resourceMarkNode } from './resourceMark';
import { element } from './dom';

export interface HoldingsRail {
  /** The fixed card. `main.ts` mounts it; nothing else touches it. */
  readonly root: HTMLElement;
  /** Re-reads the seat's holdings and rewrites the rows that changed. */
  render(): void;
}

export interface HoldingsRailOptions {
  getGame: () => Game;
  localPlayerId: () => number;
}

/** The caption under the rows — what the two figures are, in plain words. */
export const HOLDINGS_CAPTION = 'spare of what you hold';

/** The rail's own heading. Plain, and the words the Compendium's shelf uses. */
export const HOLDINGS_EYEBROW = 'strategic resources';

/**
 * The rail as a string of rows, for a test and for the one place a fingerprint
 * is compared.
 *
 * A row is its resource, its two figures and nothing else, so two readings that
 * would draw the same card compare equal. The seat is in the key because taking
 * another chair is exactly a change of holdings with no change of state.
 */
export function holdingsFingerprint(rows: readonly CopyCount[], playerId: number): string {
  return `${playerId}|${rows.map((row) => `${row.id}:${row.spare}/${row.held}`).join(',')}`;
}

export function createHoldingsRail(options: HoldingsRailOptions): HoldingsRail {
  const { getGame, localPlayerId } = options;

  const root = element('div', 'hud-card holdings-rail');
  root.id = 'hud-holdings';
  root.setAttribute('aria-label', 'Strategic resources your empire holds');
  root.hidden = true;

  const head = element('p', 'eyebrow holdings-eyebrow', HOLDINGS_EYEBROW);
  const list = element('ul', 'holdings-list');
  const caption = element('p', 'hint holdings-caption', HOLDINGS_CAPTION);
  root.append(head, list, caption);

  // What was last drawn, so a pointer move over the board costs two integer
  // comparisons rather than a walk of the army. `-1` is "nothing drawn yet",
  // which no real revision can be.
  let drawnRevision = -1;
  let drawnSeat = -1;
  let drawnRows = '';

  function row(count: CopyCount): HTMLElement {
    const item = element('li', 'holdings-row');
    // The mark is `aria-hidden` and the name is beside it, exactly as every
    // other surface prints a resource — a reader that read both would say the
    // thing twice.
    const mark = element('span', 'holdings-mark');
    mark.append(resourceMarkNode(count.id));
    item.append(mark);
    item.append(element('span', 'holdings-name', count.name));
    item.append(copiesFigureNode(count));
    return item;
  }

  function render(): void {
    const { state } = getGame();
    const seat = localPlayerId();
    if (state.revision === drawnRevision && seat === drawnSeat) return;
    drawnRevision = state.revision;
    drawnSeat = seat;

    const rows = strategicHoldings(state, seat);
    // The card is the whole of its own state: an empire with nothing to report
    // gets no card rather than a card of dashes.
    root.hidden = rows.length === 0;
    if (rows.length === 0) {
      drawnRows = '';
      list.replaceChildren();
      return;
    }
    // Rebuilt only when the rows themselves changed. The revision moves on every
    // accepted command, and almost none of them touch a copy.
    const printed = holdingsFingerprint(rows, seat);
    if (printed === drawnRows) return;
    drawnRows = printed;
    list.replaceChildren(...rows.map(row));
  }

  return { root, render };
}
