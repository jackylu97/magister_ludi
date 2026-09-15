/**
 * Screen listeners live as long as the booted UI, across restarts and loads.
 *
 * Entry LVII's bug: `boot` rebuilds every per-game screen over the same DOM,
 * and a leaked window listener with a stale `open` flag froze the star chart —
 * the old closure answered for the new chart and every door no-opped. The fix
 * is a register (`gameDisposers`) swept before replacing the UI. Restart reuses
 * that UI, so sweeping on the way to the landing instead removes the only
 * working close handlers. These pins distinguish reuse from replacement.
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
      // The standings (item (uuuuu)) — the same holder the victory modal used,
      // now the fifteenth sheet on the shell. Its disposer stays where the
      // register has always carried it, though the sheet itself is built much
      // further down with the dock door it hands the keyboard back to.
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
      // The leader's record, the thirteenth on the shell (batch L2b; its draft
      // retired with the deck in L6a/L6b). It sits behind the dock's fifth door
      // and binds a capturing Escape that would go on swallowing the key for a
      // game that is over.
      'leaderSheet?.dispose()',
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

  /**
   * **The loading sheet is the page's, and stays out of the register** (batch
   * P7, `docs/flags.md` (eeeee)).
   *
   * It is the fourteenth sheet on the shell and the only one that is up *while*
   * `boot` runs: a disposer swept at the top of `boot` would unbind its Escape
   * and hide the overlay in the middle of the load it is reporting. So it is
   * built at module scope beside the saves panel and the Compendium and is
   * never disposed — which is exactly the kind of thing that gets "tidied" into
   * the register later by somebody reading the list and not the reason.
   */
  it('keeps the loading sheet out of the per-game register, and on the shell', () => {
    const main = source('main.ts');
    expect(main).toContain('const loading = createLoadingSheet({');
    expect(main).not.toContain('gameDisposers.push(() => loading');
    expect(main).not.toContain('loading.dispose()');
    // Still the shared frame, so its one window listener is bound and unbound
    // in the one place the sheets' contract lives.
    expect(source('loadingSheet.ts')).toContain('createModalShell({');
  });

  /**
   * **The standings are the fifteenth sheet on the frame** (item (uuuuu), V1).
   *
   * They replace the victory modal, which carried its own capturing `keydown`
   * on the window and its own `clear`. A sheet that kept that copy of the
   * contract while being opened from the dock on any turn is Entry LVII's bug
   * with a door added to it: the modal was raised once a game, and this one can
   * be opened, left and reopened all game long.
   */
  it('gives the standings the frame’s dispose, and the retired modal none', () => {
    const main = source('main.ts');
    const sheet = source('victoryScreen.ts');
    expect(sheet).toContain('createModalShell({');
    expect(sheet).not.toContain("window.addEventListener('keydown'");
    expect(main).toContain('gameDisposers.push(() => victory?.dispose());');
    // The landing takes it down by closing it, never by disposing it: Restart
    // and load reuse the booted screens.
    expect(main).toContain('victory?.close();');
    expect(main).not.toContain('victory?.clear();');
    expect(main).not.toContain('createVictoryModal');
  });

  it('preserves close handlers when Restart reuses the booted screens', () => {
    const main = source('main.ts');
    const landing = main.slice(main.indexOf('function showLanding()'), main.indexOf('function hideLanding()'));
    const begin = main.slice(main.indexOf('async function beginGame('), main.indexOf('function terrainBuildProgress('));
    expect(begin).toContain('if (takeOverGame) await takeOverGame(loaded);');
    expect(landing).toContain('closePopovers();');
    expect(landing).toContain('suspendGame?.();');
    expect(landing).not.toContain('disposeGameScreens();');
    const boot = main.slice(main.indexOf('async function boot('));
    expect(boot.indexOf('disposeGameScreens();')).toBeLessThan(boot.indexOf('createStatecraftScreen({'));
    expect(main.match(/disposeGameScreens\(\);/g)).toHaveLength(1);
  });

  it('clears old dialogs and delayed turns on both Restart and direct load', () => {
    const main = source('main.ts');
    const adopt = main.slice(main.indexOf('async function adoptGame('), main.indexOf('takeOverGame = adoptGame;'));
    expect(adopt).toContain('closePopovers();');
    expect(adopt.indexOf('suspendGame?.();')).toBeGreaterThan(adopt.indexOf('closePopovers();'));
    expect(adopt.indexOf('suspendGame?.();')).toBeLessThan(adopt.indexOf('game = replacement;'));
    expect(adopt).not.toContain('disposeGameScreens();');
    const suspend = main.slice(main.indexOf('suspendGame = () => {')).split('\n  };')[0]!;
    for (const call of ['cancelPendingEndTurn();', 'splash.clear();', 'offerCard.clear();']) {
      expect(suspend).toContain(call);
    }
    const cancel = main.slice(main.indexOf('function cancelPendingEndTurn()')).split('\n  }')[0]!;
    expect(cancel).toContain('window.cancelAnimationFrame(endTurnRaf)');
    expect(cancel).toContain('window.clearTimeout(endTurnTimer)');
    expect(cancel).toContain('endTurnWorking = false;');
  });
});
