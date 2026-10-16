/**
 * **The screens for typed chairs** (batch C2b of `docs/plans/chairs-build.md`).
 *
 * There is no DOM in this suite, so what is pinned here is the arithmetic and
 * the wording (`src/ui/chairs.ts`, `fitsWords`), and, read off the source, which
 * builder and which rule each surface uses:
 *
 *   · the council draws every chair through `chairNode`, an empty one through
 *     `emptyChairNode`, and lights or dims a chair by the reducer's own answer
 *     (`placeError`), whose sentence is the dimmed chair's tooltip;
 *   · each chair type has its ink in the stylesheet, Civic included, and the
 *     council is compact, three chairs to a row;
 *   · the government card shows its chairs where an emblem was, and the notice
 *     after an adoption says what moved and what went back, worked out from
 *     the council before and after.
 */

import { describe, expect, it } from 'vitest';

import type { Command } from '../../src/sim/commands';
import { dispatch } from '../../src/sim/game';
import { bumpRevision, playerById } from '../../src/sim/state';
import { type SlottedOrder, slotTypesOf } from '../../src/sim/statecraft';
import {
  type CardTypeReading,
  GOVERNMENT_IDS,
  ORDER_IDS,
  type OrderId,
  governmentDef,
  isCharter,
  orderDef,
  orderIsDealt,
  orderType,
  slotCount,
  slotLayout,
} from '../../src/sim/statecraftData';
import {
  adoptionWords,
  chairMixOf,
  chairMixOfLayout,
  chairMixWords,
  chairWord,
  councilChange,
  offerChairsOf,
} from '../../src/ui/chairs';
import { fitsWords } from '../../src/ui/statecraftScreen';
import { game } from '../sim/statecraftHelpers';
import { between, braceBody, uiSource } from './sourceHelpers';

/** The first `count` dealt cards of one type, charters left out (a charter never sits). */
function cardsOf(type: CardTypeReading, count: number): OrderId[] {
  const ids = ORDER_IDS.filter((id) => orderIsDealt(id) && !isCharter(id) && orderType(id) === type).slice(
    0,
    count,
  );
  expect(ids, `${count} dealt ${type} card(s)`).toHaveLength(count);
  return ids;
}

function sitting(card: OrderId): SlottedOrder {
  return { card, sealedUntil: 0 };
}

describe('a government’s chairs in words', () => {
  it('says the mix the way the plan’s table does, leaving out a type it opens none of', () => {
    expect(chairMixWords(chairMixOf('warChief'))).toBe('2 Military · 1 Economic · 1 Civic · 1 Wildcard');
    expect(chairMixWords(chairMixOf('tyranny'))).toBe('3 Military · 1 Economic · 1 Wildcard');
    expect(chairMixWords(chairMixOf('chiefdom'))).toBe('1 Military · 1 Economic · 1 Wildcard');
    expect(chairWord('civic')).toBe('Civic');
  });

  it('hands the offer card plain strings, and every live government’s chairs add up', () => {
    expect(offerChairsOf('warChief')).toEqual([
      { ink: 'military', count: 2, word: 'Military' },
      { ink: 'economic', count: 1, word: 'Economic' },
      { ink: 'civic', count: 1, word: 'Civic' },
      { ink: 'wildcard', count: 1, word: 'Wildcard' },
    ]);
    for (const id of GOVERNMENT_IDS) {
      if (governmentDef(id).retired === true) continue;
      const total = offerChairsOf(id).reduce((sum, entry) => sum + entry.count, 0);
      expect(total, id).toBe(slotCount(id));
    }
  });

  it('counts a laid-out council, the Wildcard chairs a leader or a card adds included', () => {
    expect(chairMixWords(chairMixOfLayout([...slotLayout('chiefdom'), 'wildcard']))).toBe(
      '1 Military · 1 Economic · 2 Wildcard',
    );
  });

  it('says which chairs a card fits, with the article of the first', () => {
    expect(fitsWords(['Military', 'Wildcard'])).toBe('a Military or Wildcard');
    expect(fitsWords(['Economic', 'Wildcard'])).toBe('an Economic or Wildcard');
    expect(fitsWords(['Wildcard'])).toBe('a Wildcard');
    expect(fitsWords(['Military', 'Economic', 'Civic', 'Wildcard'])).toBe('a Military, Economic, Civic or Wildcard');
  });
});

