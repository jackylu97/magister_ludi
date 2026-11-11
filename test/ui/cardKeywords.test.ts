/**
 * **The four card keywords on every surface** (batch DS8,
 * `docs/plans/deck-simplification-2026-11-10.md`, "Keywords").
 *
 * The user, 2026-11-10: *"The keyword should show on the card, and can be
 * moused over regardless of how many times they've seen it."* So four claims,
 * each one that can be false on one surface while the others look right:
 *
 *   1. **The Compendium has a page for each keyword**, at a stable anchor, and
 *      its first paragraph is the rule the tooltip shows.
 *   2. **Every surface that prints a card prints its keyword**: the offer hand,
 *      the collection on the Statecraft screen, the commission rail, the
 *      Compendium and the flair gallery. All of them print `describeCard`, whose
 *      first clause is the keyword, through the one descriptor renderer.
 *   3. **A Scaler shows its value** as a figure on its face.
 *   4. **The tooltip opens on hover and on keyboard focus, every time**, with no
 *      "seen it once" state: inside a control (the offer hand and the
 *      collection are buttons), keyboard focus on the control shows its card's
 *      keyword. A plain card shows nothing.
 *
 * This suite has no jsdom. The wiring is read from the sources, and the tooltip
 * is run on the stand-in DOM of `keywordCardsHelpers.ts`, with the real
 * Compendium's definitions. The simulation's half is
 * `test/sim/cardKeywords.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { describeCard, recordScalingOccasion, stripRefs } from '../../src/sim/statecraft';
import { ORDER_IDS, ORDER_KEYWORDS, type OrderId, orderDef, orderKeyword } from '../../src/sim/statecraftData';
import { bumpRevision, playerById } from '../../src/sim/state';
import { compendiumId, compendiumSections } from '../../src/ui/compendium';
import { KEYWORD_SHOW_MS } from '../../src/ui/keywordCardStack';
import { type KeywordCards, mountKeywordCards } from '../../src/ui/keywordCards';
import { definitionReader } from '../../src/ui/keywordDefinitions';
import { CARD_KEYWORD_ENTRIES, keywordsAllowedIn, setDescriptorText } from '../../src/ui/keywords';
import { SCALER_LABEL } from '../../src/ui/scalerFigure';
import { scalerFace, scalerStartFace } from '../../src/ui/scalerValue';
import { game } from '../sim/statecraftHelpers';
import { type FakeDom, type FakeNode, installFakeDom } from './keywordCardsHelpers';
import { braceBody, uiSource } from './sourceHelpers';

const BOOK = compendiumSections();
const ENTRIES = BOOK.flatMap((section) => section.entries);
const READ = definitionReader(BOOK);
const LIVE = ORDER_IDS.filter((id) => orderDef(id).retired !== true);

/** One live card of each keyword, and one plain card. */
const EXAMPLE = Object.fromEntries(
  ORDER_KEYWORDS.map((keyword) => [keyword, LIVE.find((id) => orderKeyword(id) === keyword)!]),
) as Record<(typeof ORDER_KEYWORDS)[number], OrderId>;
const PLAIN = LIVE.find((id) => orderKeyword(id) === null)!;

/** The flair gallery's card faces, which `sourceHelpers.ts` does not glob. */
const FLAIR = import.meta.glob('../../src/flairGallery/cardFaces.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function entryOf(id: string) {
  const entry = ENTRIES.find((one) => one.id === id);
  if (entry === undefined) throw new Error(`the Compendium has no ${id}`);
  return entry;
}

// --- 1. the pages ---------------------------------------------------------------

