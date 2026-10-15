/**
 * The price column's cell (`src/ui/priceCell.ts`, batches UX5 and UX5b): its
 * three looks, the bridge from the purchase gate to them, and the heading over
 * the column.
 *
 * The looks are asked of the real gate (`purchaseError`, `explainPurchaseCost`,
 * `purchaseShortfall`) in real towns. "Short of the bank, and only that" is the
 * simulation's own reading since UX5b, so this module never reads the refusal's
 * words to find it; a source check below keeps it that way.
 *
 * No document in this suite (`controls.test.ts`), so the element builders are
 * read as source for the one claim that matters about them: only the `buy` look
 * is a control.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import {
  type PurchasableItem,
  explainPurchaseCost,
  purchaseError,
  purchaseShortfall,
} from '../../src/sim/purchase';
import { type City, type GameState, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import { TECH_IDS } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';
import { YIELD_GLYPH } from '../../src/ui/figures';
import {
  priceFigureText,
  priceHeadText,
  priceLook,
  priceNeedText,
  purchaseLook,
} from '../../src/ui/priceCell';
import { braceBody, uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

/** A fresh capital for seat 0, with nothing standing on its hex. */
function capital(): { state: GameState; city: City } {
  const { state } = createGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const settler = state.units.find((u) => u.ownerId === 0 && unitDef(u.type).foundsCity)!;
  const city = foundCityAt(state, 0, getTileAt(state.map, settler.col, settler.row)!);
  state.units = state.units.filter((u) => !(u.col === city.col && u.row === city.row));
  bumpRevision(state);
  return { state, city };
}

const WORKER: PurchasableItem = { kind: 'unit', id: 'worker' };
const WARRIOR: PurchasableItem = { kind: 'unit', id: 'warrior' };

describe('the three looks', () => {
  it('is a pressable price when the gate takes the purchase', () => {
    expect(priceLook({ bank: 'gold', price: 40, refusal: null, shortfall: null }))
      .toEqual({ look: 'buy', bank: 'gold', price: 40 });
  });

  it('is short, with what is missing, when the bank is the only problem', () => {
    expect(
      priceLook({ bank: 'gold', price: 468, refusal: 'x', shortfall: 31 }),
    ).toEqual({ look: 'short', bank: 'gold', price: 468, need: 31 });
    // A bank holds fractions; a player acts on whole coins, so what is missing
    // rounds up and is never nothing.
    expect(
      priceLook({ bank: 'faith', price: 112, refusal: 'x', shortfall: 0.5 }),
    ).toMatchObject({ look: 'short', need: 1 });
    expect(
      priceLook({ bank: 'gold', price: 112, refusal: 'x', shortfall: 30.25 }),
    ).toMatchObject({ look: 'short', need: 31 });
  });

  it('is a dash carrying the gate’s own sentence for every other refusal', () => {
    expect(
      priceLook({ bank: 'gold', price: 60, refusal: 'A Scout already stands here', shortfall: null }),
    ).toEqual({ look: 'none', bank: 'gold', price: 60, refusal: 'A Scout already stands here' });
  });
});