describe('what an adoption did', () => {
  it('sorts the old council into the cards that stayed, moved and went back, in seat order', () => {
    const [a, b, c, d] = cardsOf('military', 4);
    const before = [sitting(a!), sitting(b!), null, sitting(c!), sitting(d!)];
    const after = [sitting(a!), null, sitting(d!), null, sitting(b!)];
    expect(councilChange(before, after)).toEqual({
      stayed: [a],
      moved: [
        { card: b, from: 1, to: 4 },
        { card: d, from: 4, to: 2 },
      ],
      returned: [c],
    });
  });

  it('says it in one notice, chairs numbered from one and named by type', () => {
    const [soldier] = cardsOf('military', 1);
    const [trader] = cardsOf('economic', 1);
    const layout = slotLayout('councilOfElders');
    expect(adoptionWords('Council of Elders', { stayed: [], moved: [], returned: [] }, layout)).toBe(
      'New government: Council of Elders.',
    );
    expect(adoptionWords('Council of Elders', { stayed: [soldier!], moved: [], returned: [] }, layout)).toBe(
      'New government: Council of Elders. Every seated Order kept its chair.',
    );
    expect(
      adoptionWords(
        'Council of Elders',
        { stayed: [], moved: [{ card: soldier!, from: 1, to: 4 }], returned: [trader!] },
        layout,
      ),
    ).toBe(
      `New government: Council of Elders. Moved: ${orderDef(soldier!).name} to chair 5 (Wildcard). ` +
        `Back in your collection: ${orderDef(trader!).name}.`,
    );
  });

  it('reads a real adoption the way the reducer did it', () => {
    // War Chief (M, M, E, C, W) becomes the Council of Elders (M, E, E, C, W):
    // the military card in chair 2 is the only one that moves.
    const g = game();
    const sc = playerById(g.state, 0)!.statecraft;
    sc.government = 'warChief';
    sc.slots = slotLayout('warChief').map(() => null);
    const [first, second] = cardsOf('military', 2);
    const [trader] = cardsOf('economic', 1);
    const [priest] = cardsOf('civic', 1);
    sc.orders.push(first!, second!, trader!, priest!);
    bumpRevision(g.state);
    [first!, second!, trader!, priest!].forEach((cardId, slotIndex) => {
      expect(dispatch(g, { type: 'slotOrder', playerId: 0, cardId, slotIndex } as Command).ok).toBe(true);
    });
    const before = [...sc.slots];
    sc.pendingGovernment = { tier: 4, options: ['councilOfElders'] };
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command).ok).toBe(true);
    const change = councilChange(before, sc.slots);
    expect(change.stayed).toEqual([first, trader, priest]);
    expect(change.moved).toEqual([{ card: second, from: 1, to: 4 }]);
    expect(change.returned).toEqual([]);
    expect(adoptionWords(governmentDef(sc.government).name, change, slotTypesOf(sc))).toBe(
      `New government: Council of Elders. Moved: ${orderDef(second!).name} to chair 5 (Wildcard).`,
    );
  });
});

describe('the council, read off the source', () => {
  const SCREEN = uiSource('statecraftScreen.ts');
  const SLOTS = between(SCREEN, 'function drawSlots(', 'function drawAggregate(');
  const STYLE = uiSource('style.css');

  it('builds every chair with the shared builders, and an empty one in its ink', () => {
    expect(SLOTS).toContain('chairNode(type, card)');
    expect(SLOTS).toContain('emptyChairNode(type, ');
    // The plate says the chair's type; "chair" alone was the universal chairs'.
    expect(SLOTS).not.toContain("'sc-slot-type', 'chair'");
    expect(SCREEN.toLowerCase()).not.toContain('universal');
  });

  it('lights and dims a chair by the reducer’s own answer, and the dimmed chair says why', () => {
    expect(SLOTS).toContain('placeError(state, seat, arrangement, held, index)');
    expect(SLOTS).toContain("button.classList.add('sc-slot-open')");
    expect(SLOTS).toContain("button.classList.add('sc-slot-refuses')");
    expect(SLOTS).toContain('button.title = refusal ?? ');
    // A click on a refusing chair says the same sentence in the manicule line.
    const drop = braceBody(SCREEN, 'function drop(index: number)');
    expect(drop).toContain('const problem = placeError(state, seat, arrangement, held, index);');
    expect(drop).toContain('options.onRefuse?.(problem);');
  });

  it('re-takes the staged arrangement when the chairs change, not only their number', () => {
    const ensure = braceBody(SCREEN, 'function ensureStaging(');
    expect(ensure).toContain('!sameChairs(stagedChairs, chairs)');
    expect(ensure).not.toContain('staged.length !== sc.slots.length');
  });

  it('inks each chair type, Civic included, and draws the Wildcard plate purple', () => {
    for (const type of ['military', 'economic', 'civic', 'wildcard']) {
      const rule = between(STYLE, `.sc-slot-${type} {`, '}');
      expect(rule, type).toContain(`--chair-ink: var(--type-${type});`);
      expect(rule, type).toContain(`--chair-ground: var(--type-${type}-ground);`);
    }
    expect(between(STYLE, '.sc-chair.sc-slot-wildcard .sc-chair-plate {', '}')).toContain(
      'border-color: var(--type-wildcard);',
    );
    expect(between(STYLE, '.sc-chair-empty {', '}')).toContain('var(--chair-ink');
    expect(between(STYLE, '.sc-chair-swatch {', '}')).toContain('var(--chair-ink');
  });

  it('draws a compact council, three chairs to a row', () => {
    expect(between(STYLE, '.sc-slot-row {', '}')).toContain('grid-template-columns: repeat(3, 92px);');
    const card = between(STYLE, '.sc-chair-card {', '}');
    expect(card).toContain('width: 92px;');
    expect(card).toContain('height: 142px;');
    expect(between(STYLE, '.sc-chair .suit-seat {', '}')).toContain('width: 92px;');
  });
});

describe('the government card and the adoption, read off the source', () => {
  const MAIN = uiSource('main.ts');

  it('shows a government’s chairs where its emblem was', () => {
    const face = braceBody(MAIN, 'function governmentFace(');
    expect(face).toContain('chairs: offerChairsOf(id)');
    expect(face).not.toContain('emblem');
    const offer = uiSource('offerCard.ts');
    expect(offer).toContain('button.append(offerChairsNode(option.chairs));');
  });

  it('says on the sheet that cards keep their chairs where they can', () => {
    const offer = between(MAIN, 'if (sc.pendingGovernment !== undefined) {', 'if (sc.pendingDoctrine !== undefined) {');
    expect(offer).toContain('Your seated Orders keep their chairs where they still fit');
  });

  it('announces what moved and what went back, from the council before and after', () => {
    const offer = between(MAIN, 'if (sc.pendingGovernment !== undefined) {', 'if (sc.pendingDoctrine !== undefined) {');
    expect(offer).toContain('const before = [...(playerById(game.state, seat)?.statecraft.slots ?? [])];');
    expect(offer).toContain('councilChange(before, after.slots)');
    expect(offer).toContain('adoptionWords(');
    expect(offer).toContain('{ openStatecraft: true }');
  });
});
