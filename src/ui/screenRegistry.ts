/**
 * **The screen registry**: one list of every surface the game page can show,
 * and one rule for what closes when something opens (batch UX2; the spec is
 * `docs/plans/hud-empire-panel-spec.md` §9, step 2).
 *
 * Before this, `main.ts` carried a hand-written list in every surface's open
 * hook, each naming the other surfaces to close. There were about twenty of
 * them, they had drifted apart (the Compendium closed the Trade sheet but not
 * the Ledger; `C` left the chronicle open under Statecraft), and a new screen
 * had to be added to every one of them (`docs/plans/hud-audit.md`, problem 2).
 * Now each surface registers once with its kind, how to tell whether it is
 * open and how to close it. Its open hook calls `opening(name)`, and the rule
 * below decides the rest, so a surface opened by a key, a tab, a blocker or a
 * keyword link behaves the same way.
 *
 * Three kinds
 * -----------
 * - **card**: a small card the player opens from the HUD: the game menu, the
 *   controls card, the Lens card, the chronicle, the meters' breakdowns, the
 *   incoming-offers list.
 * - **screen**: a sheet or a stage that covers the window and takes the
 *   keyboard: Statecraft, Trade, the Ledger, the star chart, the Abacus, the
 *   standings, the war dispatch, the load list and the rest.
 * - **news**: something the game raises at the player over whatever is up: an
 *   offer to pick from, a Triumph or a bead, a question to confirm, the spend
 *   ceremony.
 *
 * The rule
 * --------
 * 1. Opening a card or a screen closes every other card and screen. News stays
 *    up: it is raised over a screen on purpose (a bead earned while Statecraft
 *    is open arrives over Statecraft), and it answers its own keys.
 * 2. Raising news closes the cards, and leaves the screens and the other news
 *    alone.
 * 3. `closeAll` closes everything, news included. It is Escape's first layer
 *    (`controls.ts`), and what the title screen and loading a game call. It
 *    reports whether a card or a screen was open, which is what tells Escape
 *    it had something to do.
 * 4. While a screen or news is open the board's keys are blocked (`blocksInput`,
 *    which `main.ts`'s `isInputBlocked` asks); a card blocks nothing. A screen
 *    answers its own Escape, and `H`, `T` or End Turn have no business firing
 *    behind it. News blocks them for the same reason, and the spend ceremony,
 *    which answers no key at all, is the plainest case: End Turn firing under
 *    it would resolve a turn the player is still watching.
 *
 * Closing is unconditional, as the hand-written lists were: every `close` here
 * must be safe to call on a surface that is already down, and all of them are.
 * One consequence is wanted: the Compendium loads on its first open, and a
 * close while it is still loading cancels that open (`lazyScreen.ts`), so the
 * book never appears after the player has moved on to something else.
 *
 * The star chart and the Abacus are not on `modalShell.ts` (each owns a
 * measured stage; CLAUDE.md, "Traps — render & UI"), and nothing here needs
 * them to be. The registry only asks a surface whether it is open and tells it
 * to close.
 *
 * Pure: no DOM, so the suite drives it with stand-in surfaces.
 */

export type SurfaceKind = 'card' | 'screen' | 'news';

export interface Surface {
  /** The surface's name. Registering a name again replaces the old entry. */
  readonly name: string;
  readonly kind: SurfaceKind;
  /**
   * Whether it is up. Optional for a surface that does not report it (the
   * incoming-offers list): such a surface is closed whenever the rule closes
   * its kind, and never counts as open.
   */
  readonly isOpen?: () => boolean;
  /** Takes it down. Safe to call on a surface that is already down. */
  readonly close: () => void;
}

export interface ScreenRegistry {
  /**
   * Adds a surface, or replaces the one already registered under its name. A
   * replacement is how a new boot's surfaces take over from the old one's.
   */
  register(surface: Surface): void;
  /**
   * `name` is opening: closes what rules 1 and 2 say cannot stay up beside it.
   * Throws on a name nobody registered, so a typo or a forgotten registration
   * fails the first time the surface opens rather than silently closing nothing.
   */
  opening(name: string): void;
  /** Closes everything (rule 3). True when a card or a screen was open. */
  closeAll(): boolean;
  /** Is a screen or news open (rule 4)? */
  blocksInput(): boolean;
  /** Every registered surface, in the order it was first registered. */
  surfaces(): readonly Surface[];
}

/** Which kinds each kind of opener closes (rules 1 and 2). */
const CLOSES: Record<SurfaceKind, readonly SurfaceKind[]> = {
  card: ['card', 'screen'],
  screen: ['card', 'screen'],
  news: ['card'],
};

function reportsOpen(surface: Surface): boolean {
  return surface.isOpen?.() ?? false;
}

export function createScreenRegistry(): ScreenRegistry {
  // An array rather than a map, so the order things are closed in is the order
  // they were registered in, and a replacement keeps its place.
  const entries: Surface[] = [];

  return {
    register(surface: Surface): void {
      const at = entries.findIndex((entry) => entry.name === surface.name);
      if (at >= 0) entries[at] = surface;
      else entries.push(surface);
    },

    opening(name: string): void {
      const opener = entries.find((entry) => entry.name === name);
      if (opener === undefined) throw new Error(`No surface is registered as "${name}"`);
      const closes = CLOSES[opener.kind];
      for (const entry of entries) {
        if (entry.name === name || !closes.includes(entry.kind)) continue;
        entry.close();
      }
    },

    closeAll(): boolean {
      let wasOpen = false;
      for (const entry of entries) {
        if (entry.kind !== 'news' && reportsOpen(entry)) wasOpen = true;
        entry.close();
      }
      return wasOpen;
    },

    blocksInput(): boolean {
      return entries.some((entry) => entry.kind !== 'card' && reportsOpen(entry));
    },

    surfaces(): readonly Surface[] {
      return entries;
    },
  };
}
