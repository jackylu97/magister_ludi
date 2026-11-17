/**
 * **The orders screen as a card table** (batch SS10, part 2;
 * `src/ui/statecraftScreen.ts`, `src/ui/orderLive.ts`,
 * `src/ui/statecraftScreen.css`). The board of record is
 * `docs/plans/mockups/scholars-study/orders-screen-final-board.html`.
 *
 * This suite has no DOM, so it checks the pure readings and reads the rest as
 * source:
 *
 *   1. what a card says it pays: the tablet and the live line by kind;
 *   2. the face takes its tablet from the caller's live reading, and falls back
 *      to the sentence's first figure where there is none;
 *   3. the sheet's frame, its head and its keys;
 *   4. no page or stylesheet of the screen names a card row, a leader or a deck.
 */

import { describe, expect, it } from 'vitest';

import { LEADER_IDS, leaderDef } from '../../src/sim/leaderData';
import {
  DECK_IDS,
  DOCTRINE_IDS,
  ORDER_IDS,
  doctrineDef,
  orderDef,
  orderIsDealt,
} from '../../src/sim/statecraftData';
import { METER_GLYPH, YIELD_GLYPH } from '../../src/ui/figures';
import { firstFigure, orderFaceModel } from '../../src/ui/orderFace';
import { LIVE_WORDS, stagedLive, tabletOfFigure, tabletOfText } from '../../src/ui/orderLive';
import { ORDERS_WORDS } from '../../src/ui/statecraftScreen';
import { braceBody, between, uiSource } from './sourceHelpers';

