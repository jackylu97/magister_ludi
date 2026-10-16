/**
 * The hover cards on keyword links (batch T2, `docs/plans/tutorial.md` section
 * 5.6): the short definition each card prints, and the layer that draws them.
 *
 * Three halves:
 *
 *   - **the definition**, read off the real Compendium: what a card keeps of an
 *     entry, that it rewords nothing, and that every keyword a describer prints
 *     has one;
 *   - **the layer on a page**, run against a small stand-in DOM
 *     (`keywordCardsHelpers.ts`) with fake timers: hover, lock, nesting, back,
 *     Escape, a click outside, the keyboard, the inside-a-control rule, and that
 *     dispose takes off every listener mount put on;
 *   - **the register**, read off the sources: the layer prints through the one
 *     renderer, and `main.ts` mounts it once, as a card in the screen registry
 *     and out of the per-game disposers.
 *
 * The rules themselves (when a card shows, locks and closes) are
 * `keywordCardStack.test.ts`'s; this file holds the DOM half to them.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUILDING_IDS, buildingDef, isBuildingId } from '../../src/sim/buildingData';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { ALL_BELIEF_IDS, RITE_IDS } from '../../src/sim/religionData';
import { describeCard, ref } from '../../src/sim/statecraft';
import { type CardId, DOCTRINE_IDS, GOVERNMENT_IDS, ORDER_IDS } from '../../src/sim/statecraftData';
import {
  type CompendiumEntry,
  type CompendiumSectionId,
  compendiumSections,
} from '../../src/ui/compendium';
import { KEYWORD_GRACE_MS, KEYWORD_HOLD_MS, KEYWORD_SHOW_MS } from '../../src/ui/keywordCardStack';
import { type KeywordCards, mountKeywordCards } from '../../src/ui/keywordCards';
import {
  type DefinitionReader,
  definitionReader,
  loadKeywordDefinitions,
  shortDefinition,
} from '../../src/ui/keywordDefinitions';
import { keywordsAllowedIn, setDescriptorText, setKeywordOpener } from '../../src/ui/keywords';
import {
  type FakeDom,
  type FakeEvent,
  type FakeNode,
  type Rect,
  installFakeDom,
} from './keywordCardsHelpers';
import { braceBody, uiSource } from './sourceHelpers';

// --- the definition -------------------------------------------------------------

const BOOK = compendiumSections();
const ENTRIES = BOOK.flatMap((section) => section.entries);

function entryOf(id: string): CompendiumEntry {
  const entry = ENTRIES.find((one) => one.id === id);
  if (entry === undefined) throw new Error(`the Compendium has no ${id}`);
  return entry;
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

describe('the short definition', () => {
  it('keeps an entry\'s figures and rules, and leaves its notes and flavour to the full entry', () => {
    const scout = entryOf('unit:scout');
    const definition = shortDefinition(scout);
    expect(definition.name).toBe(scout.name);
    expect(definition.eyebrow).toBe(scout.eyebrow);
    expect(definition.rows).toBe(scout.rows);
    expect(definition.lines).toEqual(scout.clauses.filter((clause) => clause.note !== true));
    expect(definition.lines.length).toBeLessThan(scout.clauses.length);
    expect(definition.prose).toBe(false);
    expect('flavor' in definition).toBe(false);
  });

  it('keeps a withdrawn card\'s standing line, first, and a line not built yet', () => {
    const withdrawn = ENTRIES.find(
      (entry) => entry.section === 'order' && entry.clauses[0]?.standing === true,
    )!;
    expect(shortDefinition(withdrawn).lines[0]!.standing).toBe(true);
    const unbuilt = ENTRIES.find((entry) => entry.clauses.some((clause) => clause.deferred === true))!;
    expect(shortDefinition(unbuilt).lines.some((line) => line.deferred === true)).toBe(true);
  });

  it('gives a written page its first paragraph, which is where the book says what a thing is', () => {
    for (const id of ['concept:yields', 'unit:about']) {
      const page = entryOf(id);
      const definition = shortDefinition(page);
      expect(definition.prose, id).toBe(true);
      expect(definition.rows, id).toEqual([]);
      expect(definition.lines, id).toEqual([page.clauses[0]]);
    }
  });

  it('quotes the entry and never rewords it: every row and line is the entry\'s own object', () => {
    // The Compendium's rule, which this card inherits: no hand-written prose
    // about a number. A definition is a selection, so the objects are the same.
    for (const entry of ENTRIES) {
      const definition = shortDefinition(entry);
      for (const line of definition.lines) expect(entry.clauses, entry.id).toContain(line);
      for (const row of definition.rows) expect(entry.rows, entry.id).toContain(row);
    }
  });

  it('has a definition for every keyword a describer prints, and for every one in the book', () => {
    const read = definitionReader(BOOK);
    const marks = new Set<string>();
    for (const id of EVERY_CARD) {
      // A withdrawn building has no page and is named by no live card
      // (`keywords.test.ts` says why), so its own self-scoped clause is skipped.
      if (isBuildingId(id) && buildingDef(id).retired === true) continue;
      for (const clause of describeCard(id)) {
        for (const [, kind, key] of clause.text.matchAll(/\[\[([a-zA-Z]+):([A-Za-z0-9_]+)\|/g)) {
          marks.add(`${kind}:${key}`);
        }
      }
    }
    for (const entry of ENTRIES) {
      for (const clause of entry.clauses) {
        for (const [, kind, key] of clause.text.matchAll(/\[\[([a-zA-Z]+):([A-Za-z0-9_]+)\|/g)) {
          marks.add(`${kind}:${key}`);
        }
      }
    }
    expect(marks.size).toBeGreaterThan(50);
    for (const mark of marks) expect(read(mark), mark).not.toBeNull();
  });

  it('answers nothing for an id the book has no entry for', () => {
    expect(definitionReader(BOOK)('unit:nobody')).toBeNull();
  });

  it('builds the whole book once, on first use, and shares it', async () => {
    const first = loadKeywordDefinitions();
    expect(loadKeywordDefinitions()).toBe(first);
    const read = await first;
    expect(read('unit:scout')?.name).toBe(entryOf('unit:scout').name);
    expect(read('unit:scout')).toBe(read('unit:scout'));
  });
});

// --- the layer on a page -----------------------------------------------------------

/** A small book of its own, so these tests do not move with the balance data. */
function entry(
  id: string,
  name: string,
  rows: CompendiumEntry['rows'],
  clauses: CompendiumEntry['clauses'],
): CompendiumEntry {
  const [section] = id.split(':') as [CompendiumSectionId];
  return { id, section, name, eyebrow: `${section} entry`, mark: null, rows, clauses, flavor: 'A line of flavour.' };
}

