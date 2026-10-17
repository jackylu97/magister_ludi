import { describe, expect, it } from 'vitest';

import type { Command } from '../../src/sim/commands';
import { dispatch, snapshotState } from '../../src/sim/game';
import { bumpRevision, playerById } from '../../src/sim/state';
import {
  type SlottedOrder,
  adoptGovernmentAt,
  chairMisfitRefusal,
  explainCardEmpireYields,
  foldCardYields,
  maliceAt,
  newPlayerStatecraft,
  planDraft,
  reseatOrders,
  sealRemaining,
  settleDraft,
  slotOrderError,
  slotTypesOf,
  slottedOrdersOfFlavour,
  tallyOf,
} from '../../src/sim/statecraft';
import {
  type CardTypeReading,
  type ChairType,
  type GovernmentId,
  type OrderId,
  CHAIR_TYPES,
  GOVERNMENT_IDS,
  GOVERNMENT_TIERS,
  ORDER_IDS,
  bandTierAt,
  countedTypeOf,
  governmentDef,
  governmentsAtTier,
  isCharter,
  orderDef,
  orderFitsSlot,
  orderIsDealt,
  orderType,
  slotLayout,
} from '../../src/sim/statecraftData';
import { found, game } from './statecraftHelpers';

/**
 * **Typed chairs, the rules half** (batch C2a of `docs/plans/chairs-build.md`;
 * the chair table is `docs/plans/doctrines-governments-chairs.md` section 4).
 *
 * What this file pins, in the order the build lists it:
 *
 *   1. the fit rule (`orderFitsSlot`) and the reducer's refusal sentence
 *      (`slotOrderError`, `chairMisfitRefusal`), with every chair beyond a
 *      government's mix a Wildcard chair;
 *   2. adoption re-seats the council (`reseatOrders`, `adoptGovernmentAt`):
 *      malices first, then every card whose chair still exists and still fits
 *      it stays, the rest are placed in the spec's four passes, and what fits
 *      nowhere is returned; the government card's stamp asks the same function;
 *   3. the tier-18 signatures count by type (`countedTypeOf`), an unsorted card
 *      counting as the type of its chair, a Wildcard chair included;
 *   4. the tier-38 governments are retired and the rung at draft 38 still opens.
 *
 * The mixes themselves, and that each adds up to its rung's chairs, are pinned
 * in `statecraft.test.ts` ("lays every live government's chairs out of its
 * ruled mix"); the doc's table is `statecraftDocSync.test.ts`; the bots are
 * `aiWar.test.ts` ("slotting is scored rather than first-fit").
 *
 * The cards are read off the live table by type rather than named, so a deck
 * batch that adds or moves a card does not break a claim about the rule.
 */

/** The first `count` dealt cards of one type, in table order. A charter never sits, so none is taken. */
function cardsOf(type: CardTypeReading, count: number): OrderId[] {
  const ids = ORDER_IDS.filter((id) => orderIsDealt(id) && !isCharter(id) && orderType(id) === type).slice(
    0,
    count,
  );
  expect(ids, `${count} dealt ${type} card(s)`).toHaveLength(count);
  return ids;
}

/** A chair's record, sealed until `sealedUntil`. */
function sitting(card: OrderId, sealedUntil = 0): SlottedOrder {
  return { card, sealedUntil };
}

/** The cards in a council, by chair. */
function cards(slots: readonly (SlottedOrder | null)[]): (OrderId | null)[] {
  return slots.map((slot) => slot?.card ?? null);
}

/**
 * An old council whose cards all sat past the end of `layout`, so none of them
 * can keep its chair and every one is placed by the four passes. The passes'
 * own order is what the tests built on this are about.
 */
function fromBeyond(layout: readonly ChairType[], ids: readonly (OrderId | undefined)[]): (SlottedOrder | null)[] {
  return [...layout.map(() => null), ...ids.map((id) => sitting(id!))];
}

// --- 1. the fit rule ----------------------------------------------------------

