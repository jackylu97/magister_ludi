/**
 * A tutorial note waits behind the turn's big pages (2026-11-18, `docs/flags.md`,
 * "Age turn-over: landed fix and three follow-ups", item 1).
 *
 * At the first age turn-over the "Bead Race" note opened on top of the age
 * plate and covered its numeral and its name. The note's event fires when the
 * turn resolves, and the plate rises a beat later, after the marches. The note
 * card sits above the plate, the bead and Triumph sheets, the wager and census
 * sheets and the standings.
 *
 * The rule is in the tutorial's own drawing, for every note and not for one by
 * name: while `waitFor` says a page is up or on its way, a raised note is kept
 * and not drawn. It is drawn when the page has gone. A note already up when a
 * page rises goes behind it the same way, and comes back after.
 *
 * No jsdom in this suite, so the tutorial is built on a small stand-in document
 * that has only what the tutorial touches.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type TutorialStorage, createTutorial } from '../../src/ui/tutorial';
import { braceBody, uiSource } from './sourceHelpers';

type Listener = (event: unknown) => void;

/** One stand-in element: the fields and methods the tutorial uses. */
class FakeElement {
  hidden = false;
  className = '';
  textContent = '';
  type = '';
  offsetWidth = 320;
  offsetHeight = 200;
  readonly style: Record<string, string> = {};
  readonly children: FakeElement[] = [];
  readonly attributes: Record<string, string> = {};
  readonly listeners: Record<string, Listener[]> = {};
  private readonly classes = new Set<string>();
  readonly classList = {
    add: (...names: string[]) => names.forEach((name) => this.classes.add(name)),
    remove: (...names: string[]) => names.forEach((name) => this.classes.delete(name)),
    toggle: (name: string, on?: boolean) => {
      const want = on ?? !this.classes.has(name);
      if (want) this.classes.add(name);
      else this.classes.delete(name);
      return want;
    },
    contains: (name: string) => this.classes.has(name),
  };
  ownerDocument: unknown = null;

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  addEventListener(type: string, listener: Listener): void {
    (this.listeners[type] ??= []).push(listener);
  }

  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
}

/** The stand-in page: a body to hang the card on, and a window with timers. */
function fakePage() {
  const windowListeners: Record<string, Listener[]> = {};
  const view = {
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener: (type: string, listener: Listener) => {
      (windowListeners[type] ??= []).push(listener);
    },
    matchMedia: () => ({ matches: false }),
    setTimeout: (run: () => void, ms: number) => setTimeout(run, ms) as unknown as number,
    clearTimeout: (id: number) => clearTimeout(id),
  };
  const doc = {
    defaultView: view,
    createElement: () => new FakeElement(),
    querySelector: () => null,
  };
  const root = new FakeElement();
  root.ownerDocument = doc;
  return { root, windowListeners };
}

function memoryShelf(): TutorialStorage {
  const map = new Map<string, string>();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => void map.set(key, value) };
}

/** A guide on the stand-in page, with a page in front of it while `front.up` is true. */
function guide() {
  const page = fakePage();
  const front = { up: false };
  const tutorial = createTutorial({
    storage: memoryShelf(),
    root: page.root as unknown as HTMLElement,
    reducedMotion: () => false,
    waitFor: () => front.up,
  });
  // A loaded game: no opening sequence, so only the note can draw.
  tutorial.resume();
  const card = page.root.children[1]!;
  const title = card.children[1]!;
  const escape = () => {
    const event = { key: 'Escape', stopPropagation: vi.fn(), preventDefault: vi.fn() };
    for (const listener of page.windowListeners.keydown ?? []) listener(event);
    return event;
  };
  return { tutorial, front, card, title, escape };
}