const SHELF: CompendiumEntry[] = [
  entry('building:granary', 'Granary', [{ label: 'Production cost', figures: '30⚙' }], [
    { text: '+2 food' },
    { text: `Unlocked by researching ${ref('tech', 'earthenware', 'Pottery')}.` },
    { text: 'The price on the roster.', note: true },
  ]),
  entry('tech:earthenware', 'Pottery', [], [
    { text: `New building: ${ref('building', 'granary', 'Granary')}` },
    { text: `Needed for ${ref('unit', 'scout', 'a Scout')}` },
  ]),
  entry('unit:scout', 'Scout', [{ label: 'Combat strength', figures: '10' }], [{ text: 'Explores on its own.' }]),
  entry('wonder:theOracle', 'The Oracle', [], [
    { text: `+1 faith in every city with ${ref('wonder', 'theOracle', 'The Oracle')}` },
  ]),
];

const READER: DefinitionReader = definitionReader([{ id: 'building', name: 'A shelf', entries: SHELF }]);

let dom: FakeDom;
let restore: () => void = () => {};
let layer: KeywordCards | null = null;
/** Every entry the book was asked to open, by the fallback or the card's button. */
let opened: string[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  ({ dom, restore } = installFakeDom());
  opened = [];
  setKeywordOpener((entryId) => opened.push(entryId));
});

afterEach(() => {
  layer?.dispose();
  layer = null;
  setKeywordOpener(null);
  restore();
  vi.useRealTimers();
});

function mount(definitions: () => Promise<DefinitionReader> = () => Promise.resolve(READER)): KeywordCards {
  layer = mountKeywordCards({ definitions });
  return layer;
}