const STYLES = import.meta.glob(['../../src/ui/statecraftScreen.css', '../../src/ui/orderFace.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function style(tail: string): string {
  const key = Object.keys(STYLES).find((path) => path.endsWith(tail));
  const text = key === undefined ? undefined : STYLES[key];
  if (typeof text !== 'string' || text.length === 0) throw new Error(`ordersScreen test: ${tail} came back empty`);
  return text;
}

const SCREEN = uiSource('statecraftScreen.ts');
const LIVE = uiSource('orderLive.ts');

describe('what a card says it pays', () => {
  it('lifts a stamp figure into the tablet with its yield, and a meter with none', () => {
    expect(tabletOfFigure({ glyph: YIELD_GLYPH.gold, amount: 15 })).toEqual({ figure: '+15', yield: 'gold' });
    expect(tabletOfFigure({ glyph: YIELD_GLYPH.science, amount: -3 })).toEqual({ figure: '−3', yield: 'science' });
    expect(tabletOfFigure({ glyph: METER_GLYPH.happiness, amount: 2 })).toEqual({ figure: '+2', yield: null });
  });

  it('lifts the first value of a Scaler’s composed figure', () => {
    expect(tabletOfText(`+3${YIELD_GLYPH.science} +3${YIELD_GLYPH.culture}`)).toEqual({ figure: '+3', yield: 'science' });
    expect(tabletOfText('nothing here')).toBeNull();
  });

  it('writes the board’s live lines', () => {
    expect(LIVE_WORDS.staged).toBe('awaits your seal: on Confirm');
    expect(LIVE_WORDS.rule).toBe('in force');
    expect(LIVE_WORDS.idle).toBe('+0 now');
    expect(LIVE_WORDS.pays(`+15${YIELD_GLYPH.gold}`)).toBe(`pays +15${YIELD_GLYPH.gold} this turn`);
    expect(LIVE_WORDS.value(`+4${YIELD_GLYPH.production}`)).toBe(`its value now +4${YIELD_GLYPH.production}`);
    expect(LIVE_WORDS.counter(3, 4, 'towns reached')).toBe('3 of 4 towns reached');
  });

  it('gives a card played this visit no figure at all', () => {
    const staged = stagedLive();
    expect(staged.tablet).toBeNull();
    expect(staged.unmet).toBeNull();
    expect(staged.line).toEqual({ kind: 'waiting', text: LIVE_WORDS.staged });
  });

  it('picks the reading by kind: a commission, a Scaler, then the stamp', () => {
    const seated = braceBody(LIVE, 'export function seatedOrderLive(');
    const commission = seated.indexOf('orderDef(id).commission !== undefined');
    const scaler = seated.indexOf('scalerFace(state, seat, id)');
    const stamp = seated.indexOf('liveOfStamp(state, seat, id, stampReading(explainCardImpact(');
    expect(commission).toBeGreaterThan(-1);
    expect(scaler).toBeGreaterThan(commission);
    expect(stamp).toBeGreaterThan(scaler);
    // A card that pays on an occasion says what it has paid so far, from the
    // lifetime tally.
    expect(LIVE).toContain('statecraft.yieldTallies?.find((entry) => entry.card === card)');
  });
});

describe('the face takes its tablet from the live reading', () => {
  const id = ORDER_IDS.find((one) => orderIsDealt(one) && firstFigure(orderDef(one).text ?? '') !== null)!;

  it('draws the caller’s figure, none when the caller says none, and the sentence’s otherwise', () => {
    expect(orderFaceModel(id, { where: 'played', tablet: { figure: '+15', yield: 'gold' } }).tablet).toEqual({
      figure: '+15',
      yield: 'gold',
    });
    expect(orderFaceModel(id, { where: 'played', tablet: null }).tablet).toBeNull();
    expect(orderFaceModel(id, { where: 'hand' }).tablet).not.toBeNull();
  });

  it('opens a card whose effect starts with a figure with no initial and no ornament', () => {
    // The user, 2026-11-17: "no red initial is fine".
    expect(uiSource('orderFace.ts')).not.toContain('of-opening');
  });
});

describe('the sheet', () => {
  it('is built on the shared frame, with its own keys', () => {
    expect(SCREEN).toContain('createModalShell({');
    expect(SCREEN).toContain('onKey,');
    const keys = braceBody(SCREEN, 'function onKey(event: KeyboardEvent)');
    expect(keys).toContain("event.key === 'Escape' && held !== null");
    expect(keys).toContain("event.key.startsWith('Arrow')");
    expect(keys).toContain('/^[1-9]$/.test(event.key)');
  });

  it('signs the arrangement at every door, and throws it away when the game goes', () => {
    const shell = between(SCREEN, 'const shell = createModalShell({', 'return {');
    expect(shell).toContain('onClose: () => {');
    expect(shell.slice(shell.indexOf('onClose'))).toContain('commitStaging();');
    expect(shell.slice(shell.indexOf('onDispose'))).not.toContain('commitStaging();');
  });

  it('heads the sheet with the Ledger’s deck figure, and never a sum of the cards’ lines', () => {
    const head = between(SCREEN, 'function paintHead(', '// --- the register');
    expect(head).toContain('const reading = foldDeck(state, seat);');
    expect(head).not.toContain('seatedOrderLive');
    expect(head).not.toContain('doctrineLive');
  });

  it('prints a refusal in place of the hint for four seconds', () => {
    expect(SCREEN).toContain('const REFUSAL_MS = 4000;');
    expect(braceBody(SCREEN, 'function refuse(message: string)')).toContain('refusal = message;');
  });

  it('prints every live word through the yield printer with its marks taken off', () => {
    expect(SCREEN).toContain('setYieldText(words, stripRefs(live.short));');
  });

  it('keeps its styles in its own file, and sets no rule on the shared sheet', () => {
    expect(SCREEN).toContain("import './statecraftScreen.css';");
    const css = style('statecraftScreen.css');
    expect(css).not.toMatch(/(^|[\s,}])\.statecraft-sheet\s*[,{]/);
    expect(css).not.toMatch(/#[a-z]+-overlay \.statecraft-sheet \{/);
    expect(css).toContain('#statecraft-overlay .orders-sheet {');
  });

  it('honours less motion: no count, no shake, no slide', () => {
    expect(braceBody(SCREEN, 'function countUp(')).toContain('if (!wantsMotion() || nodes.length === 0) return () => {};');
    expect(style('statecraftScreen.css')).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps the screen words in one table, in plain words', () => {
    expect(ORDERS_WORDS.hint).toBe('play a card from your hand to a chair');
    expect(ORDERS_WORDS.staged).toBe('played, not confirmed');
    for (const value of Object.values(ORDERS_WORDS)) {
      const text = typeof value === 'function' ? (value as (...args: never[]) => string).toString() : value;
      expect(text).not.toMatch(/\[\[|—/);
    }
  });
});

describe('no row is named', () => {
  const names = (source: string, word: string): boolean =>
    new RegExp(`(?<![\\w'])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w'])`).test(source);

  it('writes no card id, card name, leader or deck in the screen, its readings or its stylesheet', () => {
    const cards = [...ORDER_IDS, ...DOCTRINE_IDS];
    const cardNames = cards
      .map((id) => (DOCTRINE_IDS.includes(id as never) ? doctrineDef(id as never) : orderDef(id as never)).name)
      .filter((name) => name.includes(' '));
    for (const [tail, source] of [
      ['statecraftScreen.ts', SCREEN],
      ['orderLive.ts', LIVE],
      ['statecraftScreen.css', style('statecraftScreen.css')],
    ] as const) {
      for (const id of cards) expect(names(source, id), `${tail} names ${id}`).toBe(false);
      for (const name of cardNames) expect(names(source, name), `${tail} names ${name}`).toBe(false);
      for (const id of DECK_IDS) expect(names(source, id), `${tail} names the deck ${id}`).toBe(false);
      for (const id of LEADER_IDS) {
        expect(names(source, id), `${tail} names ${id}`).toBe(false);
        expect(names(source, leaderDef(id).name), `${tail} names a figure`).toBe(false);
      }
    }
  });
});
