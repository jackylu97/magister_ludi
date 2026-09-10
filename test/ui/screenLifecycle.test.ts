/**
 * The per-game screens unbind their window listeners between games.
 *
 * Entry LVII's bug: `boot` rebuilds every per-game screen over the same DOM,
 * and a leaked window listener with a stale `open` flag froze the star chart —
 * the old closure answered for the new chart and every door no-opped. The fix
 * is a register (`gameDisposers`) swept in two places; these pins keep the
 * register complete, because a screen added without a push is this bug waiting
 * for its next costume.
 */
import { describe, expect, it } from 'vitest';
import { uiSource } from './sourceHelpers';

// The sources come from the suite's shared glob (`sourceHelpers.ts`).
const source = uiSource;

describe('the game-screen disposal register', () => {
  it('gives the star chart a real dispose that unbinds both window listeners', () => {
    const tech = source('techTree.ts');
    expect(tech).toContain("window.addEventListener('keydown', onWindowKeyDown)");
    expect(tech).toContain("window.addEventListener('resize', onWindowResize)");
    expect(tech).toContain("window.removeEventListener('keydown', onWindowKeyDown)");
    expect(tech).toContain("window.removeEventListener('resize', onWindowResize)");
  });

  it('registers every per-boot screen that listens on window', () => {
    const main = source('main.ts');
    for (const call of [
      'splash.dispose()',
      'offerCard.dispose()',
      'triumphSheet?.dispose()',
      'beadSheet?.dispose()',
      'victory?.dispose()',
      'techTree?.dispose()',
      'beads?.dispose()',
      // The Diplomacy sheet, third door on the HUD dock (schema 56). It binds a
      // capturing `keydown` on the window like every other parchment screen, so
      // it joins the register the pass that ships it — which is the whole point
      // of this pin.
      'diplomacy?.dispose()',
      // The Reliquary, the seventh parchment sheet (2026-09-03). It binds a
      // capturing `keydown` for Escape *and* for the ‹ › that walk the pile, so
      // a leaked one would answer arrow keys for a game that is over.
      'reliquary?.dispose()',
      // The spend ceremony is not a screen the player opens — it is raised by an
      // accepted command — but it holds a click listener on its overlay and a
      // string of timers, and a timer left running against a torn-down tree is
      // the bug every animation in this interface has already had once.
      'ceremony?.dispose()',
      // The capture sheet, the ninth on the shell (2026-09-09). Raised by a
      // conquest rather than opened from the bar, which is exactly why it is
      // easy to forget: nothing on the HUD points at it, and its capturing
      // Escape would go on swallowing the key for a game that is over.
      'capture?.dispose()',
      // The four that batch H5 moved in. All four were disposed by name in
      // `showLanding` and by nothing at all in `boot`, so a save loaded straight
      // onto a board — the one re-entry that skips the landing — left the
      // Statecraft, Religion and Trade sheets' capturing `keydown` listeners
      // hanging, and the Abacus's WebGL context with them. The register is
      // swept at both doors, which is the whole reason it exists.
      'statecraft?.dispose()',
      'religion?.dispose()',
      'trade?.dispose()',
      'wagerSheet?.dispose()',
      // The census sheet, the twelfth on the shell (batch C1). Raised by the
      // End Turn blocker rather than opened from the bar — `capture?.dispose()`'s
      // reason exactly: nothing on the HUD points at it, so it is easy to forget,
      // and its capturing Escape would go on swallowing the key for a game that
      // is over.
      'censusSheet?.dispose()',
      'abacus?.dispose()',
    ]) {
      expect(main, call).toContain(`gameDisposers.push(() => ${call});`);
    }
    // And nothing disposes a per-game screen by name any more: a call outside
    // the register is a screen only one of the two doors knows how to tear down.
    for (const call of ['statecraft?.dispose();', 'ledger?.dispose();', 'abacus?.dispose();']) {
      expect(main.includes(`\n  ${call}`), call).toBe(false);
    }
  });

  /**
   * The eight parchment sheets bind their window listener once, in the frame
   * they share (`src/ui/modalShell.ts`), and every one of their `dispose`s is
   * that frame's. A screen that grew its own copy of the contract is a screen
   * whose teardown is nobody's job in particular — which is the shape Entry
   * LVII's bug had.
   */
  it('binds and unbinds the sheets’ Escape in the one frame they share', () => {
    const shell = source('modalShell.ts');
    expect(shell).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(shell).toContain("window.removeEventListener('keydown', onKeyDown, true)");
    expect(shell).toContain("overlay.addEventListener('mousedown', onGround)");
    expect(shell).toContain("overlay.removeEventListener('mousedown', onGround)");
    expect(shell).toContain("closeButton.addEventListener('click', close)");
    expect(shell).toContain("closeButton.removeEventListener('click', close)");
  });

  /**
   * **The Trade sheet is the tenth on the frame, and its hotkey is in the
   * register too** (batch R2, `docs/flags.md` item (iii)).
   *
   * The sheet's `dispose` is the shell's and is already pinned above. What this
   * adds is the thing the rewrite brought with it: `E` opens the sheet, and a
   * hotkey bound in `boot` and never unbound is a second copy of itself on the
   * next game — Entry LVII's bug wearing a keystroke rather than a screen. The
   * two older sheet hotkeys (`H`, `W`) are flagged rather than swept here; this
   * one goes in the register the pass that ships it, which is the whole point.
   */
  it('gives the tenth sheet the frame’s dispose and unbinds its own hotkey', () => {
    const main = source('main.ts');
    const sheet = source('tradeScreen.ts');
    // The frame, not a copy of the contract.
    expect(sheet).toContain('createModalShell({');
    expect(sheet).not.toContain("window.addEventListener('keydown'");
    // The sheet's disposer, and the hotkey's, both in the one register.
    expect(main).toContain('gameDisposers.push(() => trade?.dispose());');
    expect(main).toContain(
      "gameDisposers.push(() => window.removeEventListener('keydown', onTradeKey));",
    );
  });

  it('sweeps the register at both re-entry doors', () => {
    const main = source('main.ts');
    // Once on the way to the landing, once at the top of boot — a load can
    // re-boot without ever visiting the landing.
    expect(main.match(/disposeGameScreens\(\);/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