/** A paragraph on the page holding one descriptor; its keywords, laid out in a row. */
function paragraph(text: string, at: Rect = { left: 100, top: 100, width: 60, height: 16 }): FakeNode[] {
  const line = dom.document.createElement('p');
  dom.document.body.append(line);
  setDescriptorText(line as unknown as HTMLElement, text);
  const words = line.querySelectorAll('.kw');
  words.forEach((word, index) => {
    word.rect = { ...at, left: at.left + index * 100 };
  });
  return words;
}

function cardsOnPage(): FakeNode[] {
  return dom.document.body.querySelectorAll('.kwc');
}

function nameOf(card: FakeNode): string {
  return card.querySelector('.kwc-name')!.textContent;
}

/** Lets the definitions' promise land. */
async function settle(): Promise<void> {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
}

function point(node: FakeNode): void {
  dom.fire(node, 'pointerover', { pointerType: 'mouse' });
}

function pointAway(): void {
  point(dom.document.body);
}

/** Rests the pointer on a keyword until its card shows; the card. */
async function rest(word: FakeNode): Promise<FakeNode> {
  point(word);
  await settle();
  vi.advanceTimersByTime(KEYWORD_SHOW_MS);
  const cards = cardsOnPage();
  expect(cards.length, 'a card showed').toBeGreaterThan(0);
  return cards[cards.length - 1]!;
}

/** A press and a click, as a mouse makes them. */
function click(node: FakeNode): void {
  dom.fire(node, 'pointerdown', { pointerType: 'mouse' });
  dom.fire(node, 'click');
}

function press(target: FakeNode, key: string, init: Record<string, unknown> = {}) {
  return dom.fire(target, 'keydown', { key, ...init });
}

/** Granary pinned from the page, and Pottery pinned from the Granary card. */
async function twoPinned(): Promise<{ granary: FakeNode; root: FakeNode; pottery: FakeNode; child: FakeNode }> {
  const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
  const root = await rest(granary!);
  click(granary!);
  const pottery = root.querySelector('.kw[data-ref="tech:earthenware"]')!;
  const box = root.getBoundingClientRect();
  pottery.rect = { left: box.left + 20, top: box.top + 60, width: 50, height: 16 };
  const child = await rest(pottery);
  click(pottery);
  return { granary: granary!, root, pottery, child };
}