describe('the fit rule', () => {
  it('takes a card of the chair’s own type or an unsorted card, and anything in a Wildcard chair', () => {
    const FITS: Record<CardTypeReading, readonly ChairType[]> = {
      military: ['military', 'wildcard'],
      economic: ['economic', 'wildcard'],
      civic: ['civic', 'wildcard'],
      // The user, 2026-10-16: a Wildcard card fits only a Wildcard chair.
      wildcard: ['wildcard'],
      // A card of a deck not sorted yet fits any chair, so those decks play
      // as they did before typed chairs.
      unsorted: ['military', 'economic', 'civic', 'wildcard'],
    };
    for (const type of Object.keys(FITS) as CardTypeReading[]) {
      const [card] = cardsOf(type, 1);
      for (const chair of CHAIR_TYPES) {
        expect(orderFitsSlot(card!, chair), `a ${type} card in a ${chair} chair`).toBe(
          FITS[type].includes(chair),
        );
      }
    }
  });

  it('refuses a misfit in the reducer, in plain words, and changes nothing', () => {
    const g = game();
    const sc = playerById(g.state, 0)!.statecraft;
    // The chiefdom's three: Military, Economic, Wildcard.
    expect(slotTypesOf(sc)).toEqual(['military', 'economic', 'wildcard']);
    const [wild] = cardsOf('wildcard', 1);
    const [soldier] = cardsOf('military', 1);
    const [trader] = cardsOf('economic', 1);
    const [priest] = cardsOf('civic', 1);
    sc.orders.push(wild!, soldier!, trader!, priest!);
    bumpRevision(g.state);

    const refused = (cardId: OrderId, slotIndex: number, sentence: string): void => {
      const before = snapshotState(g.state);
      const result = dispatch(g, { type: 'slotOrder', playerId: 0, cardId, slotIndex } as Command);
      expect(result.ok, `${cardId} into chair ${slotIndex + 1}`).toBe(false);
      if (!result.ok) expect(result.error).toBe(sentence);
      // Hard rule 1: a refused command leaves the state byte-identical.
      expect(snapshotState(g.state)).toBe(before);
    };
    const name = (id: OrderId): string => orderDef(id).name;
    refused(wild!, 0, `${name(wild!)} is a wildcard card: it fits only a wildcard chair, and chair 1 is a military chair`);
    refused(
      soldier!,
      1,
      `${name(soldier!)} is a military card: it fits a military chair or a wildcard chair, and chair 2 is an economic chair`,
    );
    refused(
      trader!,
      0,
      `${name(trader!)} is an economic card: it fits an economic chair or a wildcard chair, and chair 1 is a military chair`,
    );
    // The chiefdom has no Civic chair, so a civic card waits for the Wildcard one.
    refused(
      priest!,
      1,
      `${name(priest!)} is a civic card: it fits a civic chair or a wildcard chair, and chair 2 is an economic chair`,
    );
    // The screens ask the same function for the same sentence.
    expect(chairMisfitRefusal(wild!, 0, 'military')).toBe(
      `${name(wild!)} is a wildcard card: it fits only a wildcard chair, and chair 1 is a military chair`,
    );

    // And every card goes where it fits.
    for (const [cardId, slotIndex] of [
      [soldier!, 0],
      [trader!, 1],
      [wild!, 2],
    ] as const) {
      expect(dispatch(g, { type: 'slotOrder', playerId: 0, cardId, slotIndex } as Command).ok).toBe(true);
    }
    expect(cards(sc.slots)).toEqual([soldier, trader, wild]);
  });

  it('seats an unsorted card in any chair', () => {
    const g = game();
    const sc = playerById(g.state, 0)!.statecraft;
    const unsorted = cardsOf('unsorted', 3);
    sc.orders.push(...unsorted);
    bumpRevision(g.state);
    unsorted.forEach((id, index) => expect(slotOrderError(g.state, 0, id, index), id).toBeNull());
  });

  it('makes every chair beyond a government’s mix a Wildcard chair', () => {
    // A leader's chair, a card's, Magisterial's: whatever opens it, it is
    // appended after the mix and takes any card.
    const sc = newPlayerStatecraft();
    sc.government = 'imperium';
    sc.slots = new Array<SlottedOrder | null>(slotLayout('imperium').length + 2).fill(null);
    const chairs = slotTypesOf(sc);
    expect(chairs.slice(0, -2)).toEqual(slotLayout('imperium'));
    expect(chairs.slice(-2)).toEqual(['wildcard', 'wildcard']);
    const [wild] = cardsOf('wildcard', 1);
    expect(orderFitsSlot(wild!, chairs[chairs.length - 1]!)).toBe(true);
  });

  it('keeps the old three-word `slots` spread off every government row', () => {
    // Replaced by `chairMix` (batch C2). A row still carrying the old field
    // would be a second, stale answer to "which chairs".
    for (const id of GOVERNMENT_IDS) {
      expect(Object.prototype.hasOwnProperty.call(governmentDef(id), 'slots'), id).toBe(false);
    }
  });
});

