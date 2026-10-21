/**
 * **The price list, the slip and the "Opened" stamp** (Scientific batch S10,
 * the approved prototype `docs/plans/mockups/charter-ux.html` steps 1 to 4).
 *
 * Since batch S0 a technology's price is a list (`explainTechCost`) and its
 * total is the list's fold (`foldTechCost`). The interface reads both through
 * one module, `techPrice.ts`, so the node, the hover card, the drawer and the
 * charter card's slip quote one figure. This file checks:
 *
 *   - the price list and its fold, with the premium flagged and the later
 *     lines signed;
 *   - that every surface that quotes a technology's price reads the fold, not
 *     the row's `cost`;
 *   - the slip a technology charter's card carries, for this empire and its
 *     cards, and the "Opened" stamp it takes on the pick;
 *   - that a card which is no technology charter carries neither.
 */

import { describe, expect, it } from 'vitest';

import { type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { type OrderId } from '../../src/sim/statecraftData';
import { explainTechCost, foldTechCost } from '../../src/sim/tech';
import {
  STAMP_OPENED_WORD,
  openedStamp,
  stampIsEmpty,
  stampThunks,
} from '../../src/ui/cardStamp';
import { SLIP_NOTE, charterOfferParts, charterTechOf } from '../../src/ui/charterTech';
import { priceLineFigure, techCostFor, techPriceList } from '../../src/ui/techPrice';
import { researchingGame } from '../sim/techHelpers';
import { braceBody, uiSource } from './sourceHelpers';

/** Seats a card the way the deck tests do. */
function seat(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

describe('a technology’s price, as every screen quotes it', () => {
  it('is the fold of the simulation’s own list', () => {
    const g = researchingGame();
    const player = playerById(g.state, 0)!;
    for (const tech of ['mechanics', 'mathematics', 'casting'] as const) {
      const list = techPriceList(g.state, player, tech);
      expect(list.total).toBe(foldTechCost(explainTechCost(g.state, player, tech)));
      expect(techCostFor(g.state, player, tech)).toBe(list.total);
      expect(list.lines.map((line) => line.amount)).toEqual(
        explainTechCost(g.state, player, tech).map((line) => line.amount),
      );
    }
  });

  it('flags the charter premium, and only on a charter technology', () => {
    const g = researchingGame();
    const player = playerById(g.state, 0)!;
    const mechanics = techPriceList(g.state, player, 'mechanics');
    expect(mechanics.lines.map((line) => [line.label, line.amount, line.premium])).toEqual([
      ['Column 8', 1150, false],
      ['Charter +50%', 575, true],
    ]);
    expect(mechanics.total).toBe(1725);
    // An ordinary node is one line, its column, and no premium.
    const mathematics = techPriceList(g.state, player, 'mathematics');
    expect(mathematics.lines).toHaveLength(1);
    expect(mathematics.lines[0]!.premium).toBe(false);
  });

  it('prints the first line plain and every later line signed, with a real minus', () => {
    expect(priceLineFigure({ label: 'Column 8', amount: 1150, premium: false }, 0)).toBe('1150');
    expect(priceLineFigure({ label: 'Charter +50%', amount: 575, premium: true }, 1)).toBe('+575');
    expect(priceLineFigure({ label: 'The Commonplace Book -15%', amount: -259, premium: false }, 2)).toBe('−259');
  });

  it('takes The Commonplace Book’s line when the card is seated (the mockup’s 1466)', () => {
    const g = researchingGame();
    seat(g.state, 0, 'theCommonplaceBook');
    const list = techPriceList(g.state, playerById(g.state, 0)!, 'mechanics');
    expect(list.lines).toHaveLength(3);
    expect(list.lines[2]!.label).toContain('The Commonplace Book');
    expect(list.total).toBe(1466);
  });

  it('is read through the fold by every surface that quotes a price', () => {
    const tree = uiSource('techTree.ts');
    // The node's face, painted (a seated card can move it).
    expect(braceBody(tree, 'function paintNode(')).toContain('techCostFor(state, player, id)');
    expect(braceBody(tree, 'function renderNode(')).not.toContain('def.cost');
    // The hover card's figure, its list and its progress lines.
    const card = braceBody(tree, 'function techCard(');
    expect(card).toContain('techPriceList(state, player, id)');
    expect(card).toContain('researchProgress(bankedTowardTech(player, id), cost, rate)');
    expect(card).not.toContain('def.cost}');
    // The drawer's research section.
    expect(braceBody(tree, 'function renderStatus(')).toContain(
      'researchProgress(player.sciencePool, techCostFor(state, player, current), rate)',
    );
    // The empire panel's research bar.
    expect(braceBody(uiSource('empireDrawer.ts'), 'export function researchGlance(')).toContain(
      'techCostFor(state, player, current)',
    );
    // And the price list prints only when it is more than one line.
    expect(card).toContain('price.lines.length > 1');
  });
});

describe('the slip on a technology charter’s card', () => {
  it('is the technology, its age, its price for this empire, and the turns', () => {
    const g = researchingGame();
    seat(g.state, 0, 'theCommonplaceBook');
    const parts = charterOfferParts(g.state, 0, 'theMechanistsCharter');
    expect(parts.slip).toBeDefined();
    const slip = parts.slip!;
    expect(slip.name).toBe('Mechanics');
    expect(slip.age).toBe('ÆRA III');
    expect(slip.lines.map((line) => [line.figure, line.premium])).toEqual([
      ['1150', false],
      ['+575', true],
      ['−259', false],
    ]);
    // The total carries the science glyph; the figure is the fold.
    expect(slip.total.startsWith('1466')).toBe(true);
    expect(slip.turns === 'no science yet' || /^~\d+ turns$/.test(slip.turns)).toBe(true);
    expect(slip.note).toBe(SLIP_NOTE);
  });

  it('is priced for the seat that holds the offer, not for a rival', () => {
    const g = researchingGame();
    seat(g.state, 0, 'theCommonplaceBook');
    expect(charterOfferParts(g.state, 1, 'theMechanistsCharter').slip!.total.startsWith('1725')).toBe(true);
  });

  it('takes the "Opened" stamp, which thunks and is never empty', () => {
    const g = researchingGame();
    const stamp = charterOfferParts(g.state, 0, 'theMechanistsCharter').stamp!;
    expect(stamp).toEqual(openedStamp('Mechanics'));
    expect(stamp.opened).toBe('Mechanics');
    expect(stampIsEmpty(stamp)).toBe(false);
    expect(stampThunks(stamp)).toBe(true);
    expect(STAMP_OPENED_WORD).toBe('Opened');
  });

  it('is absent on a card that opens no technology', () => {
    const g = researchingGame();
    expect(charterOfferParts(g.state, 0, 'theCommonplaceBook')).toEqual({});
    expect(charterTechOf('theCommonplaceBook')).toBeNull();
    // A retired charter naming a technology the tree never held draws nothing.
    expect(charterTechOf('theMetallurgistsCharter')).toBeNull();
    expect(charterTechOf('theMechanistsCharter')).toBe('mechanics');
  });

  it('lands the stamp on the slip, and keeps the usual seat for every other card', () => {
    const offer = uiSource('offerCard.ts');
    const body = braceBody(offer, 'function faceBody(');
    expect(body).toContain("const stampOnSlip = option.slip !== undefined && option.stamp?.opened !== undefined;");
    expect(body).toContain('offerSlipNode(option.slip, stampOnSlip ? cardStampNode() : null)');
    expect(body).toContain('!stampIsEmpty(option.stamp) && !stampOnSlip');
    // The draft spreads the slip after the impact stamp, so a charter's own
    // stamp wins.
    const main = uiSource('main.ts');
    const order = main.indexOf("...cardStamp(seat, { kind: 'order', id }),");
    expect(order).toBeGreaterThan(-1);
    expect(main.indexOf('...charterOfferParts(game.state, seat, id),')).toBeGreaterThan(order);
  });

  it('draws the "Opened" face in the charter sepia, out of sight until the pick', () => {
    const css = uiSource('style.css');
    expect(css).toContain(".offer-slip .card-stamp[data-face='flourish'] {");
    expect(css).toContain(".card-stamp[data-face='opened'] {");
    expect(css).toContain('--deck-charter-lit: #d8b07a;');
  });
});