describe('the hover cards on a page', () => {
  it('shows a keyword\'s definition when the pointer rests on it, below the word and clear of it', async () => {
    mount();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    const card = await rest(granary!);
    expect(nameOf(card)).toBe('Granary');
    expect(card.querySelector('.kwc-eyebrow')!.textContent).toBe('building entry');
    expect(card.querySelector('.kwc-row-label')!.textContent).toBe('Production cost');
    expect(card.querySelectorAll('.kwc-line').map((line) => line.textContent)).toEqual([
      '+2 food',
      'Unlocked by researching Pottery.',
    ]);
    // The note and the flavour are the full entry's.
    expect(card.textContent).not.toContain('roster');
    expect(card.textContent).not.toContain('flavour');
    // A preview: the pointer passes through it, so its words are bold but not links.
    expect(card.classList.contains('is-locked')).toBe(false);
    expect(card.getAttribute('role')).toBe('tooltip');
    expect(card.querySelector('.kw')).not.toBeNull();
    expect(card.querySelector('.kw[data-ref]')).toBeNull();
    expect(card.querySelector('.kwc-hint')!.textContent).toBe('Click or hold to keep it open');
    expect(card.getBoundingClientRect().top).toBeGreaterThanOrEqual(granary!.getBoundingClientRect().bottom);
  });

  it('shows nothing for a pointer that only passes over a keyword', async () => {
    mount();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    point(granary!);
    await settle();
    vi.advanceTimersByTime(KEYWORD_SHOW_MS / 2);
    pointAway();
    vi.advanceTimersByTime(KEYWORD_SHOW_MS * 2);
    expect(cardsOnPage()).toEqual([]);
  });

  it('waits for the definitions on the first hover, then shows the card', async () => {
    let arrive: (read: DefinitionReader) => void = () => {};
    mount(() => new Promise((resolve) => (arrive = resolve)));
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    point(granary!);
    vi.advanceTimersByTime(KEYWORD_SHOW_MS);
    expect(cardsOnPage()).toEqual([]);
    arrive(READER);
    await settle();
    expect(cardsOnPage().map(nameOf)).toEqual(['Granary']);
  });

  it('locks on a click instead of opening the book, and a clicked card outlasts the pointer', async () => {
    mount();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    const card = await rest(granary!);
    click(granary!);
    expect(opened).toEqual([]);
    expect(card.classList.contains('is-locked')).toBe(true);
    expect(card.classList.contains('is-pinned')).toBe(true);
    expect(card.getAttribute('role')).toBe('dialog');
    // Locked, its own keywords are links.
    expect(card.querySelector('.kw[data-ref="tech:earthenware"]')).not.toBeNull();
    expect(granary!.getAttribute('aria-expanded')).toBe('true');
    pointAway();
    vi.advanceTimersByTime(KEYWORD_GRACE_MS * 5);
    expect(cardsOnPage()).toEqual([card]);
    // The first card has nothing to go back to; it has the full entry and a close.
    expect(card.querySelector('.kwc-back')).toBeNull();
    expect(card.querySelector('.kwc-entry')).not.toBeNull();
    expect(card.querySelector('.kwc-close')).not.toBeNull();
  });

  it('locks when the pointer holds on the keyword, and a held card lets go once the pointer leaves it', async () => {
    mount();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    const card = await rest(granary!);
    expect(card.querySelector('.kwc-hold')).not.toBeNull();
    vi.advanceTimersByTime(KEYWORD_HOLD_MS);
    expect(card.classList.contains('is-locked')).toBe(true);
    expect(card.classList.contains('is-pinned')).toBe(false);
    expect(card.querySelector('.kwc-hold')).toBeNull();
    // Into the card: it stays.
    point(card.querySelector('.kwc-name')!);
    vi.advanceTimersByTime(KEYWORD_GRACE_MS * 3);
    expect(cardsOnPage()).toEqual([card]);
    // Out of it: it goes.
    pointAway();
    vi.advanceTimersByTime(KEYWORD_GRACE_MS);
    expect(cardsOnPage()).toEqual([]);
  });

  it('nests: a keyword on a locked card opens a child beside it, and back returns to the parent', async () => {
    mount();
    const { root, child } = await twoPinned();
    expect(cardsOnPage().map(nameOf)).toEqual(['Granary', 'Pottery']);
    expect(child.getBoundingClientRect().left).toBeGreaterThanOrEqual(root.getBoundingClientRect().right);
    const back = child.querySelector('.kwc-back')!;
    expect(back.getAttribute('aria-label')).toBe('Back to Granary');
    click(back);
    expect(cardsOnPage()).toEqual([root]);
  });

  it('closes the top card on Escape, then the next, and then lets Escape through to the sheet', async () => {
    mount();
    await twoPinned();
    // A sheet bound after the cards were mounted, as every sheet in a game is.
    const sheet: string[] = [];
    const onSheetKey = (event: FakeEvent): void => {
      sheet.push(String(event.key));
    };
    dom.window.addEventListener('keydown', onSheetKey, true);
    const first = press(dom.document.body, 'Escape');
    expect(first.defaultPrevented).toBe(true);
    expect(cardsOnPage().map(nameOf)).toEqual(['Granary']);
    press(dom.document.body, 'Escape');
    expect(cardsOnPage()).toEqual([]);
    expect(sheet).toEqual([]);
    const third = press(dom.document.body, 'Escape');
    expect(third.defaultPrevented).toBe(false);
    expect(sheet).toEqual(['Escape']);
    dom.window.removeEventListener('keydown', onSheetKey, true);
  });

  it('closes every card on a press outside them, and none on a press on a card', async () => {
    mount();
    const { root } = await twoPinned();
    dom.fire(root.querySelector('.kwc-name')!, 'pointerdown', { pointerType: 'mouse' });
    expect(cardsOnPage()).toHaveLength(2);
    dom.fire(dom.document.body, 'pointerdown', { pointerType: 'mouse' });
    expect(cardsOnPage()).toEqual([]);
  });

  it('opens the full entry from the card, and closes the cards to do it', async () => {
    mount();
    const { child } = await twoPinned();
    click(child.querySelector('.kwc-entry')!);
    expect(opened).toEqual(['tech:earthenware']);
    expect(cardsOnPage()).toEqual([]);
  });

  it('closes every card from the close button', async () => {
    mount();
    const { child } = await twoPinned();
    click(child.querySelector('.kwc-close')!);
    expect(cardsOnPage()).toEqual([]);
    expect(opened).toEqual([]);
  });

  it('draws a keyword that names its own card bold, and not as a link', async () => {
    mount();
    const [oracle] = paragraph(`Build ${ref('wonder', 'theOracle', 'The Oracle')}.`);
    const card = await rest(oracle!);
    click(oracle!);
    const self = card.querySelector('.kw')!;
    expect(self.textContent).toBe('The Oracle');
    expect(self.getAttribute('data-ref')).toBeNull();
  });

  it('follows its keyword on a scroll, and closes when the keyword leaves the screen', async () => {
    mount();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    const card = await rest(granary!);
    click(granary!);
    const top = card.getBoundingClientRect().top;
    granary!.rect = { ...granary!.rect!, top: granary!.rect!.top + 50 };
    dom.fire(dom.window, 'scroll');
    dom.flushFrames();
    expect(card.getBoundingClientRect().top).toBe(top + 50);
    granary!.rect = { ...granary!.rect!, top: -400 };
    dom.fire(dom.window, 'scroll');
    dom.flushFrames();
    expect(cardsOnPage()).toEqual([]);
  });
});