// --- 2. re-seating on adoption -------------------------------------------------

describe('re-seating on adoption', () => {
  it('keeps every card whose chair still exists and still fits it, and moves only the rest', () => {
    // The user, 2026-10-16: *"lets have adoption keep as many slots the same
    // as possible"*. War Chief (M, M, E, C, W) becomes the Council of Elders
    // (M, E, E, C, W).
    const from = slotLayout('warChief');
    const to = slotLayout('councilOfElders');
    expect(from).toEqual(['military', 'military', 'economic', 'civic', 'wildcard']);
    expect(to).toEqual(['military', 'economic', 'economic', 'civic', 'wildcard']);
    const [first, second] = cardsOf('military', 2);
    const [trader] = cardsOf('economic', 1);
    const [priest] = cardsOf('civic', 1);
    const out = reseatOrders(
      [sitting(first!), sitting(second!), sitting(trader!), sitting(priest!), null],
      to,
      to.map(() => false),
      10,
    );
    // Chairs 1, 3 and 4 still exist and still fit their cards, so those stay.
    // Chair 2 is an Economic chair now, so the second military card moves, to
    // the free Wildcard chair.
    expect(cards(out.slots)).toEqual([first, null, trader, priest, second]);
    expect(out.reseated).toEqual([first, second, trader, priest]);
    expect(out.returned).toEqual([]);
  });

  it('keeps the same chairs when the council grows, and moves only what no longer fits', () => {
    // Tyranny (M, M, M, E, W) becomes Imperium (M, M, M, E, E, C, W, W).
    const to = slotLayout('imperium');
    expect(slotLayout('tyranny')).toEqual(['military', 'military', 'military', 'economic', 'wildcard']);
    expect(to).toEqual(['military', 'military', 'military', 'economic', 'economic', 'civic', 'wildcard', 'wildcard']);
    const [first, second] = cardsOf('military', 2);
    const [unsorted] = cardsOf('unsorted', 1);
    const [trader] = cardsOf('economic', 1);
    const [wild] = cardsOf('wildcard', 1);
    const out = reseatOrders(
      [first, second, unsorted, trader, wild].map((id) => sitting(id!)),
      to,
      to.map(() => false),
      10,
    );
    // The first four chairs keep their cards. Chair 5 is an Economic chair now
    // and the Wildcard card cannot sit in it, so it takes the first Wildcard
    // chair, chair 7.
    expect(cards(out.slots)).toEqual([first, second, unsorted, trader, null, null, wild, null]);
    expect(out.returned).toEqual([]);
  });

  it('keeps what it can when the council shrinks, and returns the rest', () => {
    // Imperium (M, M, M, E, E, C, W, W) becomes War Chief (M, M, E, C, W).
    const to = slotLayout('warChief');
    const [first, second, third] = cardsOf('military', 3);
    const [trader, factor] = cardsOf('economic', 2);
    const [priest] = cardsOf('civic', 1);
    const [wild] = cardsOf('wildcard', 1);
    const [unsorted] = cardsOf('unsorted', 1);
    const out = reseatOrders(
      [first, second, third, trader, factor, priest, wild, unsorted].map((id) => sitting(id!)),
      to,
      to.map(() => false),
      10,
    );
    // Stay: the two military cards in chairs 1 and 2, and the economic card in
    // chair 5, which is the Wildcard chair now. Move: the economic card in
    // chair 4 and the civic card from chair 6 take the free Economic and Civic
    // chairs. Returned: the third military card, the Wildcard card (the
    // Wildcard chair is kept by the card already in it) and the unsorted card.
    expect(cards(out.slots)).toEqual([first, second, trader, priest, factor]);
    expect(out.reseated).toEqual([first, second, trader, factor, priest]);
    expect(out.returned).toEqual([third, wild, unsorted]);
  });

  it('places the Wildcard cards first among the cards that move, because nothing else takes them', () => {
    const [soldier] = cardsOf('military', 1);
    const [wild] = cardsOf('wildcard', 1);
    // One Wildcard chair, and two moving cards that fit it. The Wildcard card
    // sat second and still takes it; the military card has nowhere left.
    const out = reseatOrders(fromBeyond(['wildcard'], [soldier, wild]), ['wildcard'], [false], 10);
    expect(cards(out.slots)).toEqual([wild]);
    expect(out.reseated).toEqual([wild]);
    expect(out.returned).toEqual([soldier]);
  });

  it('puts a moving typed card in a chair of its own type before it spends a Wildcard chair', () => {
    const [first, second] = cardsOf('military', 2);
    // The Wildcard chair comes first in the layout, and the first card still
    // takes the military chair; the second takes the Wildcard chair left.
    const layout: ChairType[] = ['wildcard', 'military'];
    const out = reseatOrders(fromBeyond(layout, [first, second]), layout, [false, false], 10);
    expect(cards(out.slots)).toEqual([second, first]);
    expect(out.returned).toEqual([]);
  });

  it('places the moving unsorted cards last, typed chairs before Wildcard ones', () => {
    const [unsorted] = cardsOf('unsorted', 1);
    const [trader] = cardsOf('economic', 1);
    // The unsorted card sat first, but the economic card is placed before it.
    const contested = reseatOrders(fromBeyond(['economic'], [unsorted, trader]), ['economic'], [false], 10);
    expect(contested.reseated).toEqual([trader]);
    expect(contested.returned).toEqual([unsorted]);
    // Alone, it takes the typed chair and leaves the Wildcard chair free.
    const layout: ChairType[] = ['wildcard', 'economic'];
    const alone = reseatOrders(fromBeyond(layout, [unsorted]), layout, [false, false], 10);
    expect(cards(alone.slots)).toEqual([null, unsorted]);
  });

  it('keeps the old seat order within a pass, and returns what fits no chair', () => {
    const [a, b, c] = cardsOf('military', 3);
    const layout: ChairType[] = ['military', 'military'];
    const out = reseatOrders(fromBeyond(layout, [b, a, c]), layout, [false, false], 10);
    expect(cards(out.slots)).toEqual([b, a]);
    expect(out.reseated).toEqual([b, a]);
    expect(out.returned).toEqual([c]);
  });

  it('runs the four passes in the spec’s order on the cards that move', () => {
    const [unsorted, spare] = cardsOf('unsorted', 2);
    const [soldier, second] = cardsOf('military', 2);
    const [wild] = cardsOf('wildcard', 1);
    const [trader] = cardsOf('economic', 1);
    const layout: ChairType[] = ['military', 'economic', 'civic', 'wildcard', 'wildcard', 'wildcard'];
    const out = reseatOrders(
      fromBeyond(layout, [unsorted, soldier, wild, second, trader, spare]),
      layout,
      layout.map(() => false),
      10,
    );
    // 1. the Wildcard card takes the first Wildcard chair; 2. the military and
    // economic cards take their own chairs; 3. the second military card takes
    // the next Wildcard chair; 4. the first unsorted card takes the Civic chair
    // left, and the second the last Wildcard chair.
    expect(cards(out.slots)).toEqual([soldier, trader, unsorted, wild, second, spare]);
    // Reported in the old seat order.
    expect(out.reseated).toEqual([unsorted, soldier, wild, second, trader, spare]);
    expect(out.returned).toEqual([]);
  });

  it('never seats a card in a chair a malice holds, not even the chair it had', () => {
    const [soldier] = cardsOf('military', 1);
    const out = reseatOrders([sitting(soldier!)], ['military', 'wildcard'], [true, false], 10);
    expect(cards(out.slots)).toEqual([null, soldier]);
  });

  it('lifts the seal and keeps the rest of the chair’s record', () => {
    const [soldier] = cardsOf('military', 1);
    const record: SlottedOrder = { card: soldier!, sealedUntil: 15, nextFiresTurn: 20, firePeriod: 10, rerollsSeen: 2 };
    const out = reseatOrders([record], ['military'], [false], 10);
    // The card never left a chair, so its clock and its count go with it; the
    // seal is lifted so the new council can be laid out at once.
    expect(out.slots[0]).toEqual({ ...record, sealedUntil: 10 });
    // A seal already past is left where it was.
    expect(reseatOrders([sitting(soldier!, 4)], ['military'], [false], 10).slots[0]).toEqual(sitting(soldier!, 4));
  });

  it('keeps the council through an adoption in the reducer, seals lifted', () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    const sc = player.statecraft;
    const [soldier] = cardsOf('military', 1);
    const [trader] = cardsOf('economic', 1);
    const [wild] = cardsOf('wildcard', 1);
    sc.orders.push(soldier!, trader!, wild!);
    bumpRevision(g.state);
    [soldier!, trader!, wild!].forEach((cardId, slotIndex) => {
      expect(dispatch(g, { type: 'slotOrder', playerId: 0, cardId, slotIndex } as Command).ok).toBe(true);
    });
    expect(sealRemaining(g.state, sc.slots[0]!)).toBeGreaterThan(0);

    sc.pendingGovernment = { tier: 4, options: governmentsAtTier(4) };
    const choice = governmentsAtTier(4).indexOf('warChief');
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: choice } as Command).ok).toBe(true);
    // War Chief: Military, Military, Economic, Civic, Wildcard.
    expect(slotTypesOf(sc)).toEqual(['military', 'military', 'economic', 'civic', 'wildcard']);
    expect(cards(sc.slots)).toEqual([soldier, null, trader, null, wild]);
    for (const slot of sc.slots) if (slot) expect(sealRemaining(g.state, slot), slot.card).toBe(0);
  });

  it('keeps the unchanged chairs through the reducer when War Chief becomes the Council of Elders', () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    const sc = player.statecraft;
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

    sc.pendingGovernment = { tier: 4, options: ['councilOfElders'] };
    expect(dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command).ok).toBe(true);
    // Only the military card in chair 2 moves: chair 2 is an Economic chair
    // now, and the Wildcard chair is free.
    expect(cards(sc.slots)).toEqual([first, null, trader, priest, second]);
  });

  it('returns what fits no chair to the collection, with its progress', () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    const sc = player.statecraft;
    // A council under Divine Mandate: three civic cards and two Wildcard cards.
    sc.government = 'divineMandate';
    const layout = slotLayout('divineMandate');
    sc.slots = layout.map(() => null);
    const priests = cardsOf('civic', 3);
    const wilds = cardsOf('wildcard', 2);
    sc.orders.push(...priests, ...wilds);
    const civicChairs = layout.flatMap((type, index) => (type === 'civic' ? [index] : []));
    const wildChairs = layout.flatMap((type, index) => (type === 'wildcard' ? [index] : []));
    priests.forEach((id, at) => (sc.slots[civicChairs[at]!] = sitting(id)));
    wilds.forEach((id, at) => (sc.slots[wildChairs[at]!] = sitting(id)));
    // A card's progress is a tally on the card, never on its chair.
    sc.tallies.push({ card: priests[0]!, count: 3 });
    bumpRevision(g.state);

    // Tyranny has no Civic chair and one Wildcard chair, which is chair 5:
    // under Divine Mandate that chair held the second civic card, and a civic
    // card fits a Wildcard chair, so it stays there. Nothing else fits.
    sc.pendingGovernment = { tier: 10, options: ['tyranny'] };
    const adoption = adoptGovernmentAt(g.state, player, 0)!;
    expect(adoption).not.toBeNull();
    expect(slotTypesOf(sc)).toEqual(['military', 'military', 'military', 'economic', 'wildcard']);
    expect(civicChairs).toEqual([3, 4, 5]);
    expect(cards(sc.slots)).toEqual([null, null, null, null, priests[1]]);
    expect(adoption.reseated).toEqual([priests[1]]);
    expect([...adoption.returned].sort()).toEqual([priests[0]!, priests[2]!, ...wilds].sort());
    // Returned to the collection, unseated, the tally kept.
    for (const id of [...priests, ...wilds]) expect(sc.orders, id).toContain(id);
    expect(tallyOf(sc, priests[0]!)).toBe(3);
  });

  it('seats the malices before the Orders, so a malice never turns a re-seated card out', () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    const sc = player.statecraft;
    const [soldier] = cardsOf('military', 1);
    const [trader] = cardsOf('economic', 1);
    sc.orders.push(soldier!, trader!);
    // The Thin Ranks (a military malice) holds the chiefdom's military chair,
    // so the military card sits in the Wildcard chair.
    player.malices.push({ id: 'thinRanks', untilAge: 3, chair: 0 });
    sc.slots = [null, sitting(trader!), sitting(soldier!)];
    bumpRevision(g.state);

    sc.pendingGovernment = { tier: 4, options: ['warChief'] };
    expect(adoptGovernmentAt(g.state, player, 0)).not.toBeNull();
    // War Chief's chairs: the malice takes the last military chair, then the
    // military card the first, and the economic card its own.
    expect(maliceAt(player, 1)).toBe('thinRanks');
    expect(cards(sc.slots)).toEqual([soldier, null, trader, null, null]);
  });
});

