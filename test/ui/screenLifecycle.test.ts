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

const sources = import.meta.glob('../../src/{main,ui/techTree}.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const source = (name: string): string => {
  const key = Object.keys(sources).find((k) => k.endsWith(`/${name}`));
  if (!key) throw new Error(`source not globbed: ${name}`);
  return sources[key]!;
};

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
    ]) {
      expect(main, call).toContain(`gameDisposers.push(() => ${call});`);
    }
  });

  it('sweeps the register at both re-entry doors', () => {
    const main = source('main.ts');
    // Once on the way to the landing, once at the top of boot — a load can
    // re-boot without ever visiting the landing.
    expect(main.match(/disposeGameScreens\(\);/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