describe('a keyword inside a control', () => {
  /** An offer card's face: a button with a keyword in its text. */
  function offerButton(): { button: FakeNode; word: FakeNode; picks: () => number } {
    const button = dom.document.createElement('button');
    dom.document.body.append(button);
    let picks = 0;
    button.addEventListener('click', () => {
      picks += 1;
    });
    const host = button as unknown as HTMLElement;
    setDescriptorText(host, `Take ${ref('building', 'granary', 'a Granary')}`, { linked: keywordsAllowedIn(host) });
    const word = button.querySelector('.kw')!;
    word.rect = { left: 400, top: 300, width: 60, height: 16 };
    return { button, word, picks: () => picks };
  }

  it('names its entry like any keyword, and carries no link, no tab stop and no handler', () => {
    const [outside] = paragraph(`Build ${ref('building', 'granary', 'a Granary')}.`);
    expect(outside!.getAttribute('data-keyword')).toBe('building:granary');
    expect(outside!.getAttribute('data-ref')).toBe('building:granary');
    const { word } = offerButton();
    expect(word.getAttribute('data-keyword')).toBe('building:granary');
    expect(word.getAttribute('data-ref')).toBeNull();
    expect(word.getAttribute('tabindex')).toBeNull();
    expect(word.listeners).toEqual([]);
  });

  it('shows its card on hover, and a click on it picks the button and does nothing else', async () => {
    mount();
    const { word, picks } = offerButton();
    expect(word.getAttribute('data-ref')).toBeNull();
    const card = await rest(word);
    expect(nameOf(card)).toBe('Granary');
    expect(card.querySelector('.kwc-hint')!.textContent).toBe('Hold to keep it open');
    click(word);
    expect(picks()).toBe(1);
    expect(opened).toEqual([]);
    expect(cardsOnPage()).toEqual([]);
  });

  it('locks by holding, and the card is drawn on the page, never inside the button', async () => {
    mount();
    const { button, word, picks } = offerButton();
    const card = await rest(word);
    vi.advanceTimersByTime(KEYWORD_HOLD_MS);
    expect(card.classList.contains('is-locked')).toBe(true);
    expect(button.contains(card)).toBe(false);
    // A press on the card's own button reaches the card, never the offer.
    click(card.querySelector('.kwc-entry')!);
    expect(opened).toEqual(['building:granary']);
    expect(picks()).toBe(0);
  });
});