// --- one re-seating ----------------------------------------------------------------

describe('one re-seating', () => {
  const SOURCES = import.meta.glob(['../../src/sim/statecraft/draft.ts', '../../src/sim/cardImpact.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  /** The body of a top-level function: its signature to its closing brace. */
  function bodyOf(file: string, name: string): string {
    const text = SOURCES[file] ?? '';
    return new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`).exec(text)?.[0] ?? '';
  }

  it('is asked by the adoption and by the government card’s stamp alike', () => {
    // The stamp on a government card prices the adoption it names, so it must
    // seat the cards by the very function the adoption seats them by, or the
    // figure on the card would describe a different council. The bots adopt
    // through the reducer, so they get the same seating.
    const adopt = bodyOf('../../src/sim/statecraft/draft.ts', 'adoptGovernmentAt');
    expect(adopt.length, 'adoptGovernmentAt found').toBeGreaterThan(100);
    expect(adopt).toContain('reseatCouncil(player, previous, state.turn)');
    const ghost = bodyOf('../../src/sim/cardImpact.ts', 'ghostPair');
    expect(ghost.length, 'ghostPair found').toBeGreaterThan(100);
    expect(ghost).toContain('reseatCouncil(ghost, sc.slots, state.turn)');
    // And `reseatCouncil` seats the Orders through `reseatOrders` and nothing else.
    expect(bodyOf('../../src/sim/statecraft/draft.ts', 'reseatCouncil')).toContain('reseatOrders(previous, layout, held, turn)');
  });
});

// --- 3. the tier-18 signatures count by type ------------------------------------

describe('the tier-18 signatures count by type', () => {
  it('counts a typed card as its own type, and an unsorted card as its chair’s', () => {
    const [soldier] = cardsOf('military', 1);
    const [wild] = cardsOf('wildcard', 1);
    const [unsorted] = cardsOf('unsorted', 1);
    expect(countedTypeOf(soldier!, 'economic')).toBe('military');
    expect(countedTypeOf(soldier!, 'wildcard')).toBe('military');
    expect(countedTypeOf(wild!, 'wildcard')).toBe('wildcard');
    expect(countedTypeOf(unsorted!, 'economic')).toBe('economic');
    expect(countedTypeOf(unsorted!, 'civic')).toBe('civic');
    // A Wildcard chair included (the spec as amended on 2026-10-16): in one, an
    // unsorted card counts as a Wildcard Order, which is what the Assembly Hall
    // pays for (`charters.test.ts`).
    expect(countedTypeOf(unsorted!, 'wildcard')).toBe('wildcard');
  });

  it('pays the Merchant League for an unsorted card in an Economic chair, and not in a Wildcard one', () => {
    // The orchestrator's interim rule (`docs/plans/chairs-build.md`): until a
    // deck is sorted, a Commerce card in an Economic chair still counts for
    // the Merchant League.
    const g = game();
    found(g.state, 0);
    const sc = playerById(g.state, 0)!.statecraft;
    const government: GovernmentId = 'merchantLeague';
    sc.government = government;
    const layout = slotLayout(government);
    sc.slots = layout.map(() => null);
    bumpRevision(g.state);
    const coin = (): number =>
      foldCardYields(explainCardEmpireYields(g.state, 0).filter((line) => line.card === government)).gold;
    const put = (chair: ChairType, id: OrderId): void => {
      const index = layout.findIndex((type, at) => type === chair && sc.slots[at] === null);
      expect(index, `a free ${chair} chair`).toBeGreaterThanOrEqual(0);
      sc.orders.push(id);
      sc.slots[index] = sitting(id);
      bumpRevision(g.state);
    };
    const [inEconomic, inWildcard] = cardsOf('unsorted', 2);
    const [trader] = cardsOf('economic', 1);
    expect(coin()).toBe(0);
    put('economic', inEconomic!);
    expect(slottedOrdersOfFlavour(g.state, 0, 'economic')).toBe(1);
    expect(coin()).toBe(2);
    // In a Wildcard chair it counts as a Wildcard Order, so the Merchant
    // League does not pay for it.
    put('wildcard', inWildcard!);
    expect(slottedOrdersOfFlavour(g.state, 0, 'economic')).toBe(1);
    expect(slottedOrdersOfFlavour(g.state, 0, 'wildcard')).toBe(1);
    expect(coin()).toBe(2);
    // An economic card counts by its own type, in any chair.
    put('wildcard', trader!);
    expect(slottedOrdersOfFlavour(g.state, 0, 'economic')).toBe(2);
    expect(coin()).toBe(4);
  });
});

// --- 4. the tier-38 governments -------------------------------------------------

describe('the tier-38 governments', () => {
  it('are kept for saves and offered to nobody', () => {
    for (const id of ['theEmpire', 'theCommonwealth', 'theMagisterium'] as const) {
      expect(GOVERNMENT_IDS, id).toContain(id);
      expect(governmentDef(id).retired, id).toBe(true);
      expect(governmentDef(id).tier, id).toBe(38);
    }
    expect(GOVERNMENT_TIERS).toEqual([4, 10, 18, 29]);
    expect(governmentsAtTier(38)).toEqual([]);
  });

  it('leave draft 38 an ordinary draft, with no government, nothing banked and no new band', () => {
    const g = game();
    const player = playerById(g.state, 0)!;
    player.statecraft.drafts = 37;
    player.culturePool = 1_000_000;
    const plan = planDraft(player)!;
    expect(plan.tier).toBe(38);
    expect(plan.offersGovernment).toBe(false);
    const done = settleDraft(g.state, player)!;
    expect(done.tier).toBe(38);
    expect(done.government).toBeNull();
    expect(player.statecraft.pendingGovernment).toBeUndefined();
    // The reward hand this rung used to bank went with the reward hands in
    // batch C3: a new government brings only its Doctrine offer, and no
    // government is offered here.
    expect(player.statecraft).not.toHaveProperty('rewardHands');
    // Since the user's ruling of 2026-10-17 the ladder's rungs are the
    // government tiers, so 38 is no rung: the last band opened at 29, with the
    // tier-29 governments.
    expect(bandTierAt(28)).toBe(3);
    expect(bandTierAt(29)).toBe(4);
    expect(bandTierAt(38)).toBe(4);
  });
});