describe('a tutorial note and the pages in front of it', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits while a page is up, and shows once it has closed', () => {
    const { tutorial, front, card, title } = guide();
    front.up = true;
    tutorial.note({ kind: 'event', event: 'ageOpened' });
    expect(card.hidden).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(card.hidden).toBe(true);
    front.up = false;
    vi.advanceTimersByTime(1000);
    expect(card.hidden).toBe(false);
    expect(title.textContent).toBe('The Bead Race');
  });

  it('goes behind a page that rises over it, and comes back after', () => {
    const { tutorial, front, card, title } = guide();
    tutorial.note({ kind: 'event', event: 'starved' });
    expect(card.hidden).toBe(false);
    const said = title.textContent;
    front.up = true;
    vi.advanceTimersByTime(1000);
    expect(card.hidden).toBe(true);
    front.up = false;
    vi.advanceTimersByTime(1000);
    expect(card.hidden).toBe(false);
    expect(title.textContent).toBe(said);
  });

  it('checks for another note once the open note closes', () => {
    const { tutorial, front, card, escape } = guide();
    tutorial.note({ kind: 'event', event: 'starved' });
    expect(tutorial.wantsTip('enemy')).toBe(false);
    const measure = vi.fn(() => 320);
    Object.defineProperty(card, 'offsetWidth', { get: measure });
    tutorial.note({ kind: 'command', command: 'moveUnit' });
    expect(measure).not.toHaveBeenCalled();
    front.up = true;
    tutorial.note({ kind: 'command', command: 'moveUnit' });
    expect(card.hidden).toBe(true);
    front.up = false;
    tutorial.note({ kind: 'command', command: 'moveUnit' });
    expect(card.hidden).toBe(false);
    escape();
    expect(tutorial.wantsTip('enemy')).toBe(true);
  });

  it('leaves Escape to the page while the note waits', () => {
    // The plate closes on Escape. A note that took the key while it could not
    // be seen would swallow the plate's Escape and be put away unread.
    const { tutorial, front, card, escape } = guide();
    front.up = true;
    tutorial.note({ kind: 'event', event: 'ageOpened' });
    const event = escape();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    front.up = false;
    vi.advanceTimersByTime(1000);
    expect(card.hidden).toBe(false);
  });

  it('stops looking once the note is put away', () => {
    const { tutorial, card } = guide();
    tutorial.note({ kind: 'event', event: 'starved' });
    expect(card.hidden).toBe(false);
    tutorial.close();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('what the page counts as in front of a note', () => {
  const main = uiSource('main.ts');

  it('hands the tutorial its wait', () => {
    expect(main).toContain('waitFor: () => tutorialWaits(),');
  });

  it('waits for the turn being resolved, the hand-over, the queue and every big page', () => {
    const boot = main.slice(main.indexOf('async function boot('));
    const wait = boot.slice(boot.indexOf('tutorialWaits = () =>'));
    const body = wait.slice(0, wait.indexOf(';'));
    for (const term of [
      'endTurnWorking',
      'controls.handOverPending()',
      'pendingBeadNews.length > 0',
      'pendingAgePlate !== null',
      'pendingBeadAge !== null',
      'pendingCensus !== null',
      'triumphSheet?.isOpen',
      'beadSheet?.isOpen',
      'agePlate?.isOpen',
      'wagerSheet?.isOpen',
      'censusSheet?.isOpen',
      'opusClose?.isOpen',
      'victory?.isOpen',
    ]) {
      expect(body, term).toContain(term);
    }
  });

  it('knows a hand-over is pending until its last beat has run', () => {
    const controls = uiSource('controls.ts');
    expect(controls).toContain('handOverPending: () => handOverTimers.length > 0,');
    // A beat that has run leaves the list, so an empty list means none is waiting.
    expect(braceBody(controls, 'function afterBeat(')).toContain(
      'handOverTimers = handOverTimers.filter((id) => id !== timer);',
    );
  });

  it('pumps the news queue when the war dispatch closes', () => {
    // A dispatch that rose during the marches stood in front of the plate, and
    // nothing raised the plate when it closed.
    const dispatch = main.slice(main.indexOf('warDispatch=createWarDispatch({'));
    expect(dispatch.slice(0, dispatch.indexOf('});'))).toContain('onClosed:()=>pumpBeadNews(),');
  });
});