describe('the keyboard', () => {
  it('shows the card on focus, pins it on Enter with focus inside, and Escape hands focus back quietly', async () => {
    mount();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    granary!.focus();
    await settle();
    const [card] = cardsOnPage();
    expect(card!.querySelector('.kwc-hint')!.textContent).toBe('Press Enter to keep it open');
    expect(granary!.getAttribute('aria-describedby')).toBe(card!.querySelector('.kwc-body')!.id);
    press(granary!, 'Enter');
    expect(opened).toEqual([]);
    expect(dom.document.activeElement).toBe(card);
    expect(card!.classList.contains('is-pinned')).toBe(true);
    expect(card!.getAttribute('aria-labelledby')).toBe(card!.querySelector('.kwc-name')!.id);
    expect(granary!.getAttribute('aria-expanded')).toBe('true');
    expect(granary!.getAttribute('aria-describedby')).toBeNull();
    press(card!, 'Escape');
    expect(cardsOnPage()).toEqual([]);
    expect(dom.document.activeElement).toBe(granary);
    expect(granary!.getAttribute('aria-expanded')).toBeNull();
    // Focus came back to the keyword without opening the card the player closed.
    vi.advanceTimersByTime(KEYWORD_SHOW_MS + KEYWORD_GRACE_MS);
    expect(cardsOnPage()).toEqual([]);
  });

  it('takes no notice of the focus a click leaves on a keyword', async () => {
    // A click focuses the keyword it lands on. That is not the keyboard: it
    // shows no keyboard card, and it does not keep a held card past the pointer.
    mount();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    dom.keyboard = false;
    granary!.focus();
    await settle();
    expect(cardsOnPage()).toEqual([]);
    const card = await rest(granary!);
    vi.advanceTimersByTime(KEYWORD_HOLD_MS);
    expect(card.classList.contains('is-locked')).toBe(true);
    pointAway();
    vi.advanceTimersByTime(KEYWORD_GRACE_MS);
    expect(cardsOnPage()).toEqual([]);
  });

  it('keeps Tab going round the top card rather than out of it', async () => {
    mount();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    granary!.focus();
    await settle();
    press(granary!, 'Enter');
    const [card] = cardsOnPage();
    const items = card!.querySelectorAll('button:not(:disabled), [tabindex]:not([tabindex="-1"])');
    const first = items[0]!;
    const last = items[items.length - 1]!;
    expect(first.getAttribute('data-ref')).toBe('tech:earthenware');
    expect(last.classList.contains('kwc-close')).toBe(true);
    press(card!, 'Tab');
    expect(dom.document.activeElement).toBe(first);
    last.focus();
    press(last, 'Tab');
    expect(dom.document.activeElement).toBe(first);
    press(first, 'Tab', { shiftKey: true });
    expect(dom.document.activeElement).toBe(last);
  });

  it('goes back a level from the keyboard, with focus on the keyword that opened the child', async () => {
    mount();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    granary!.focus();
    await settle();
    press(granary!, 'Enter');
    const [root] = cardsOnPage();
    const pottery = root!.querySelector('.kw[data-ref="tech:earthenware"]')!;
    const box = root!.getBoundingClientRect();
    pottery.rect = { left: box.left + 20, top: box.top + 60, width: 50, height: 16 };
    pottery.focus();
    press(pottery, 'Enter');
    const child = cardsOnPage()[1]!;
    expect(dom.document.activeElement).toBe(child);
    child.querySelector('.kwc-back')!.focus();
    click(child.querySelector('.kwc-back')!);
    expect(cardsOnPage()).toEqual([root]);
    expect(dom.document.activeElement).toBe(pottery);
  });
});

describe('falling back to the book', () => {
  it('opens the book on a click when the definitions could not load', async () => {
    mount(() => Promise.reject(new Error('a chunk the server no longer has')));
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    point(granary!);
    await settle();
    click(granary!);
    expect(opened).toEqual(['building:granary']);
    expect(cardsOnPage()).toEqual([]);
  });

  describe('a keyword its own click takes off the page', () => {
    // The star chart's card empties itself on a keyword click, in the capture
    // phase, before the keyword's own handler hears the click.
    it('opens the book when nothing knows where the keyword was', () => {
      mount();
      const [gone] = paragraph(`Build ${ref('building', 'granary', 'a Granary')}.`);
      gone!.remove();
      click(gone!);
      expect(opened).toEqual(['building:granary']);
    });

    it('pins the card where the pointer found the keyword, even before the card showed', async () => {
      mount();
      const [word] = paragraph(`Build ${ref('building', 'granary', 'a Granary')}.`);
      const where = word!.getBoundingClientRect();
      point(word!);
      await settle();
      word!.remove();
      click(word!);
      expect(opened).toEqual([]);
      const [card] = cardsOnPage();
      expect(card!.classList.contains('is-pinned')).toBe(true);
      expect(card!.getBoundingClientRect().top).toBeGreaterThanOrEqual(where.bottom);
    });

    it('locks a card already showing where it is', async () => {
      mount();
      const [word] = paragraph(`Build ${ref('building', 'granary', 'a Granary')}.`);
      const card = await rest(word!);
      const top = card.getBoundingClientRect().top;
      word!.remove();
      click(word!);
      expect(opened).toEqual([]);
      expect(card.classList.contains('is-pinned')).toBe(true);
      expect(card.getBoundingClientRect().top).toBe(top);
    });
  });
});

