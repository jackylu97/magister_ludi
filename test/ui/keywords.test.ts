/**
 * Keyword links: the emitter, the renderer, and the register that keeps the two
 * from drifting.
 *
 * The user's ruling (playtest, 2026-08-28): *"keywords that are linked are shown
 * in bold; only in places where clicking doesn't result in an action (buttons
 * shouldn't be keyword links); keep these to descriptors."* Three claims, and
 * each of them can fail silently:
 *
 *   1. A describer marks a name and some surface prints the **brackets**. This
 *      is the loud one and it is still worth a test, because it only shows on
 *      the cards that happen to name something.
 *   2. A mark points at an entry the Compendium does not have. Nothing throws —
 *      the book simply opens on nothing.
 *   3. A keyword inside a `<button>` is clickable, and the click that opened the
 *      book **also picks the card**. There is no way to see that in a diff.
 *
 * `stripRefs` is the fourth thing under test and the quietest of all: it is the
 * promise that a mark never changes what a card *says*, which is what lets every
 * pinned sentence in `test/sim/statecraft.test.ts` go on meaning something.
 *
 * The suite has no DOM (`vite.config.ts` — `environment: 'node'`), so the parts
 * that can be asked purely are asked purely (`splitDescriptor`, `stickyStep`),
 * the DOM half is asked against the smallest possible stand-in for a document,
 * and the register is read off the sources — the instrument `seatRoster.test.ts`
 * and `triumphModal.test.ts` use, and the right one here, because "which surface
 * draws a clause which way" is a fact about the code rather than about a run.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { ALL_BELIEF_IDS, RITE_IDS } from '../../src/sim/religionData';
import { BUILDING_IDS } from '../../src/sim/buildingData';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { DOCTRINE_IDS, GOVERNMENT_IDS, ORDER_IDS } from '../../src/sim/statecraftData';
import { describeCard, ref, stripRefs } from '../../src/sim/statecraft';
import type { CardId } from '../../src/sim/statecraftData';
import { compendiumSections } from '../../src/ui/compendium';
import {
  STICKY_CLOSED,
  STICKY_GRACE_MS,
  type StickyState,
  stickyClosing,
  stickyStep,
} from '../../src/ui/infoCard';

const SOURCES = import.meta.glob(['../../src/ui/*.ts', '../../src/main.ts', '../../src/style.css'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(`/${name}`));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/** Every card in the game, of every class a describer speaks for. */
const EVERY_CARD: CardId[] = [
  ...GOVERNMENT_IDS,
  ...DOCTRINE_IDS,
  ...ORDER_IDS,
  ...ALL_BELIEF_IDS,
  ...RITE_IDS,
  ...GREAT_PERSON_IDS,
  ...BUILDING_IDS,
] as CardId[];

// --- the mark ---------------------------------------------------------------

describe('ref and stripRefs', () => {
  it('wraps a name and gives it back unchanged', () => {
    const marked = ref('building', 'granary', 'a Granary');
    expect(marked).toBe('[[building:granary|a Granary]]');
    expect(stripRefs(marked)).toBe('a Granary');
  });

  it('carries the grammar in the words, not in the id', () => {
    // The whole reason the name is a parameter: an article and a plural are
    // composed where they belong and the link is still one link.
    expect(stripRefs(ref('building', 'library', 'Libraries'))).toBe('Libraries');
    expect(stripRefs(ref('wonder', 'theOracle', 'The Oracle'))).toBe('The Oracle');
  });

  it('leaves a sentence with no marks in it exactly alone', () => {
    expect(stripRefs('+2 gold in every city')).toBe('+2 gold in every city');
  });

  it('takes every mark in a sentence, not just the first', () => {
    // A global pattern with a remembered `lastIndex` is how the second mark in a
    // clause survives to the screen. `stripRefs` builds its own each call.
    const both = `${ref('resource', 'iron', 'Iron')} or ${ref('resource', 'horses', 'Horses')}`;
    expect(stripRefs(both)).toBe('Iron or Horses');
    expect(stripRefs(both)).toBe('Iron or Horses');
  });
});

// --- what the describers emit -----------------------------------------------

