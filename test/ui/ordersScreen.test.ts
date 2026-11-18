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
 *   4. no page or stylesheet of the screen names a card row, a leader or a deck;
 *   5. the Council screen (stage 1 of the Council and In play board,
 *      `docs/plans/mockups/scholars-study/council-and-in-play/`): the layout
 *      for a window, the fan, the pay plate, the totals line and its chips,
 *      and a card held out of its chair.
 */

import { describe, expect, it } from 'vitest';

import { LEADER_IDS, leaderDef } from '../../src/sim/leaderData';
import {
  DECK_IDS,
  DOCTRINE_IDS,
  GOVERNMENT_IDS,
  ORDER_IDS,
  doctrineDef,
  orderDef,
  orderIsDealt,
} from '../../src/sim/statecraftData';
import { COUNCIL_FORMS, COUNCIL_FRAME, councilLayout, fanPlacement } from '../../src/ui/councilLayout';
import { COUNCIL_VOICES, councilFigures } from '../../src/ui/councilTotals';
import { METER_GLYPH, YIELD_GLYPH } from '../../src/ui/figures';
import { stampOfVoices } from '../../src/ui/ledgerScreen';
import { firstFigure, orderFaceModel } from '../../src/ui/orderFace';
import { LIVE_WORDS, plateFigures, stagedLive, tabletOfFigure, tabletOfText } from '../../src/ui/orderLive';
import { ORDERS_WORDS } from '../../src/ui/statecraftScreen';
import { type BinderEntry, LAYER_WORDS, allOrders, binderAdmits } from '../../src/ui/ordersLayers';
import { ORDERS_MOTION } from '../../src/ui/ordersMotion';
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
const LAYERS = uiSource('ordersLayers.ts');
const MOTION = uiSource('ordersMotion.ts');

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
    const stamp = seated.indexOf('return liveOfStamp(state, seat, id, orderStamp(state, seat, id, sheet));');
    expect(commission).toBeGreaterThan(-1);
    expect(scaler).toBeGreaterThan(commission);
    expect(stamp).toBeGreaterThan(scaler);
    expect(braceBody(LIVE, 'function orderStamp(')).toContain("stampReading(explainCardImpact(state, seat, { kind: 'order', id }, sheet))");
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

  it('prints the totals as figures with their marks, and a plate’s reason with its marks taken off', () => {
    // The Council screen (stage 1) prints no live words of its own: the totals
    // are figures, and a card's plate is the face's (`orderFace.ts`).
    expect(SCREEN).toContain("const figure = plateFigureNode({ voice, amount: 0 }, 'council-total-fig');");
    expect(uiSource('orderFace.ts')).toContain("node.append(element('span', 'of-pay-why', stripRefs(plate.reason)));");
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
      ['ordersLayers.ts', LAYERS],
      ['ordersMotion.ts', MOTION],
      ['councilTotals.ts', uiSource('councilTotals.ts')],
      ['councilLayout.ts', uiSource('councilLayout.ts')],
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

describe('the hand and the deck (part B)', () => {
  const live = ORDER_IDS.filter((id) => orderIsDealt(id));
  const entry = (id: (typeof live)[number], chair: number | null): BinderEntry => ({
    id,
    chair,
    staged: false,
    live: null,
    opened: null,
  });

  it('filters the binder by type, deck, rarity, the seated ones and a name', () => {
    const military = live.find((id) => orderDef(id).type === 'military')!;
    const economic = live.find((id) => orderDef(id).type === 'economic' && orderDef(id).decks.length > 0)!;
    const filter = allOrders();
    expect(binderAdmits(entry(military, null), filter)).toBe(true);
    filter.type = 'military';
    expect(binderAdmits(entry(military, null), filter)).toBe(true);
    expect(binderAdmits(entry(economic, null), filter)).toBe(false);
    const other = allOrders();
    other.deck = orderDef(economic).decks[0]!;
    expect(binderAdmits(entry(economic, null), other)).toBe(true);
    other.deck = 'generic';
    expect(binderAdmits(entry(economic, null), other)).toBe(false);
    const rarity = allOrders();
    rarity.rarity = orderDef(economic).rarity;
    expect(binderAdmits(entry(economic, null), rarity)).toBe(true);
    const seated = allOrders();
    seated.seated = true;
    expect(binderAdmits(entry(economic, 3), seated)).toBe(true);
    expect(binderAdmits(entry(economic, null), seated)).toBe(false);
    const find = allOrders();
    find.find = orderDef(economic).name.slice(0, 6).toUpperCase();
    expect(binderAdmits(entry(economic, null), find)).toBe(true);
    find.find = 'no card is called this';
    expect(binderAdmits(entry(economic, null), find)).toBe(false);
  });

  it('keeps the board’s timings for the six moments', () => {
    expect(ORDERS_MOTION.liftMs).toBe(120);
    expect(ORDERS_MOTION.liftRise).toBe(16);
    expect(ORDERS_MOTION.previewDelayMs).toBe(300);
    expect(ORDERS_MOTION.tiltDeg).toBe(5);
    expect(ORDERS_MOTION.landingMs).toBe(180);
    expect(ORDERS_MOTION.landingWidenMs).toBe(80);
    expect(ORDERS_MOTION.crossFadeMs).toBe(120);
    expect(ORDERS_MOTION.settleMs).toBe(120);
    expect(ORDERS_MOTION.swapMs).toBe(180);
    const css = style('statecraftScreen.css');
    expect(css).toContain('transition: translate 120ms ease-out;');
    expect(css).toContain('translate: 0 -16px;');
    expect(css).toContain('animation: orders-preview-in 120ms ease-out both;');
  });

  it('gives every moment its less-motion form', () => {
    // The landing becomes a cross-fade in place; the settle and the slide do
    // nothing; the card that follows the pointer is not tilted.
    expect(braceBody(MOTION, 'export function animateLanding(')).toContain('if (!wantsMotion()) {');
    expect(braceBody(MOTION, 'export function settleConfirmed(')).toContain('if (!wantsMotion()) return;');
    expect(braceBody(MOTION, 'export function flyToHand(')).toContain('if (!wantsMotion()) return;');
    expect(braceBody(MOTION, 'export function placeGhost(')).toContain(
      "wantsMotion() ? `rotate(${ORDERS_MOTION.tiltDeg}deg)` : 'none'",
    );
    const css = style('statecraftScreen.css');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.orders-preview {\n    animation: none;');
    expect(reduced).toContain('translate: none;');
    expect(reduced).toContain('.order-face.is-shaking {\n    animation: none;');
  });

  it('opens the whole hand with H and the binder with D, and Esc closes a layer first', () => {
    const keys = braceBody(SCREEN, 'function onKey(event: KeyboardEvent)');
    const layerFirst = keys.indexOf("event.key === 'Escape' && layer !== null");
    const typing = keys.indexOf('target instanceof HTMLInputElement');
    expect(layerFirst).toBeGreaterThan(-1);
    // Esc closes the binder even from its search box, so it is asked first.
    expect(typing).toBeGreaterThan(layerFirst);
    expect(keys).toContain("toggleLayer(event.key.toLowerCase() === 'h' ? 'hand' : 'binder');");
    // The number keys seat a card only while no layer is open.
    expect(keys).toContain('/^[1-9]$/.test(event.key) && layer === null');
  });

  it('picks a card up from either layer and closes it, so the chairs can be seen', () => {
    expect(SCREEN).toContain('handViewNode(hand, held, (id, event) => {\n          layer = null;\n          take(id, event);');
    const binder = braceBody(SCREEN, 'function drawBinder(');
    expect(binder).toContain('layer = null;');
    expect(binder).toContain('if (entry.chair === null) take(entry.id, event);');
    expect(binder).toContain('else drop(entry.chair - 1, event);');
  });

  it('lifts a hand card at once, and a cut or compact card after the pause', () => {
    const enter = braceBody(SCREEN, 'function onPreviewEnter(event: Event)');
    expect(enter).toContain("if (kind === 'hand') {");
    expect(enter).toContain('ORDERS_MOTION.previewDelayMs');
    expect(enter).toContain("if (!compact && !face.hasAttribute('data-overflow')) return;");
  });

  it('labels the hand with its counts and the two keys, in plain words', () => {
    expect(ORDERS_WORDS.handOpens).toBe('opens it');
    expect(ORDERS_WORDS.handCards(9)).toBe('9 cards');
    // The deck's count and the binder's key are on the draft pile (stage 1).
    expect(ORDERS_WORDS.deckCount(40)).toBe('40 in your deck');
    expect(braceBody(SCREEN, 'function drawPile(')).toContain("deck.append(keyMark('D'));");
    expect(LAYER_WORDS.handNote(30)).toBe('30 Orders, sorted by type · click one to pick it up ·');
    expect(LAYER_WORDS.binderNote(40)).toBe('40 Orders, every one a full face · scroll for the rest ·');
    expect(LAYER_WORDS.inChair(3)).toBe('in chair 3');
  });

  it('names no function after a platform dialog', () => {
    for (const source of [SCREEN, LAYERS, MOTION]) {
      expect(source).not.toMatch(/function (confirm|alert|prompt)\(/);
    }
  });
});

describe('the screen fills the window, and the Council layout fits it (stage 1)', () => {
  it('fills the window on the shared frame, with no pale sheet round the cloth', () => {
    const css = style('statecraftScreen.css');
    expect(css).toContain('#statecraft-overlay {\n  place-items: stretch;\n  padding: 0;\n  background: var(--lampblack);');
    const sheet = css.slice(css.indexOf('#statecraft-overlay .orders-sheet {'), css.indexOf('}', css.indexOf('#statecraft-overlay .orders-sheet {')));
    expect(sheet).toContain('height: 100%;');
    expect(sheet).toContain('border: 0;');
    expect(sheet).toContain('var(--lampblack)');
    // Still the shared frame: one `close`, `hidden` as the whole state.
    expect(SCREEN).toContain('createModalShell({');
  });

  it('gives the board’s windows the board’s card forms (frames C6, C8 and C11)', () => {
    const six = councilLayout({ width: 1440, height: 900 }, 6);
    expect([six.form, six.rows, six.cols]).toEqual(['full', 2, 3]);
    const eight = councilLayout({ width: 1440, height: 900 }, 8);
    expect([eight.form, eight.rows, eight.cols]).toEqual(['full', 2, 4]);
    const eleven = councilLayout({ width: 1440, height: 900 }, 11);
    expect([eleven.form, eleven.rows, eleven.cols]).toEqual(['mid', 2, 6]);
    expect(COUNCIL_FORMS.full).toEqual({ width: 210, height: 258, inset: 6 });
    expect(COUNCIL_FORMS.mid).toEqual({ width: 176, height: 236, inset: 6 });
    // A smaller window: the compact forms, and the narrow government card.
    expect(councilLayout({ width: 1180, height: 900 }, 11)).toMatchObject({ form: 'compact', rows: 3, cramped: false });
    expect(councilLayout({ width: 1180, height: 700 }, 11)).toMatchObject({ form: 'narrow', rows: 2, cramped: false });
    expect(councilLayout({ width: 1440, height: 700 }, 6)).toMatchObject({ form: 'mid', rows: 1, cramped: false });
    expect(councilLayout({ width: 1180, height: 700 }, 11).government).toBe(COUNCIL_FRAME.government.narrow);
  });

  it('never runs the chairs off the window, and keeps the hand in view, from 1180 by 700 up', () => {
    for (const width of [1180, 1240, 1280, 1366, 1440, 1600, 1920, 2560]) {
      for (const height of [700, 720, 768, 800, 900, 1080, 1440]) {
        for (const chairs of [1, 3, 5, 6, 7, 8, 9, 11, 12]) {
          const layout = councilLayout({ width, height }, chairs);
          const where = `${width}x${height}, ${chairs} chairs`;
          expect(layout.cramped, where).toBe(false);
          const room = width - 2 * COUNCIL_FRAME.side - layout.government - COUNCIL_FRAME.columnGap;
          expect(layout.chairs.width, where).toBeLessThanOrEqual(room);
          expect(layout.fanView, where).toBeGreaterThanOrEqual(COUNCIL_FRAME.fanMin);
          expect(layout.rows * layout.cols, where).toBeGreaterThanOrEqual(chairs);
        }
      }
    }
  });

  it('says when a window is too small for every form, and keeps the narrow form then', () => {
    const small = councilLayout({ width: 1024, height: 700 }, 11);
    expect(small.cramped).toBe(true);
    expect(small.form).toBe('narrow');
  });

  it('keeps every text at 11 px or more in the screen’s and the face’s rules', () => {
    // No size under 11 px anywhere. The compact card takes the full face's
    // scale from its width variable, not from a font size.
    for (const tail of ['statecraftScreen.css', 'orderFace.css']) {
      const small = [...style(tail).matchAll(/font-size:\s*([\d.]+)px/g)].filter((match) => Number(match[1]) < 11);
      expect(small.map((match) => match[0]), tail).toEqual([]);
    }
    const face = style('orderFace.css');
    expect(face).toContain('font-size: max(11px, calc(var(--of-h) * 12.5));');
    expect(face).toContain('font-size: max(11px, calc(var(--of-h) * 11));');
  });

  it('draws the smaller forms as the same emblem, with the full face’s text sizes', () => {
    const face = style('orderFace.css');
    expect(face).toContain(".order-face[data-compact],\n.order-face-chair[data-compact] {\n  --of-width: 210px;\n  width: 187px;\n  height: 180px;");
    expect(face).toContain(".order-face[data-compact='narrow'],\n.order-face-chair[data-compact='narrow'] {\n  width: 145px;\n  height: 206px;");
    expect(face).toContain(".order-face[data-compact='mid'],\n.order-face-chair[data-compact='mid'] {\n  width: 176px;\n  height: 236px;");
    expect(SCREEN).toContain("const compact = screenLayout.form === 'full' ? null : screenLayout.form;");
    expect(SCREEN).toContain('if (compact !== null) face.dataset.compact = compact;');
  });

  it('tucks every Doctrine under the government, each strip a little narrower (frame C6)', () => {
    const register = braceBody(SCREEN, 'function drawRegister(');
    expect(register).toContain('sc.doctrines.forEach((id, index) => {');
    expect(register).toContain('const strip = tuckedDoctrineNode(id, live?.plate ?? null);');
    expect(register).toContain('const pays = governmentPays(state, seat);');
    expect(style('statecraftScreen.css')).toContain('width: calc(var(--council-gov-w, 200px) - 2px - var(--tuck, 1) * 6px);');
  });

  it('draws the screen again when the window changes size, and lets go of the listener', () => {
    expect(SCREEN).toContain("window.addEventListener('resize', onWindowResize);");
    expect(SCREEN).toContain("window.removeEventListener('resize', onWindowResize);");
  });
});

describe('the fan (frame C6)', () => {
  it('turns and drops the cards on the board’s arc', () => {
    const nine = fanPlacement(9, 1240);
    expect(nine.cards.map((card) => card.rotate)).toEqual([-6.4, -4.8, -3.2, -1.6, 0, 1.6, 3.2, 4.8, 6.4]);
    expect(nine.cards.map((card) => card.drop)).toEqual([26, 14, 6, 2, 0, 2, 6, 14, 26]);
    const six = fanPlacement(6, 1240);
    expect(six.cards.map((card) => card.rotate)).toEqual([-4, -2.4, -0.8, 0.8, 2.4, 4]);
    expect(six.cards.map((card) => card.drop)).toEqual([10, 4, 0, 0, 4, 10]);
  });

  it('overlaps the cards evenly when they do not fit side by side, and keeps them in the room', () => {
    const many = fanPlacement(14, 1240);
    expect(many.step).toBeLessThan(COUNCIL_FRAME.fanCard.width);
    expect(many.cards[13]!.left + COUNCIL_FRAME.fanCard.width).toBeLessThanOrEqual(1240);
    expect(Math.max(...many.cards.map((card) => Math.abs(card.rotate)))).toBeLessThanOrEqual(6.4);
    expect(Math.max(...many.cards.map((card) => card.drop))).toBeLessThanOrEqual(26);
  });

  it('sets each card of the hand as the full face, with no figure', () => {
    const hand = braceBody(SCREEN, 'function drawHand(');
    expect(hand).toContain("dressOrderFace(face, id, { where: 'hand', inControl: true, plate: null });");
    expect(hand).toContain("face.dataset.form = 'fan';");
  });
});

describe('the pay plate (frames PL and PM)', () => {
  it('reads a stamp’s figures back to their yields and meters, signs kept', () => {
    expect(
      plateFigures([
        { glyph: YIELD_GLYPH.food, amount: 25 },
        { glyph: METER_GLYPH.happiness, amount: -3 },
        { glyph: METER_GLYPH.authority, amount: 2 },
      ]),
    ).toEqual([
      { voice: 'food', amount: 25 },
      { voice: 'happiness', amount: -3 },
      { voice: 'authority', amount: 2 },
    ]);
  });

  it('picks the plate by the reading: figures, "+0" and the reason, or none', () => {
    const plate = braceBody(LIVE, 'function plateOfStamp(');
    expect(plate).toContain("if (reading.figures.length > 0) return { kind: 'pays', figures: plateFigures(reading.figures) };");
    // A card that pays on an occasion has no plate, and so has a rule.
    expect(plate).toContain('if (!stampIsEmpty(reading)) return null;');
    expect(plate).toContain('if (!cardCanPay(card)) return null;');
    expect(plate).toContain('idleReasonWords(cardIdleReason(state, seat, card))');
    // A card played this visit shows no figure until Confirm.
    expect(stagedLive().plate).toBeNull();
  });

  it('draws the plate at the card’s foot in place of the tablet and the live line', () => {
    const id = ORDER_IDS.find((one) => orderIsDealt(one) && firstFigure(orderDef(one).text ?? '') !== null)!;
    const pays = { kind: 'pays' as const, figures: [{ voice: 'gold' as const, amount: 15 }] };
    expect(orderFaceModel(id, { where: 'played', plate: pays }).tablet).toBeNull();
    expect(orderFaceModel(id, { where: 'played', plate: null }).tablet).toBeNull();
    const face = uiSource('orderFace.ts');
    expect(face).toContain('if (state.plate === undefined) inner.append(colophonNode(model, state));');
    const css = style('orderFace.css');
    expect(css).toContain('.order-face .of-pay {');
    expect(css).toContain(".of-pay-fig[data-sign='minus'] {\n  color: var(--rubric, #ab3d1e);");
  });

  it('draws the government as a full card in the Doctrine’s frame, with the crown', () => {
    const model = orderFaceModel(GOVERNMENT_IDS[0]!, { where: 'played', plate: null });
    expect(model.kind).toBe('government');
    expect(model.frame).toBe('doctrine');
    expect(model.ink).toBe('gilt');
    expect(model.plate).toBe('Government');
    expect(model.suits).toEqual(['crowns']);
  });
});

describe('the totals line (frame N4), and the change a held card would make (frame CH)', () => {
  it('reads the six yields from foldDeck and the meters from their own lists, never from the plates', () => {
    const head = between(SCREEN, 'function paintHead(', '// --- the register');
    expect(head).toContain('const reading = foldDeck(state, seat);');
    expect(head).toContain('councilFigures(reading, foldDeckMeters(state, seat))');
    expect(head).not.toContain('seatedOrderLive');
    expect(head).not.toContain('doctrineLive');
    const totals = uiSource('councilTotals.ts');
    expect(totals).toContain('for (const share of meterCardShares(entry))');
    expect(totals).toContain("classifyCard(card) === 'deck'");
  });

  it('puts the eight figures in the board’s order: the six yields, then happiness and authority', () => {
    expect(COUNCIL_VOICES).toEqual(['food', 'production', 'gold', 'science', 'culture', 'faith', 'happiness', 'authority']);
    const deck = stampOfVoices({ food: 12, production: 0, gold: -3, science: 0, culture: 8, faith: 0 });
    expect(councilFigures(deck, { happiness: 2, authority: 0 })).toEqual({
      food: 12,
      production: 0,
      gold: -3,
      science: 0,
      culture: 8,
      faith: 0,
      happiness: 2,
      authority: 0,
    });
  });

  it('measures the change once when the chair under the card changes, never on a pointer move', () => {
    const over = braceBody(SCREEN, 'function noteOver(');
    expect(over).toContain('if ((over?.index ?? null) === index) return;');
    // A card held out of a chair is measured against the chairs before the lift.
    expect(over).toContain('const base = beforeLift ?? ctx.arrangement;');
    expect(over).toContain('councilChange(ctx.state, ctx.seat, base, target)');
    expect(braceBody(SCREEN, 'function onPointerMove(')).not.toContain('councilChange');
    expect(SCREEN.match(/councilChange\(/g) ?? []).toHaveLength(1);
    expect(uiSource('councilTotals.ts')).toContain('const was = figuresOfBoard(stagedState(state, seat, before), seat);');
  });
});

describe('a card held out of its chair (the user, 2026-11-18)', () => {
  it('holds a seated card on a click, and a sealed card refuses with the reducer’s sentence', () => {
    const lift = braceBody(SCREEN, 'function lift(index: number,');
    expect(lift).toContain('const problem = removeError(ctx.state, ctx.seat, ctx.arrangement, index);');
    expect(lift).toContain('held = entry.card;');
  });

  it('takes the card off its chair when it is put down away from every chair', () => {
    const off = braceBody(SCREEN, 'function takeOff(');
    // The removal stands: the arrangement before the lift is not put back.
    expect(off).not.toContain('staged = beforeLift');
    expect(off).toContain('beforeLift = null;');
    const click = braceBody(SCREEN, 'function onClothClick(');
    expect(click).toContain("target.closest('button, [data-chair], .orders-veil, input, a, [data-nav]') !== null");
    expect(click).toContain('if (beforeLift !== null) takeOff();');
    expect(SCREEN).toContain("body.addEventListener('click', onClothClick);");
    // A click on the hand is away from every chair too.
    expect(braceBody(SCREEN, 'function take(id: OrderId,')).toContain('if (beforeLift !== null) takeOff();');
  });

  it('puts a held card back with Escape, and takes a card off its chair with Delete or Backspace', () => {
    const keys = braceBody(SCREEN, 'function onKey(event: KeyboardEvent)');
    expect(keys).toContain("(event.key === 'Delete' || event.key === 'Backspace') && layer === null");
    expect(keys.indexOf("event.key === 'Escape' && held !== null")).toBeLessThan(keys.indexOf("event.key === 'Delete'"));
    const byKey = braceBody(SCREEN, 'function takeOffByKey(');
    expect(byKey).toContain('const problem = removeError(ctx.state, ctx.seat, ctx.arrangement, index);');
    expect(byKey).toContain('staged = remove(ctx.arrangement, index);');
  });
});