describe('mounting and disposing', () => {
  it('takes off every listener it put on, and keywords open the book again', async () => {
    const before = dom.pageListeners();
    const cards = mount();
    expect(dom.pageListeners().length).toBeGreaterThan(before.length);
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    await rest(granary!);
    expect(cards.isOpen).toBe(true);
    cards.dispose();
    expect(dom.pageListeners()).toEqual(before);
    expect(cardsOnPage()).toEqual([]);
    expect(cards.isOpen).toBe(false);
    // Nothing left running fires later.
    vi.runOnlyPendingTimers();
    expect(cardsOnPage()).toEqual([]);
    click(granary!);
    expect(opened).toEqual(['building:granary']);
  });

  it('never holds two sets of listeners: mounting again takes the first layer off', () => {
    const before = dom.pageListeners();
    const first = mountKeywordCards({ definitions: () => Promise.resolve(READER) });
    const once = dom.pageListeners();
    layer = mountKeywordCards({ definitions: () => Promise.resolve(READER) });
    expect(dom.pageListeners()).toEqual(once);
    layer.dispose();
    expect(dom.pageListeners()).toEqual(before);
    // The first one's dispose is safe to call again.
    first.dispose();
    expect(dom.pageListeners()).toEqual(before);
  });

  it('answers the screen registry: whether a card is up, and closing them all', async () => {
    const cards = mount();
    expect(cards.isOpen).toBe(false);
    cards.close();
    const [granary] = paragraph(`Build ${ref('building', 'granary', 'a Granary')} first.`);
    await rest(granary!);
    click(granary!);
    expect(cards.isOpen).toBe(true);
    cards.close();
    expect(cards.isOpen).toBe(false);
    expect(cardsOnPage()).toEqual([]);
  });
});

// --- the register -------------------------------------------------------------------

describe('the register', () => {
  it('prints every definition through the one renderer and the one figure printer', () => {
    const layerSource = uiSource('keywordCards.ts');
    expect(layerSource).toContain('setDescriptorText(');
    expect(layerSource).toContain('setYieldText(');
    expect(layerSource).not.toContain('innerHTML');
    // And composes no words of its own about a card: the definitions module
    // only selects, so it never reads a clause's text at all.
    expect(uiSource('keywordDefinitions.ts')).not.toMatch(/\.text\b/);
  });

  it('loads the Compendium on first use rather than with the page', () => {
    const definitions = uiSource('keywordDefinitions.ts');
    expect(definitions).toContain("import('./compendium')");
    expect(definitions).not.toMatch(/^import \{[^}]*\} from '\.\/compendium';/m);
  });

  it('is mounted once by the game page, before any game is booted, and never disposed with one', () => {
    const main = uiSource('main.ts');
    const at = main.indexOf('mountKeywordCards(');
    expect(at).toBeGreaterThan(-1);
    expect(main.indexOf('mountKeywordCards(', at + 1)).toBe(-1);
    expect(at).toBeLessThan(main.indexOf('async function boot('));
    expect(main).not.toContain('keywordCards.dispose()');
    expect(main).not.toContain('keywordCards?.dispose()');
    expect(braceBody(main, 'async function boot(')).not.toContain('mountKeywordCards(');
  });

  it('is a card in the screen registry, so a card or a screen opening closes it', () => {
    expect(uiSource('main.ts')).toContain("screens.register(held('keywordCards', 'card', () => keywordCards));");
    // It never announces itself: it opens inside whatever sheet holds its
    // keyword, and announcing would close that sheet.
    expect(uiSource('main.ts')).not.toContain("screens.opening('keywordCards')");
  });
});
