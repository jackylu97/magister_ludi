import { describe, expect, it } from 'vitest';

import { lazyOverlay } from '../../src/ui/lazyScreen';
import { between, braceBody, uiSource } from './sourceHelpers';

/** A stand-in for a built sheet that records what it was asked to do. */
function fakeSheet() {
  const calls: string[] = [];
  let open = false;
  return {
    calls,
    sheet: {
      get isOpen(): boolean {
        return open;
      },
      open(entryId?: string): void {
        open = true;
        calls.push(`open:${entryId ?? ''}`);
      },
      close(): void {
        open = false;
        calls.push('close');
      },
      toggle(): void {
        open = !open;
        calls.push('toggle');
      },
      dispose(): void {
        calls.push('dispose');
      },
    },
  };
}

/** A load the test finishes by hand, so it can act while the chunk is "in flight". */
function deferredLoad<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  let loads = 0;
  const load = () => {
    loads += 1;
    return new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
  };
  return {
    load,
    loads: () => loads,
    resolve: (value: T) => resolve(value),
    reject: (error: unknown) => reject(error),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('a lazily loaded sheet', () => {
  it('is closed and unbuilt until the first open, then opens once the load lands', async () => {
    const { sheet, calls } = fakeSheet();
    const pending = deferredLoad<typeof sheet>();
    const lazy = lazyOverlay({ load: pending.load });
    expect(lazy.isOpen).toBe(false);
    expect(lazy.screen).toBeNull();
    expect(pending.loads()).toBe(0);

    lazy.open('unit:warrior');
    expect(lazy.isOpen).toBe(false);
    pending.resolve(sheet);
    await flush();
    expect(calls).toEqual(['open:unit:warrior']);
    expect(lazy.isOpen).toBe(true);
    expect(lazy.screen).toBe(sheet);
  });

  it('loads once however many times it is asked, and later calls go straight through', async () => {
    const { sheet, calls } = fakeSheet();
    const pending = deferredLoad<typeof sheet>();
    const lazy = lazyOverlay({ load: pending.load });
    lazy.open();
    lazy.open('tech:mining');
    pending.resolve(sheet);
    await flush();
    expect(pending.loads()).toBe(1);
    // Two opens asked for while loading: the later one is the one the player
    // wants, so it is the one that lands.
    expect(calls).toEqual(['open:tech:mining']);

    lazy.close();
    lazy.toggle();
    expect(calls.slice(1)).toEqual(['close', 'toggle']);
    expect(pending.loads()).toBe(1);
  });

  it('does not open after a close that came while the load was in flight', async () => {
    const { sheet, calls } = fakeSheet();
    const pending = deferredLoad<typeof sheet>();
    const lazy = lazyOverlay({ load: pending.load });
    lazy.open();
    lazy.close();
    pending.resolve(sheet);
    await flush();
    expect(calls).toEqual([]);
    expect(lazy.isOpen).toBe(false);
    // The sheet was still built, so the next open is immediate.
    lazy.open();
    expect(calls).toEqual(['open:']);
  });

  it('treats a toggle before the load as an open', async () => {
    const { sheet, calls } = fakeSheet();
    const lazy = lazyOverlay({ load: () => Promise.resolve(sheet) });
    lazy.toggle();
    await flush();
    expect(calls).toEqual(['open:']);
  });

  it('lets a failed load reject, and tries again on the next open', async () => {
    const { sheet, calls } = fakeSheet();
    const pending = deferredLoad<typeof sheet>();
    const lazy = lazyOverlay({ load: pending.load });
    const first = lazy.ready();
    pending.reject(new Error('Failed to fetch dynamically imported module'));
    await expect(first).rejects.toThrow('dynamically imported module');
    expect(lazy.screen).toBeNull();

    const second = lazy.ready();
    expect(pending.loads()).toBe(2);
    pending.resolve(sheet);
    await expect(second).resolves.toBe(sheet);
    lazy.open();
    expect(calls).toEqual(['open:']);
  });

  it('prefetches the code without building the sheet, and ignores a prefetch failure', async () => {
    let fetched = 0;
    let built = 0;
    const { sheet } = fakeSheet();
    const lazy = lazyOverlay({
      prefetch: () => {
        fetched += 1;
        return Promise.reject(new Error('offline'));
      },
      load: () => {
        built += 1;
        return Promise.resolve(sheet);
      },
    });
    lazy.prefetch();
    await flush();
    expect({ fetched, built }).toEqual({ fetched: 1, built: 0 });
  });
});

describe('what the game page loads up front', () => {
  const main = uiSource('main.ts');

  it('imports the Compendium as a type only, and builds it through a dynamic import', () => {
    expect(main).not.toMatch(/^import \{[^}]*\} from '\.\/ui\/compendium';/m);
    expect(main).toContain("import type { Compendium } from './ui/compendium';");
    expect(main).toContain("import('./ui/compendium')");
  });

  it('imports the frozen 2D renderers only when one is asked for', () => {
    for (const module of ['./render/renderer', './render/sprites', './render/tileVisuals']) {
      expect(main, module).not.toMatch(new RegExp(`^import [^;]* from '${module}';`, 'm'));
      expect(main, module).toContain(`import('${module}')`);
    }
  });

  it('generates the Compendium once per mount, never on an open', () => {
    const compendium = uiSource('compendium.ts');
    const mount = between(compendium, 'export function renderCompendium(', '\n}\n');
    expect(mount.match(/compendiumSections\(\)/g)).toHaveLength(1);
    expect(braceBody(compendium, 'export function createCompendium(')).not.toContain(
      'compendiumSections',
    );
  });

  it('does not block the first paint on the font stylesheet', () => {
    const html = uiSource('index.html');
    const head = html.slice(0, html.indexOf('</head>'));
    const fontLinks = [...head.matchAll(/<link[^>]*fonts\.googleapis\.com\/css2[^>]*>/g)].map(
      (match) => match[0],
    );
    // The preload, and the noscript copy for a reader with scripts off.
    expect(fontLinks).toHaveLength(2);
    expect(fontLinks[0]).toContain('rel="preload"');
    expect(fontLinks[0]).toContain("this.rel = 'stylesheet'");
    const outsideNoscript = head.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
    expect(outsideNoscript).not.toMatch(/rel="stylesheet"\s+href="https:\/\/fonts\.googleapis/);
  });
});
