/**
 * The screen registry (`src/ui/screenRegistry.ts`, batch UX2): one list of every
 * surface the game page can show, and one rule for what closes when something
 * opens.
 *
 * Three halves:
 *
 *   - **the rule**, driven for real on the module with stand-in surfaces;
 *   - **the register in `main.ts`**, read off the source (this suite has no
 *     DOM): every surface is registered, every open hook tells the registry,
 *     and opening any registered surface closes the others by the rule;
 *   - **no hand-written close lists left** in `main.ts`, so a new screen cannot
 *     go around the registry.
 */

import { describe, expect, it } from 'vitest';

import {
  type Surface,
  type SurfaceKind,
  createScreenRegistry,
} from '../../src/ui/screenRegistry';
import { braceBody, uiSource } from './sourceHelpers';

/** A surface that remembers whether it is open and counts its closes. */
interface StandIn extends Surface {
  open: boolean;
  closes: number;
}

function standIn(name: string, kind: SurfaceKind, reports = true): StandIn {
  const surface: StandIn = {
    name,
    kind,
    open: false,
    closes: 0,
    close() {
      surface.closes += 1;
      surface.open = false;
    },
  };
  if (reports) Object.assign(surface, { isOpen: () => surface.open });
  return surface;
}

/** A registry over stand-ins, and the stand-ins by name. */
function registryOf(list: readonly (readonly [string, SurfaceKind])[]) {
  const registry = createScreenRegistry();
  const byName = new Map<string, StandIn>();
  for (const [name, kind] of list) {
    const surface = standIn(name, kind);
    byName.set(name, surface);
    registry.register(surface);
  }
  return { registry, byName };
}

const SMALL: readonly (readonly [string, SurfaceKind])[] = [
  ['menu', 'card'],
  ['chronicle', 'card'],
  ['trade', 'screen'],
  ['ledger', 'screen'],
  ['offer', 'news'],
  ['bead', 'news'],
];

function openAll(byName: Map<string, StandIn>): void {
  for (const surface of byName.values()) surface.open = true;
}