describe('the keyword pages', () => {
  it('has one page for each keyword, at a stable anchor, on the Concepts shelf', () => {
    expect([...CARD_KEYWORD_ENTRIES]).toEqual(['concept:commission', 'concept:charter', 'concept:scaler', 'concept:boon']);
    for (const keyword of ORDER_KEYWORDS) {
      const page = entryOf(`concept:${keyword}`);
      expect(page.section, keyword).toBe('concept');
      expect(page.written, keyword).toBe(true);
      expect(page.name.toLowerCase(), keyword).toBe(keyword);
    }
  });

  it('gives each tooltip the page’s first paragraph, which states the rule', () => {
    const rule = (keyword: string): string => {
      const definition = READ(`concept:${keyword}`)!;
      expect(definition.prose).toBe(true);
      expect(definition.lines).toEqual([entryOf(`concept:${keyword}`).clauses[0]]);
      return stripRefs(definition.lines[0]!.text);
    };
    expect(rule('commission')).toContain('until you meet its goal');
    expect(rule('commission')).toContain('leaves the chair');
    expect(rule('charter')).toContain('takes no chair');
    expect(rule('scaler')).toContain('while it is seated');
    expect(rule('scaler')).toContain('The figure on the card shows what it gives now');
    expect(rule('boon')).toContain('pays once, when you draft it');
    expect(rule('boon')).toContain('takes no chair');
  });

  it('prints the keyword on each card’s own page, first among its rules', () => {
    for (const id of LIVE) {
      const keyword = orderKeyword(id);
      const page = entryOf(compendiumId('order', id));
      const rules = page.clauses.filter((clause) => clause.standing !== true);
      const mark = keyword === null ? null : `[[concept:${keyword}|`;
      if (mark === null) {
        expect(rules.some((clause) => /\[\[concept:(commission|charter|scaler|boon)\|/.test(clause.text)), id).toBe(false);
      } else {
        expect(rules[0]?.text.startsWith(mark), id).toBe(true);
      }
    }
  });
});

// --- 2. every surface -------------------------------------------------------------

describe('every surface that prints a card prints its keyword', () => {
  it('is the first clause describeCard gives, for each kind, and none for a plain card', () => {
    for (const keyword of ORDER_KEYWORDS) {
      const first = describeCard(EXAMPLE[keyword])[0]!;
      expect(first.keyword, keyword).toBe(keyword);
      expect(READ(first.text.slice(2, first.text.indexOf('|'))), keyword).not.toBeNull();
    }
    expect(describeCard(PLAIN).some((clause) => clause.keyword !== undefined)).toBe(false);
  });

  it('deals the offer hand with the clauses joined, keyword first, through the one renderer', () => {
    const draft = braceBody(uiSource('main.ts'), 'function showStatecraftOffer()');
    expect(draft).toContain("note: describeCard(id).map((clause) => clause.text).join(' · ')");
    // The face prints the note as a descriptor, never as a link: it is a button.
    expect(braceBody(uiSource('offerCard.ts'), 'function faceBody(')).toContain(
      'setDescriptorText(note, option.note, { linked: false });',
    );
  });

  it('prints the collection’s clauses as descriptors, with the keyword set as a label', () => {
    const screen = uiSource('statecraftScreen.ts');
    expect(screen).toContain('drawOrderFace(button, id, describeCard(id));');
    const list = braceBody(screen, 'function clauseList(');
    expect(list).toContain("if (clause.keyword !== undefined) item.classList.add('is-keyword');");
    expect(list).toContain('setDescriptorText(item, clause.text, { linked });');
    expect(uiSource('style.css')).toContain('.sc-clause.is-keyword {');
  });

  it('prints the commission rail’s popover as descriptors, so its keyword has a tooltip', () => {
    const rail = uiSource('commissionRail.ts');
    expect(rail).toContain('setDescriptorText(line, clause.text, { linked: false });');
    expect(rail).not.toContain('stripRefs(clause.text)');
    // The chip points at its popover, which is how the keyboard reaches the keyword.
    expect(rail).toContain("button.setAttribute('aria-describedby', popId);");
  });

  it('shows one card of each keyword in the flair gallery, on the hand card the draft deals', () => {
    const source = Object.values(FLAIR)[0]!;
    expect(source).toContain('function keywordCardIds(): OrderId[]');
    expect(source).toContain('keywordHands.append(suitHandCard(realOption(id), orderSuitFace(id), index))');
    expect(source).toContain('...(scaler === null ? {} : { scaler })');
  });
});

// --- 3. a Scaler's value ----------------------------------------------------------------

describe('a Scaler’s value on its face', () => {
  it('shows the starting value before the first gain, and nothing on another card', () => {
    expect(scalerStartFace('theGatheringHost' as OrderId)).toEqual({ label: SCALER_LABEL, figure: '+2🔬 +2🎭' });
    expect(scalerStartFace('theMartyrology' as OrderId)).toEqual({ label: SCALER_LABEL, figure: '0🕯 0🎭' });
    for (const keyword of ['commission', 'charter', 'boon'] as const) {
      expect(scalerStartFace(EXAMPLE[keyword]), keyword).toBeNull();
    }
    expect(scalerStartFace(PLAIN)).toBeNull();
  });

  it('shows what the seat’s own copy has grown to', () => {
    const g = game();
    const sc = playerById(g.state, 0)!.statecraft;
    const id = 'theGatheringHost' as OrderId;
    sc.orders.push(id);
    sc.slots[0] = { card: id, sealedUntil: g.state.turn };
    bumpRevision(g.state);
    expect(scalerFace(g.state, 0, id)?.figure).toBe('+2🔬 +2🎭');
    recordScalingOccasion(g.state, 0, 'militaryGained');
    recordScalingOccasion(g.state, 0, 'militaryGained');
    expect(scalerFace(g.state, 0, id)?.figure).toBe('+4🔬 +4🎭');
    // Another seat has not grown it.
    expect(scalerFace(g.state, 1, id)?.figure).toBe('+2🔬 +2🎭');
  });

  it('is printed on the hand, the collection and the Compendium page, in tabular mono', () => {
    expect(braceBody(uiSource('main.ts'), 'function showStatecraftOffer()')).toContain(
      'scaler: scalerFace(game.state, seat, id)!',
    );
    expect(braceBody(uiSource('offerCard.ts'), 'function faceBody(')).toContain(
      'if (option.scaler !== undefined) nodes.push(scalerFigureNode(option.scaler));',
    );
    expect(uiSource('statecraftScreen.ts')).toContain('if (scaler !== null) button.append(scalerFigureNode(scaler));');
    const css = uiSource('style.css');
    const value = css.slice(css.indexOf('.scaler-value {'), css.indexOf('}', css.indexOf('.scaler-value {')));
    expect(value).toContain('font-variant-numeric: tabular-nums');
    // The Compendium prints the starting value as a row.
    const page = entryOf(compendiumId('order', 'theGatheringHost'));
    expect(page.rows.find((row) => row.label === SCALER_LABEL)?.figures).toBe('+2🔬 +2🎭');
    expect(entryOf(compendiumId('order', PLAIN)).rows.some((row) => row.label === SCALER_LABEL)).toBe(false);
  });
});

// --- 4. the tooltip ---------------------------------------------------------------------

describe('the keyword’s tooltip', () => {
  let dom: FakeDom;
  let restore: () => void = () => {};
  let layer: KeywordCards | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    ({ dom, restore } = installFakeDom());
    layer = mountKeywordCards({ definitions: () => Promise.resolve(READ) });
  });

  afterEach(() => {
    layer?.dispose();
    layer = null;
    restore();
    vi.useRealTimers();
  });

  /** Lets the definitions' promise land. */
  async function settle(): Promise<void> {
    for (let index = 0; index < 5; index += 1) await Promise.resolve();
  }

  const cards = (): FakeNode[] => dom.document.body.querySelectorAll('.kwc');
  const nameOf = (card: FakeNode): string => card.querySelector('.kwc-name')!.textContent;

  /** A card face as the offer hand and the collection draw it: a button with the card's clauses. */
  function cardButton(id: OrderId, top = 300): { button: FakeNode; keyword: FakeNode | null } {
    const button = dom.document.createElement('button');
    dom.document.body.append(button);
    const host = button as unknown as HTMLElement;
    const note = describeCard(id)
      .map((clause) => clause.text)
      .join(' · ');
    setDescriptorText(host, note, { linked: keywordsAllowedIn(host) });
    button.rect = { left: 100, top, width: 200, height: 300 };
    const keyword =
      button.querySelectorAll('.kw').find((word) => CARD_KEYWORD_ENTRIES.has(word.getAttribute('data-keyword') ?? '')) ??
      null;
    if (keyword !== null) keyword.rect = { left: 110, top: top + 10, width: 60, height: 16 };
    return { button, keyword };
  }

  it('opens on hover over the keyword, for each kind, inside the button the card is', async () => {
    for (const keyword of ORDER_KEYWORDS) {
      const face = cardButton(EXAMPLE[keyword]);
      expect(face.keyword, keyword).not.toBeNull();
      // Inside a control: no link and no tab stop, so a click still picks the card.
      expect(face.keyword!.getAttribute('data-ref'), keyword).toBeNull();
      dom.fire(face.keyword!, 'pointerover', { pointerType: 'mouse' });
      await settle();
      vi.advanceTimersByTime(KEYWORD_SHOW_MS);
      expect(cards().map(nameOf), keyword).toEqual([entryOf(`concept:${keyword}`).name]);
      dom.fire(dom.document.body, 'pointerover', { pointerType: 'mouse' });
      vi.advanceTimersByTime(KEYWORD_SHOW_MS * 4);
      expect(cards(), keyword).toEqual([]);
      face.button.remove();
    }
  });

  it('opens on keyboard focus of the card, with no Enter hint, and again every time', async () => {
    const face = cardButton(EXAMPLE.scaler);
    const other = cardButton(PLAIN, 700);
    for (let time = 0; time < 3; time += 1) {
      face.button.focus();
      await settle();
      const shown = cards();
      expect(shown.map(nameOf), `time ${time}`).toEqual(['Scaler']);
      // Enter presses the card, so the tooltip offers no Enter.
      expect(shown[0]!.querySelector('.kwc-hint'), `time ${time}`).toBeNull();
      // Focus on a plain card closes it, and shows nothing of its own.
      other.button.focus();
      await settle();
      vi.advanceTimersByTime(KEYWORD_SHOW_MS * 4);
      expect(cards(), `time ${time}`).toEqual([]);
    }
  });

  it('shows nothing for a plain card, on focus or anywhere on its face', async () => {
    const face = cardButton(PLAIN);
    expect(face.keyword).toBeNull();
    face.button.focus();
    await settle();
    vi.advanceTimersByTime(KEYWORD_SHOW_MS * 2);
    expect(cards()).toEqual([]);
  });

  it('opens on keyboard focus of a commission chip, from the keyword in the popover it names', async () => {
    const item = dom.document.createElement('li');
    dom.document.body.append(item);
    const button = dom.document.createElement('button');
    button.setAttribute('aria-describedby', 'commission-pop-0');
    const pop = dom.document.createElement('div');
    pop.id = 'commission-pop-0';
    item.append(button);
    item.append(pop);
    for (const clause of describeCard(EXAMPLE.commission)) {
      const line = dom.document.createElement('p');
      setDescriptorText(line as unknown as HTMLElement, clause.text, { linked: false });
      pop.append(line);
    }
    pop.querySelector('.kw')!.rect = { left: 300, top: 100, width: 80, height: 16 };
    button.focus();
    await settle();
    expect(cards().map(nameOf)).toEqual(['Commission']);
  });

  it('opens on keyboard focus of a linked keyword, as on a Compendium page', async () => {
    const page = dom.document.createElement('p');
    dom.document.body.append(page);
    setDescriptorText(page as unknown as HTMLElement, describeCard(EXAMPLE.boon)[0]!.text);
    const word = page.querySelector('.kw')!;
    word.rect = { left: 100, top: 100, width: 40, height: 16 };
    expect(word.getAttribute('data-ref')).toBe('concept:boon');
    word.focus();
    await settle();
    expect(cards().map(nameOf)).toEqual(['Boon']);
    expect(cards()[0]!.querySelector('.kwc-hint')!.textContent).toBe('Press Enter to keep it open');
  });
});