describe('the purchase gate, read into a look', () => {
  it('can buy: the gate is silent, and the figure is the price the bank is charged', () => {
    const { state, city } = capital();
    playerById(state, 0)!.gold = 500;
    bumpRevision(state);
    const look = purchaseLook(state, 0, city.id, WORKER, 'gold');
    expect(purchaseError(state, 0, city.id, WORKER, 'gold')).toBeNull();
    expect(look).toEqual({
      look: 'buy',
      bank: 'gold',
      price: explainPurchaseCost(state, 0, city.id, WORKER, 'gold')!.total,
    });
  });

  it('short of gold: the gate’s last clause, and how much more is needed', () => {
    const { state, city } = capital();
    playerById(state, 0)!.gold = 10;
    bumpRevision(state);
    const price = explainPurchaseCost(state, 0, city.id, WORKER, 'gold')!.total;
    // The gate refuses, and the simulation says the bank is all that is wrong.
    expect(purchaseError(state, 0, city.id, WORKER, 'gold')).not.toBeNull();
    expect(purchaseShortfall(state, 0, city.id, WORKER, 'gold')).toBe(price - 10);
    expect(purchaseLook(state, 0, city.id, WORKER, 'gold')).toEqual({
      look: 'short',
      bank: 'gold',
      price,
      need: price - 10,
    });
  });

  it('short of faith, the same way in the other bank', () => {
    const { state, city } = capital();
    const player = playerById(state, 0)!;
    player.techsResearched = [...TECH_IDS];
    player.faithPool = 30;
    bumpRevision(state);
    const prophet: PurchasableItem = { kind: 'unit', id: 'prophet' };
    const price = explainPurchaseCost(state, 0, city.id, prophet, 'faith')!.total;
    expect(price).toBeGreaterThan(30);
    expect(purchaseError(state, 0, city.id, prophet, 'faith')).not.toBeNull();
    expect(purchaseShortfall(state, 0, city.id, prophet, 'faith')).toBe(price - 30);
    expect(purchaseLook(state, 0, city.id, prophet, 'faith')).toMatchObject({
      look: 'short',
      bank: 'faith',
      need: price - 30,
    });
  });

  it('rounds what is missing up to a whole coin when the bank holds a fraction', () => {
    const { state, city } = capital();
    const price = explainPurchaseCost(state, 0, city.id, WORKER, 'gold')!.total;
    playerById(state, 0)!.gold = price - 30.5;
    bumpRevision(state);
    expect(purchaseShortfall(state, 0, city.id, WORKER, 'gold')).toBe(30.5);
    expect(purchaseLook(state, 0, city.id, WORKER, 'gold')).toMatchObject({
      look: 'short',
      need: 31,
    });
  });

  it('cannot be bought here: a dash, with the gate’s sentence for the line that explains it', () => {
    const { state, city } = capital();
    playerById(state, 0)!.gold = 500;
    createUnit(state, 0, 'scout', city.col, city.row);
    bumpRevision(state);
    const refusal = purchaseError(state, 0, city.id, WARRIOR, 'gold');
    expect(refusal).toBe(`A Scout already stands in ${city.name} — move it first`);
    expect(purchaseLook(state, 0, city.id, WARRIOR, 'gold')).toMatchObject({
      look: 'none',
      refusal,
    });
  });

  it('is a dash, not a short price, when the bank is not the only problem', () => {
    // The scout in the slot is the gate's earlier clause, so it is what the
    // player is told: more gold would not buy the warrior.
    const { state, city } = capital();
    playerById(state, 0)!.gold = 1;
    createUnit(state, 0, 'scout', city.col, city.row);
    bumpRevision(state);
    expect(purchaseShortfall(state, 0, city.id, WARRIOR, 'gold')).toBeNull();
    expect(purchaseLook(state, 0, city.id, WARRIOR, 'gold')).toMatchObject({
      look: 'none',
      refusal: `A Scout already stands in ${city.name} — move it first`,
    });
  });

  it('decides the short look by the simulation’s reading, never by the refusal’s words', () => {
    // UX5b: the gate reports the bank's shortfall as a number, so the cell has
    // no reason to rebuild `purchaseError`'s sentence and compare it.
    const source = uiSource('priceCell.ts');
    const look = braceBody(source, 'export function purchaseLook(');
    expect(look).toContain('purchaseShortfall(state, playerId, cityId, item, bank)');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    // A refusal may be tested for being absent, and never compared with words.
    expect(code).not.toMatch(/refusal\s*===(?!\s*null\b)/);
    expect(code).not.toContain('purchasableName');
  });

  it('draws no cell at all for a bank that does not sell the thing', () => {
    const { state, city } = capital();
    expect(purchaseLook(state, 0, city.id, { kind: 'unit', id: 'prophet' }, 'gold')).toBeNull();
    // No Reliquary in this town: the faith bank sells it no soldiers.
    expect(purchaseLook(state, 0, city.id, WARRIOR, 'faith')).toBeNull();
  });

  it('quotes the full price, however much of the thing is already built', () => {
    // The user's ruling (2026-10-12): a purchase never gets cheaper as the
    // town builds, so a queued row's price is a fresh row's price.
    const { state, city } = capital();
    const player = playerById(state, 0)!;
    player.gold = 2000;
    player.techsResearched = [...TECH_IDS];
    const granary: PurchasableItem = { kind: 'building', id: 'granary' };
    bumpRevision(state);
    const fresh = purchaseLook(state, 0, city.id, granary, 'gold');
    expect(fresh).toMatchObject({ look: 'buy' });
    city.queue = [{ kind: 'building', id: 'granary' }];
    city.hammerBasket = 30;
    bumpRevision(state);
    expect(purchaseLook(state, 0, city.id, granary, 'gold')).toEqual(fresh);
  });
});

describe('the words', () => {
  it('writes a price as the figure in its bank’s mark, and nothing else', () => {
    expect(priceFigureText('gold', 356)).toBe(`356${YIELD_GLYPH.gold}`);
    expect(priceFigureText('faith', 120)).toBe(`120${YIELD_GLYPH.faith}`);
    expect(priceNeedText(31)).toBe('need 31');
  });

  it('heads the column with the rule and every bank in view', () => {
    expect(priceHeadText([{ bank: 'gold', held: 437 }])).toBe(
      'Buy outright · full price · you have 437 gold',
    );
    expect(priceHeadText([{ bank: 'gold', held: 437 }, { bank: 'faith', held: 51 }])).toBe(
      'Buy outright · full price · you have 437 gold · 51 faith',
    );
    expect(priceHeadText([{ bank: 'faith', held: 51 }])).toBe(
      'Buy outright · full price · you have 51 faith',
    );
    // A treasury in debt keeps its sign, as the top bar's does.
    expect(priceHeadText([{ bank: 'gold', held: -22 }])).toBe(
      'Buy outright · full price · you have −22 gold',
    );
    expect(priceHeadText([])).toBe('Buy outright · full price');
  });
});

describe('the cell as drawn', () => {
  const cell = (): string => braceBody(uiSource('priceCell.ts'), 'export function priceCellElement(');

  it('makes only the buy look a control', () => {
    const body = cell();
    expect(body).toContain("element('button', `price-cell is-buy ${bankClass}`)");
    expect(body).toContain("element('span', `price-cell is-short ${bankClass}`)");
    expect(body).toContain("element('span', `price-cell is-none ${bankClass}`)");
    expect(body.match(/element\('button'/g) ?? []).toHaveLength(1);
  });

  it('says what is short in the wanting voice, and pauses a plate quietly', () => {
    const body = cell();
    expect(body).toContain("element('span', 'price-cell-need wanting', priceNeedText(look.need))");
    // A finished turn is a state, not a lack: it disables the plate and never
    // adds the class.
    expect(body).toContain('button.disabled = paused !== null || options.onBuy === undefined;');
    expect(body).not.toMatch(/button\.classList\.add\('wanting'\)/);
  });

  it('reads a dash’s reason to a screen reader rather than the dash', () => {
    const body = cell();
    expect(body).toContain("dash.setAttribute('aria-hidden', 'true');");
    expect(body).toContain('`${options.name} cannot be bought here: ${reason}`');
  });
});