describe('the rule', () => {
  it('closes every other card and screen when a card or a screen opens, and leaves the news', () => {
    for (const opener of ['menu', 'trade']) {
      const { registry, byName } = registryOf(SMALL);
      openAll(byName);
      registry.opening(opener);
      for (const [name, kind] of SMALL) {
        const expected = name === opener || kind === 'news';
        expect(`${opener} → ${name}: ${byName.get(name)!.open}`).toBe(`${opener} → ${name}: ${expected}`);
      }
    }
  });

  it('closes only the cards when news is raised', () => {
    const { registry, byName } = registryOf(SMALL);
    openAll(byName);
    registry.opening('offer');
    for (const [name, kind] of SMALL) {
      expect(`${name}: ${byName.get(name)!.open}`).toBe(`${name}: ${kind !== 'card'}`);
    }
  });

  it('closes everything on the sweep, and says whether a card or a screen was open', () => {
    const { registry, byName } = registryOf(SMALL);
    openAll(byName);
    expect(registry.closeAll()).toBe(true);
    for (const surface of byName.values()) expect(surface.open).toBe(false);
    // News handles its own keys, so it never makes Escape think it had a card
    // to take down.
    byName.get('offer')!.open = true;
    expect(registry.closeAll()).toBe(false);
    expect(byName.get('offer')!.open).toBe(false);
    expect(registry.closeAll()).toBe(false);
  });

  it('blocks the board’s keys while a screen or news is up, and never for a card', () => {
    const { registry, byName } = registryOf(SMALL);
    expect(registry.blocksInput()).toBe(false);
    byName.get('menu')!.open = true;
    expect(registry.blocksInput()).toBe(false);
    byName.get('ledger')!.open = true;
    expect(registry.blocksInput()).toBe(true);
    byName.get('ledger')!.open = false;
    byName.get('bead')!.open = true;
    expect(registry.blocksInput()).toBe(true);
  });

  it('closes unconditionally, as the old lists did, and never the opener itself', () => {
    // A close on a surface that is already down is safe by the interface's
    // promise; calling it anyway is what lets a close cancel the Compendium's
    // first open while its code is still loading.
    const { registry, byName } = registryOf(SMALL);
    registry.opening('trade');
    expect(byName.get('ledger')!.closes).toBe(1);
    expect(byName.get('menu')!.closes).toBe(1);
    expect(byName.get('trade')!.closes).toBe(0);
    expect(byName.get('offer')!.closes).toBe(0);
  });

  it('closes a surface that cannot say whether it is open, and never counts it', () => {
    const registry = createScreenRegistry();
    const quiet = standIn('offers', 'card', false);
    const screen = standIn('trade', 'screen');
    registry.register(quiet);
    registry.register(screen);
    expect(quiet.isOpen).toBeUndefined();
    registry.opening('trade');
    expect(quiet.closes).toBe(1);
    expect(registry.closeAll()).toBe(false);
    expect(quiet.closes).toBe(2);
    expect(registry.blocksInput()).toBe(false);
  });

  it('lets a new boot’s surface replace the old one under the same name, in place', () => {
    const registry = createScreenRegistry();
    const first = standIn('trade', 'screen');
    registry.register(first);
    registry.register(standIn('menu', 'card'));
    const second = standIn('trade', 'screen');
    registry.register(second);
    expect(registry.surfaces().map((surface) => surface.name)).toEqual(['trade', 'menu']);
    second.open = true;
    registry.opening('menu');
    expect(second.open).toBe(false);
    expect(first.closes).toBe(0);
  });

  it('refuses a name nobody registered, so a forgotten registration fails loudly', () => {
    const registry = createScreenRegistry();
    expect(() => registry.opening('nowhere')).toThrow(/nowhere/);
  });

  it('is pure: no DOM in the module', () => {
    const module = uiSource('screenRegistry.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(module).not.toMatch(/\b(document|window|HTMLElement)\b/);
  });
});

// --- the register in main.ts --------------------------------------------------

const main = uiSource('main.ts');

/** Every module in `src/ui/`, as text. */
const UI_MODULES = import.meta.glob('../../src/ui/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/**
 * Every surface `main.ts` registers, read off its `screens.register(` calls:
 * the short form through a holder (`held(name, kind, () => holder)`) and the
 * long form with its own `isOpen` and `close`.
 */
function registered(): { name: string; kind: SurfaceKind; refs: string }[] {
  const found: { at: number; name: string; kind: SurfaceKind; refs: string }[] = [];
  const short = /screens\.register\(held\('(\w+)', '(card|screen|news)', \(\) => (\w+)\)\);/g;
  for (const match of main.matchAll(short)) {
    found.push({ at: match.index!, name: match[1]!, kind: match[2] as SurfaceKind, refs: match[3]! });
  }
  const long = /screens\.register\(\{\s*name: '(\w+)',\s*kind: '(card|screen|news)',([\s\S]*?)\}\);/g;
  for (const match of main.matchAll(long)) {
    found.push({ at: match.index!, name: match[1]!, kind: match[2] as SurfaceKind, refs: match[3]! });
  }
  // In the order the source registers them, which is the order they close in.
  return found
    .sort((a, b) => a.at - b.at)
    .map(({ name, kind, refs }) => ({ name, kind, refs }));
}

/** The register as the batch left it: every surface, and its kind. */
const REGISTER: readonly (readonly [string, SurfaceKind])[] = [
  // Cards: the small cards opened from the HUD.
  ['menu', 'card'],
  ['help', 'card'],
  ['lens', 'card'],
  ['chronicle', 'card'],
  ['meters', 'card'],
  ['offers', 'card'],
  // Screens: everything that covers the window and takes the keyboard.
  ['compendium', 'screen'],
  ['saves', 'screen'],
  ['starChart', 'screen'],
  ['abacus', 'screen'],
  ['statecraft', 'screen'],
  ['rewards', 'screen'],
  ['religion', 'screen'],
  ['trade', 'screen'],
  ['wager', 'screen'],
  ['census', 'screen'],
  ['leader', 'screen'],
  ['diplomacy', 'screen'],
  ['beadLedger', 'screen'],
  ['reliquary', 'screen'],
  ['ledger', 'screen'],
  ['capture', 'screen'],
  ['standings', 'screen'],
  ['warDispatch', 'screen'],
  // News: raised at the player over whatever is up.
  ['offer', 'news'],
  ['triumph', 'news'],
  ['bead', 'news'],
  ['confirm', 'news'],
  ['ceremony', 'news'],
];

/** Every `screens.opening('…')` in `main.ts`. */
function openings(): string[] {
  return [...main.matchAll(/screens\.opening\('(\w+)'\)/g)].map((match) => match[1]!);
}

describe('the register in main.ts', () => {
  it('registers every surface once, with its kind', () => {
    const list = registered();
    expect(list.map((entry) => [entry.name, entry.kind])).toEqual(REGISTER);
    const names = list.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('closes, on any opening, exactly what the rule says', () => {
    // The register's own names and kinds, driven through the real module: for
    // each surface, open everything, announce that one opening, and read off
    // what is still up.
    for (const [opener, openerKind] of REGISTER) {
      const { registry, byName } = registryOf(REGISTER);
      openAll(byName);
      registry.opening(opener);
      for (const [name, kind] of REGISTER) {
        const stays =
          name === opener || kind === 'news' || (openerKind === 'news' && kind === 'screen');
        expect(`${opener} → ${name}: ${byName.get(name)!.open}`).toBe(`${opener} → ${name}: ${stays}`);
      }
    }
  });

  it('has every surface that opens tell the registry, under a registered name', () => {
    const names = new Set(REGISTER.map(([name]) => name));
    const told = new Set(openings());
    for (const name of told) expect(names.has(name), `${name} is not registered`).toBe(true);
    // The incoming-offers list is the one surface with no open hook of its own:
    // its button lives in `diplomacyOffers.ts`, and a press there is already a
    // press outside every other card.
    for (const [name] of REGISTER) {
      if (name === 'offers') continue;
      expect(told.has(name), `${name} never calls screens.opening`).toBe(true);
    }
  });

  it('opens nothing through an open hook that keeps its own list', () => {
    // Every `onOpen`, `onOpenPopover` and `beforeOpen` hook in `main.ts` tells
    // the registry and closes nothing itself.
    const hooks = [...main.matchAll(/\b(onOpen|onOpenPopover|beforeOpen):\s*\(\)\s*=>\s*/g)];
    expect(hooks.length).toBeGreaterThan(20);
    for (const hook of hooks) {
      const at = hook.index! + hook[0].length;
      const body = main.startsWith('{', at)
        ? braceBody(main.slice(at), '{')
        : main.slice(at, main.indexOf('\n', at));
      expect(body, `${hook[1]} at ${at}`).toContain("screens.opening('");
      expect(body, `${hook[1]} at ${at}`).not.toContain('.close()');
    }
  });

  it('reaches every surface module main.ts builds through the register', () => {
    // Any module in `src/ui/` built on the sheet frame or the popover is a
    // surface, found by reading the folder so a new sheet is covered the day it
    // is written; so are the surfaces that draw their own overlay, named below.
    // Whatever `main.ts` builds from one must appear in the register, directly
    // or through a holder it is copied into.
    const builders = new Set<string>(['createPopover']);
    for (const [path, source] of Object.entries(UI_MODULES)) {
      if (path.endsWith('/modalShell.ts') || path.endsWith('/popover.ts')) continue;
      if (!/createModalShell\(|createPopover\(/.test(source)) continue;
      for (const match of source.matchAll(/export function (create\w+)\(/g)) builders.add(match[1]!);
    }
    for (const own of [
      'createTechTree',
      'createAbacusScreen',
      'createSavesPanel',
      'createOfferCard',
      'createTriumphModal',
      'createBeadModal',
      'createConfirmCard',
      'createGreatPersonCeremony',
      'createDiplomacyOffers',
    ]) {
      builders.add(own);
    }
    // Built by those modules but not surfaces: the Ledger's curve is a ring of
    // samples and the dispatch's queue is a list. The loading sheet is a
    // surface left out on purpose (the next test says why).
    builders.delete('createLedgerHistory');
    builders.delete('createWarDispatchQueue');
    builders.delete('createLoadingSheet');

    const refs = registered()
      .map((entry) => entry.refs)
      .join('\n');
    const reaches = (name: string): boolean =>
      new RegExp(`\\b${name}\\b`).test(refs) ||
      [...main.matchAll(new RegExp(`(\\w+) = ${name};`, 'g'))].some((copy) =>
        new RegExp(`\\b${copy[1]}\\b`).test(refs),
      );

    const built = [
      ...main.matchAll(/(?:const |let )?(\w+)(?::[^=\n]+)?\s*=\s*(create\w+)\(/g),
    ].filter((match) => builders.has(match[2]!));
    expect(built.length).toBeGreaterThan(25);
    for (const match of built) {
      expect(reaches(match[1]!), `${match[1]} (built by ${match[2]}) is not in the register`).toBe(
        true,
      );
    }
    // The Compendium is built behind `lazyOverlay`, so it is checked by name.
    expect(main).toContain("screens.register(held('compendium', 'screen', () => compendium));");
  });

  it('keeps the loading sheet out of it on purpose', () => {
    // The loading sheet is up while `boot` runs and reports a load; nothing may
    // close it from under the load it is reporting (`screenLifecycle.test.ts`).
    expect(main).toContain('const loading = createLoadingSheet({');
    expect(registered().some((entry) => /\bloading\b/.test(entry.refs))).toBe(false);
  });

  it('sweeps through the registry: Escape, the title screen and a loaded game', () => {
    expect(main).toContain('closePopovers: () => screens.closeAll(),');
    const landing = braceBody(main, 'function showLanding(): void {');
    expect(landing).toContain('screens.closeAll();');
    const adopt = braceBody(main, 'async function adoptGame(');
    expect(adopt).toContain('screens.closeAll();');
  });

  it('asks the registry whether the board’s keys are blocked', () => {
    const guard = braceBody(main, '  function isInputBlocked(): boolean {');
    expect(guard).toContain('screens.blocksInput()');
    // The three things that block the keys and are not surfaces.
    expect(guard).toContain('endTurnWorking ||');
    expect(guard).toContain('!landingEl.hidden ||');
    expect(guard).toContain('graphicsResetting ||');
    // And no surface is named in it: a new screen blocks the keys by being
    // registered, with no second list here to forget.
    expect(guard).not.toMatch(/\?\.isOpen|\.isOpen \?\?/);
  });
});

// --- no hand-written close lists ----------------------------------------------

describe('main.ts keeps no hand-written close lists', () => {
  /** `main.ts` with its comments taken out: the rule is not the prose about it. */
  const code = main.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

  it('has no sweep and no screen-opening wrapper of its own', () => {
    expect(code).not.toMatch(/function closePopovers\(/);
    expect(code).not.toMatch(/function openScreen\(/);
    expect(code).not.toMatch(/\bopenScreen\(/);
  });

  it('never closes two surfaces in a row', () => {
    const closing = /^\s*(?:if \([^)]*\) )?[\w.]+\??\.close\(\);\s*$/;
    const lines = code.split('\n').filter((line) => line.trim() !== '');
    const runs: string[] = [];
    lines.forEach((line, index) => {
      if (closing.test(line) && closing.test(lines[index + 1] ?? '')) {
        runs.push(`${line.trim()} / ${lines[index + 1]!.trim()}`);
      }
    });
    expect(runs).toEqual([]);
  });

  it('closes a surface by name only to toggle it or to step aside for what it raises', () => {
    // What is left: a card closing under its own row (the menu's Compendium and
    // tutorial rows, the controls card's link, a lens picked); a sheet stepping
    // aside for the offer it raises (Statecraft's charter, the Reliquary's
    // call); and the three letter keys closing the sheet they opened.
    const closes = [...code.matchAll(/([\w.]+)\??\.close\(\);/g)].map((match) => match[1]!);
    expect(closes.sort()).toEqual(
      [
        'diplomacy',
        'help',
        'lens',
        'menu',
        'menu',
        'religion',
        'reliquary',
        'statecraft',
        'trade',
      ].sort(),
    );
  });
});