describe('what a describer marks', () => {
  it('leaves no clause carrying a bracket once it is stripped', () => {
    // The plain reading is the promise: whatever a card says, `stripRefs` of it
    // is the sentence that was printed before any of this existed.
    for (const id of EVERY_CARD) {
      for (const clause of describeCard(id)) {
        expect(stripRefs(clause.text), id).not.toContain('[[');
        expect(stripRefs(clause.text), id).not.toContain(']]');
      }
    }
  });

  it('marks at least the buildings, improvements, resources and units', () => {
    // The emission sites, asserted as *coverage* rather than as a list of
    // cards: which row happens to name a Library is a balance decision, but a
    // vocabulary that stopped marking a whole class of thing is a bug.
    const kinds = new Set<string>();
    for (const id of EVERY_CARD) {
      for (const clause of describeCard(id)) {
        for (const [, kind] of clause.text.matchAll(/\[\[([a-zA-Z]+):/g)) kinds.add(kind);
      }
    }
    expect([...kinds].sort()).toEqual(
      expect.arrayContaining(['building', 'improvement', 'resource', 'unit']),
    );
  });

  it('points every mark at an entry the Compendium actually has', () => {
    // The failure this exists for: a kind that names no shelf, or an id no row
    // carries. Nothing throws — the book opens on nothing — so it is asked here
    // against the real index.
    const known = new Set(
      compendiumSections().flatMap((section) => section.entries.map((entry) => entry.id)),
    );
    for (const id of EVERY_CARD) {
      for (const clause of describeCard(id)) {
        for (const [, kind, key] of clause.text.matchAll(/\[\[([a-zA-Z]+):([A-Za-z0-9_]+)\|/g)) {
          expect(known.has(`${kind}:${key}`), `${id} → ${kind}:${key}`).toBe(true);
        }
      }
    }
  });
});

// --- the renderer -----------------------------------------------------------

/**
 * The smallest thing that answers the calls `renderDescriptor` makes.
 *
 * Not a DOM: a record of what was built, which is all that is being asked. The
 * three questions are whether a mark becomes a `<b>`, whether that `<b>` carries
 * the address, and whether clicking it opens the right entry — and none of them
 * needs layout, a tree walk or an event loop.
 */
interface FakeNode {
  tag: string;
  className: string;
  textContent: string;
  attributes: Record<string, string>;
  dataset: Record<string, string>;
  tabIndex: number;
  children: FakeNode[];
  listeners: Record<string, ((event: unknown) => void)[]>;
}

function fakeNode(tag: string): FakeNode {
  const node: FakeNode = {
    tag,
    className: '',
    textContent: '',
    attributes: {},
    dataset: {},
    tabIndex: -1,
    children: [],
    listeners: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const api = node as unknown as Record<string, unknown>;
  api.append = (...nodes: FakeNode[]): void => {
    node.children.push(...nodes);
  };
  api.setAttribute = (name: string, value: string): void => {
    node.attributes[name] = value;
  };
  api.addEventListener = (name: string, handler: (event: unknown) => void): void => {
    (node.listeners[name] ??= []).push(handler);
  };
  api.replaceChildren = (...nodes: FakeNode[]): void => {
    node.children = nodes;
  };
  api.style = { setProperty: (): void => {} };
  api.tagName = tag.toUpperCase();
  return node;
}

const originalDocument = (globalThis as { document?: unknown }).document;

function installFakeDocument(): void {
  (globalThis as { document?: unknown }).document = {
    createElement: (tag: string) => fakeNode(tag),
    createTextNode: (text: string) => {
      const node = fakeNode('#text');
      node.textContent = text;
      return node;
    },
    createDocumentFragment: () => fakeNode('#fragment'),
  };
}

afterEach(() => {
  (globalThis as { document?: unknown }).document = originalDocument;
});

/** Every node in a built fragment, depth first. */
function flatten(node: FakeNode): FakeNode[] {
  return [node, ...node.children.flatMap(flatten)];
}

/** The rendered words, marks included — what a reader sees. */
function readText(node: FakeNode): string {
  return flatten(node)
    .filter((child) => child.tag === '#text' || child.textContent !== '')
    .map((child) => child.textContent)
    .join('');
}

describe('renderDescriptor', () => {
  it('draws a marked name as a bold keyword carrying its address', async () => {
    installFakeDocument();
    const { renderDescriptor } = await import('../../src/ui/keywords');
    const fragment = renderDescriptor(
      `+1 science in every city with ${ref('building', 'library', 'a Library')}`,
    ) as unknown as FakeNode;
    const marks = flatten(fragment).filter((node) => node.tag === 'b');
    expect(marks).toHaveLength(1);
    expect(marks[0]!.className).toBe('kw');
    expect(marks[0]!.dataset.ref).toBe('building:library');
    expect(marks[0]!.textContent).toBe('a Library');
    // The words are unchanged — the mark is drawn, never printed.
    expect(readText(fragment)).toBe('+1 science in every city with a Library');
  });

  it('opens the entry the mark names, and nothing else', async () => {
    installFakeDocument();
    const { renderDescriptor, setKeywordOpener } = await import('../../src/ui/keywords');
    const opened: string[] = [];
    setKeywordOpener((entryId) => opened.push(entryId));
    const fragment = renderDescriptor(ref('unit', 'scout', 'a Scout')) as unknown as FakeNode;
    const mark = flatten(fragment).find((node) => node.tag === 'b')!;
    const click = mark.listeners.click![0]!;
    click({ preventDefault: () => {}, stopPropagation: () => {} });
    expect(opened).toEqual(['unit:scout']);
    setKeywordOpener(null);
  });

  it('is reachable from a keyboard', async () => {
    installFakeDocument();
    const { renderDescriptor, setKeywordOpener } = await import('../../src/ui/keywords');
    const opened: string[] = [];
    setKeywordOpener((entryId) => opened.push(entryId));
    const fragment = renderDescriptor(ref('unit', 'scout', 'a Scout')) as unknown as FakeNode;
    const mark = flatten(fragment).find((node) => node.tag === 'b')!;
    expect(mark.tabIndex).toBe(0);
    const press = mark.listeners.keydown![0]!;
    press({ key: 'Enter', preventDefault: () => {}, stopPropagation: () => {} });
    expect(opened).toEqual(['unit:scout']);
    setKeywordOpener(null);
  });

  it('is bold and inert inside a control — the ruling’s middle clause', async () => {
    installFakeDocument();
    const { renderDescriptor } = await import('../../src/ui/keywords');
    const fragment = renderDescriptor(ref('building', 'library', 'a Library'), {
      linked: false,
    }) as unknown as FakeNode;
    const mark = flatten(fragment).find((node) => node.tag === 'b')!;
    // Still bold, still the same word: what goes is the *link*, because the
    // click that opened the book would also press the button underneath it.
    expect(mark.className).toBe('kw');
    expect(mark.dataset.ref).toBeUndefined();
    expect(mark.tabIndex).toBe(-1);
    expect(mark.listeners.click).toBeUndefined();
  });

  it('asks the host, and a button is never a place for a link', async () => {
    installFakeDocument();
    const { keywordsAllowedIn } = await import('../../src/ui/keywords');
    expect(keywordsAllowedIn(fakeNode('article') as unknown as HTMLElement)).toBe(true);
    expect(keywordsAllowedIn(fakeNode('li') as unknown as HTMLElement)).toBe(true);
    expect(keywordsAllowedIn(fakeNode('button') as unknown as HTMLElement)).toBe(false);
    expect(keywordsAllowedIn(fakeNode('a') as unknown as HTMLElement)).toBe(false);
  });
});

describe('splitDescriptor', () => {
  it('is one text run for a sentence with nothing named in it', async () => {
    const { splitDescriptor } = await import('../../src/ui/keywords');
    expect(splitDescriptor('+2 gold')).toEqual([{ kind: 'text', text: '+2 gold' }]);
  });

  it('never emits an empty run between two marks', async () => {
    const { splitDescriptor } = await import('../../src/ui/keywords');
    const parts = splitDescriptor(
      `${ref('resource', 'iron', 'Iron')}${ref('resource', 'horses', 'Horses')}`,
    );
    expect(parts).toHaveLength(2);
    expect(parts.every((part) => part.kind === 'keyword')).toBe(true);
  });
});

// --- the register -----------------------------------------------------------

/**
 * **Every surface that prints a clause, and which way it prints it.**
 *
 * The ruling's third claim, held as a list: a descriptor is drawn through
 * `setDescriptorText`, a plain-text sink takes `stripRefs`, and there is no
 * third option. A new surface that printed `clause.text` raw would show its
 * brackets — the mechanical half below catches that — and a new surface that
 * printed it *plainly* when it should have drawn it is what this list is for.
 */
const DESCRIPTOR_SURFACES: readonly [string, string][] = [
  ['compendium.ts', 'the book’s own clauses and its written shelves'],
  ['cityPanel.ts', 'the build list’s hover card'],
  ['offerCard.ts', 'the offer faces, their notes and their clause lists'],
  ['statecraftScreen.ts', 'the charter, the doctrines and the collection'],
  ['religionScreen.ts', 'the belief faces and the rites'],
  ['unitPanel.ts', 'the rite card and the caravan’s lines'],
  ['reliquaryScreen.ts', 'the legacy on every card in the pile'],
  ['greatPersonCeremony.ts', 'the legacy, as the spend ceremony’s headline'],
];

/**
 * The one file that **composes** clauses without printing any.
 *
 * `greatPersonFace.ts` puts `Forever:` on the head of a legacy's first clause
 * and hands the list on; the two surfaces above are what draw it, and both are
 * in the register. It is named here rather than exempted quietly, because the
 * sweep below cannot tell composing from printing and a silent skip is how a
 * real offender gets in wearing the same shape.
 */
const CLAUSE_COMPOSERS: readonly string[] = ['greatPersonFace.ts'];

const PLAIN_SINKS: readonly [string, string][] = [
  ['controls.ts', 'the rite sentence — a chronicle line and a toast'],
  ['religionScreen.ts', 'the wheel’s title attribute'],
  ['unitPanel.ts', 'a great person’s legacy, in a title attribute'],
  ['compendium.ts', 'the index’s search, which is over words'],
];

describe('the descriptor register', () => {
  it('draws a clause through the one renderer, on every descriptor surface', () => {
    for (const [file, what] of DESCRIPTOR_SURFACES) {
      expect(source(file), `${file} — ${what}`).toContain('setDescriptorText(');
    }
  });

  it('takes the words plainly wherever the platform draws the string', () => {
    for (const [file, what] of PLAIN_SINKS) {
      expect(source(file), `${file} — ${what}`).toContain('stripRefs(');
    }
  });

  it('lets a composer touch a clause without printing it, and names it', () => {
    // The composer returns `CardClause[]` and draws nothing; what proves that is
    // that it never reaches either printer, which is exactly what the sweep
    // below would have flagged it for.
    for (const name of CLAUSE_COMPOSERS) {
      const text = source(name);
      expect(text, name).toContain('CardClause[]');
      expect(text, name).not.toContain('setDescriptorText(');
      expect(text, name).not.toContain('stripRefs(');
    }
  });

  it('never prints a clause raw', () => {
    // The mechanical half, and the only one that catches a surface nobody
    // remembered to add above: every `clause.text` in `src/ui` sits within reach
    // of one of the two ways of printing it.
    const offenders: string[] = [];
    for (const path of Object.keys(SOURCES)) {
      if (!path.includes('/src/ui/') || path.endsWith('keywords.ts')) continue;
      if (CLAUSE_COMPOSERS.some((name) => path.endsWith(`/${name}`))) continue;
      const text = SOURCES[path]!;
      for (const match of text.matchAll(/clause\.text/g)) {
        const at = match.index ?? 0;
        const window = text.slice(Math.max(0, at - 400), at + 400);
        const printed =
          window.includes('setDescriptorText(') ||
          window.includes('stripRefs(') ||
          window.includes('renderDescriptor(');
        if (!printed) offenders.push(`${path}:${text.slice(0, at).split('\n').length}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the links out of the two surfaces that are buttons', () => {
    // An offer face and an Order in the collection are `<button>`s, and the
    // click is a decision. The offer card says so outright; the Statecraft and
    // Religion screens ask `keywordsAllowedIn`, which answers the same thing
    // from the tag they built.
    expect(source('offerCard.ts')).toContain('{ linked: false }');
    expect(source('statecraftScreen.ts')).toContain('keywordsAllowedIn(into)');
    expect(source('religionScreen.ts')).toContain('keywordsAllowedIn(into)');
  });

  it('keeps them out of the hover cards no pointer can reach, too', () => {
    // `infoCard.ts` is `pointer-events: none` for every card but the chart's, so
    // a keyword offering itself as clickable there would be an affordance for a
    // click that cannot land.
    expect(source('cityPanel.ts')).toContain('{ linked: false }');
    expect(source('unitPanel.ts')).toContain('{ linked: false }');
  });

  it('hands the interface one way to open the book', () => {
    expect(source('main.ts')).toContain('setKeywordOpener((entryId) => compendium.open(entryId))');
  });

  it('draws a keyword bold, and underlines only the ones that answer a click', () => {
    const css = source('style.css');
    expect(css).toContain('.kw {');
    expect(css).toContain('.kw[data-ref] {');
    expect(css).toContain('text-decoration: underline');
  });
});

// --- the sticky card --------------------------------------------------------

describe('the sticky hover card', () => {
  const open = (): StickyState => stickyStep(STICKY_CLOSED, 'enterAnchor');

  it('opens when the pointer arrives on the node', () => {
    expect(open()).toEqual({ overAnchor: true, overCard: false, open: true });
  });

  it('stays up while the pointer crosses from the node to the card', () => {
    // The gesture the whole thing exists for. Leaving the node does not close
    // it; the grace timer is what would, and arriving on the card cancels it.
    let state = open();
    state = stickyStep(state, 'leaveAnchor');
    expect(state.open).toBe(true);
    expect(stickyClosing(state)).toBe(true);
    state = stickyStep(state, 'enterCard');
    expect(stickyClosing(state)).toBe(false);
    // The timer arriving late now finds the pointer on the card and does nothing.
    expect(stickyStep(state, 'grace').open).toBe(true);
  });

  it('goes when the pointer has left both and the grace has passed', () => {
    let state = stickyStep(open(), 'enterCard');
    state = stickyStep(state, 'leaveAnchor');
    state = stickyStep(state, 'leaveCard');
    expect(state.open).toBe(true);
    expect(stickyClosing(state)).toBe(true);
    expect(stickyStep(state, 'grace')).toEqual(STICKY_CLOSED);
  });

  it('goes at once when a keyword inside it is clicked', () => {
    // The Compendium opens over the chart, so a card left behind it is a ghost.
    // No grace at all: the player has said where they are going.
    const state = stickyStep(open(), 'enterCard');
    expect(stickyStep(state, 'keyword')).toEqual(STICKY_CLOSED);
  });

  it('goes on Escape and on a click elsewhere', () => {
    expect(stickyStep(open(), 'escape')).toEqual(STICKY_CLOSED);
    expect(stickyStep(open(), 'elsewhere')).toEqual(STICKY_CLOSED);
  });

  it('cannot be entered when it is not up', () => {
    expect(stickyStep(STICKY_CLOSED, 'enterCard')).toEqual(STICKY_CLOSED);
  });

  it('re-opens after it has been dismissed', () => {
    // A closed machine is the machine it started as, so the next hover is a
    // first hover. A `keyword` that left `overAnchor` set would leave the node
    // unable to raise its card again until the pointer had gone away.
    const dismissed = stickyStep(stickyStep(open(), 'enterCard'), 'keyword');
    expect(stickyStep(dismissed, 'enterAnchor').open).toBe(true);
  });

  it('waits long enough to cross the gap and no longer', () => {
    expect(STICKY_GRACE_MS).toBeGreaterThan(0);
    expect(STICKY_GRACE_MS).toBeLessThanOrEqual(300);
  });

  it('is asked for by the star chart and by nothing else', () => {
    expect(source('techTree.ts')).toContain('sticky: true');
    for (const file of ['cityPanel.ts', 'unitPanel.ts', 'topBar.ts']) {
      expect(source(file), file).not.toContain('sticky:');
    }
  });

  it('hears the keyword’s click before the keyword swallows it', () => {
    // The one ordering bug in the whole mechanism, and it is invisible: a
    // keyword stops its own click from propagating (it sits inside panels with
    // their own handlers), so a *bubble* listener on the card would never run
    // and the card would stay up behind the book it had just opened. The card
    // listens in the capture phase, which runs first.
    const card = source('infoCard.ts');
    const at = card.indexOf("card.addEventListener(\n      'click'");
    expect(at).toBeGreaterThan(-1);
    expect(card.slice(at, at + 400)).toContain('true,');
  });

  it('is the only card the pointer may enter, in the stylesheet too', () => {
    const css = source('style.css');
    expect(css).toContain('.info-card.is-sticky');
    expect(css).toContain('pointer-events: auto');
  });

  it('links the names inside the chart’s card, which is the one card that can', () => {
    const chart = source('techTree.ts');
    expect(chart).toContain('giftEntryId(gift)');
    expect(chart).toContain('nameKeyword(entry, gift.name)');
  });
});
