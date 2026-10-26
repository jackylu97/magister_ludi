/**
 * **The Mixed Constitution** (batch MG12 of
 * `docs/plans/magisterial-themes-triage.md`; the triage's reading 24 and
 * question 2's recommended answer).
 *
 * The card holds one action rule, `cardsFitAnyChair`. What this file pins:
 *
 *   · the row, and its words;
 *   · the fit: `orderFitsSlot` stays the plain rule, and `chairFitFor`
 *     answers the fit a seat's council grants now. While the card sits in a
 *     chair, every card of its holder fits every chair. The card itself is
 *     seated by the plain rule, in a Wildcard chair;
 *   · the signatures and The Golden Bull still count each card by its own
 *     type (reading 18);
 *   · an adoption reads the fit from the old council, so every card is
 *     re-seated while chairs remain;
 *   · every way a card can leave a chair: when the card that widened the fit
 *     leaves (the unslot command, a malice taking its chair, an adoption that
 *     finds it no chair, a council that shrinks), the council is re-seated at
 *     once by the plain rule. A commission leaving its chair does not narrow
 *     the fit, so it re-seats nothing;
 *   · a register, read off the source: every writer of a seat's chairs asks
 *     `settleCouncilFit` or says why it need not, and only the flair gallery
 *     and the fit's own modules ask the plain rule directly.
 *
 * The council screen's staging is pinned in `test/ui/statecraftStaging.test.ts`
 * and the card stamp in `test/sim/cardImpact.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import type { Command } from '../../../src/sim/commands';
import { councilInOrder, runCommissions } from '../../../src/sim/commissions';
import { dispatch, restoreState, snapshotState } from '../../../src/sim/game';
import { type GameState, type Player, bumpRevision, playerById } from '../../../src/sim/state';
import {
  type SlottedOrder,
  adoptGovernmentAt,
  chairFitFor,
  chairFitWithout,
  chairMisfitRefusal,
  commissionFulfilledTurn,
  councilRefit,
  describeCard,
  maliceAt,
  orderFitsSlotFor,
  refitSlots,
  sealRemaining,
  slotOrderError,
  slotTypesOf,
  slottedOrdersOfFlavour,
  stripRefs,
  takeMalice,
} from '../../../src/sim/statecraft';
import {
  type CardTypeReading,
  type GovernmentId,
  type OrderId,
  CHAIR_TYPES,
  ORDER_IDS,
  isCharter,
  orderDef,
  orderFitsSlot,
  orderIsDealt,
  orderType,
  ordersForDecks,
  slotLayout,
} from '../../../src/sim/statecraftData';
import { game } from '../statecraftHelpers';

const MIXED = 'theMixedConstitution' as OrderId;
const ROLL = 'magisterialTheRollOfTheSenate' as OrderId;

/** The first `count` dealt cards of one type, in table order: no charter, no commission, not this card. */
function cardsOf(type: CardTypeReading, count: number): OrderId[] {
  const ids = ORDER_IDS.filter(
    (id) =>
      orderIsDealt(id) &&
      !isCharter(id) &&
      orderDef(id).commission === undefined &&
      orderType(id) === type &&
      id !== MIXED,
  ).slice(0, count);
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
 * Seat 0 under this government, with these cards in these chairs (or the
 * records given), every one of them in the collection. Written by hand, as a
 * fixture: a card The Mixed Constitution lets sit in a chair can be placed
 * here whether or not the card is seated.
 */
function council(
  state: GameState,
  government: GovernmentId,
  chairs: readonly (OrderId | SlottedOrder | null)[],
): Player {
  const player = playerById(state, 0)!;
  const sc = player.statecraft;
  sc.government = government;
  sc.slots = chairs.map((chair) => (chair === null ? null : typeof chair === 'string' ? sitting(chair) : chair));
  for (const slot of sc.slots) if (slot !== null && !sc.orders.includes(slot.card)) sc.orders.push(slot.card);
  bumpRevision(state);
  return player;
}

/** Every seated card fits its chair by the plain rule. */
function plainlySeated(player: Player): boolean {
  const layout = slotTypesOf(player.statecraft);
  return player.statecraft.slots.every((slot, index) => slot === null || orderFitsSlot(slot.card, layout[index]!));
}

// --- the row -----------------------------------------------------------------

describe('The Mixed Constitution: the row', () => {
  it('is dealt from Tier III as a rare Wildcard card, with the shape the triage names', () => {
    const def = orderDef(MIXED);
    expect(orderIsDealt(MIXED)).toBe(true);
    expect(ordersForDecks(['magisterial'])).toContain(MIXED);
    expect(def.decks).toEqual(['magisterial']);
    expect(def.band).toBe(3);
    expect(def.rarity).toBe('rare');
    expect(def.type).toBe('wildcard');
    expect(def.deferred).toBeUndefined();
    expect(def.text).toBe('Your cards fit any chair.');
    expect(def.effects).toEqual([{ kind: 'rule', rule: 'cardsFitAnyChair' }]);
  });

  it('prints the card in plain words', () => {
    expect(describeCard(MIXED).map((clause) => stripRefs(clause.text))).toEqual(['your cards fit any chair']);
  });
});

// --- the fit ------------------------------------------------------------------

describe('the fit a council grants', () => {
  it('is the plain rule without the card, and every chair while it sits', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    const [wild] = cardsOf('wildcard', 1);
    // The chiefdom: Military, Economic, Wildcard.
    const player = council(g.state, 'chiefdom', [null, null, null]);
    expect(slotTypesOf(player.statecraft)).toEqual(['military', 'economic', 'wildcard']);
    expect(chairFitFor(g.state, 0)).toBe(orderFitsSlot);
    // Held and not seated, it changes nothing.
    player.statecraft.orders.push(MIXED, priest!, wild!);
    bumpRevision(g.state);
    expect(chairFitFor(g.state, 0)).toBe(orderFitsSlot);
    expect(orderFitsSlotFor(g.state, 0, priest!, 'military')).toBe(false);
    // Seated, every card of the seat fits every chair.
    council(g.state, 'chiefdom', [null, null, MIXED]);
    for (const card of [priest!, wild!, MIXED]) {
      for (const chair of CHAIR_TYPES) expect(orderFitsSlotFor(g.state, 0, card, chair), `${card} ${chair}`).toBe(true);
    }
    // The plain rule itself is untouched.
    expect(orderFitsSlot(priest!, 'military')).toBe(false);
    expect(orderFitsSlot(wild!, 'economic')).toBe(false);
    // And it is this seat's alone.
    expect(chairFitFor(g.state, 1)).toBe(orderFitsSlot);
  });

  it('lets the reducer seat a card in any chair, and seats the card itself only in a Wildcard chair', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    const player = council(g.state, 'chiefdom', [null, null, null]);
    player.statecraft.orders.push(MIXED, priest!);
    bumpRevision(g.state);
    const name = (id: OrderId): string => orderDef(id).name;
    // Without it, the civic card does not fit the military chair, and the card
    // itself is a Wildcard card.
    expect(slotOrderError(g.state, 0, priest!, 0)).toBe(chairMisfitRefusal(priest!, 0, 'military'));
    const before = snapshotState(g.state);
    const refused = dispatch(g, { type: 'slotOrder', playerId: 0, cardId: MIXED, slotIndex: 0 } as Command);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error).toBe(
        `${name(MIXED)} is a wildcard card: it fits only a wildcard chair, and chair 1 is a military chair`,
      );
    }
    expect(snapshotState(g.state)).toBe(before);
    // Seated in the Wildcard chair, the civic card takes the military one.
    expect(dispatch(g, { type: 'slotOrder', playerId: 0, cardId: MIXED, slotIndex: 2 } as Command).ok).toBe(true);
    expect(slotOrderError(g.state, 0, priest!, 0)).toBeNull();
    expect(dispatch(g, { type: 'slotOrder', playerId: 0, cardId: priest!, slotIndex: 0 } as Command).ok).toBe(true);
    expect(cards(player.statecraft.slots)).toEqual([priest, null, MIXED]);
  });

  it('answers the fit a card put in an emptied chair is held to', () => {
    const g = game();
    const [priest, scribe] = cardsOf('civic', 2);
    council(g.state, 'chiefdom', [priest!, scribe!, MIXED]);
    // Emptying the card's own chair narrows the fit; emptying another does not.
    expect(chairFitWithout(g.state, 0, 2)).toBe(orderFitsSlot);
    expect(chairFitWithout(g.state, 0, 0)(scribe!, 'military')).toBe(true);
    // Without the card, emptying a chair never widens the fit.
    council(g.state, 'chiefdom', [null, null, null]);
    expect(chairFitWithout(g.state, 0, 0)).toBe(orderFitsSlot);
  });
});

// --- the card's own type (reading 18) ------------------------------------------

describe('a card still counts as its own type', () => {
  it('in the signatures and in The Golden Bull’s council in order', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    const [trader] = cardsOf('economic', 1);
    const player = council(g.state, 'chiefdom', [priest!, trader!, MIXED]);
    // The civic card sits in the military chair and still counts as civic.
    expect(slottedOrdersOfFlavour(g.state, 0, 'military')).toBe(0);
    expect(slottedOrdersOfFlavour(g.state, 0, 'civic')).toBe(1);
    expect(slottedOrdersOfFlavour(g.state, 0, 'economic')).toBe(1);
    // So the military chair does not hold a card of its own type.
    expect(councilInOrder(player)).toBe(false);
  });
});

// --- an adoption ------------------------------------------------------------------

describe('an adoption under The Mixed Constitution', () => {
  it('re-seats every card while chairs remain, by the fit the old council granted', () => {
    const priests = cardsOf('civic', 3);
    const [trader] = cardsOf('economic', 1);
    const [wild] = cardsOf('wildcard', 1);
    // Tyranny (M, M, M, E, W) becomes the Theocracy (M, C, C, C, W).
    expect(slotLayout('tyranny')).toEqual(['military', 'military', 'military', 'economic', 'wildcard']);
    expect(slotLayout('theocracy')).toEqual(['military', 'civic', 'civic', 'civic', 'wildcard']);
    const adopt = (last: OrderId): { slots: (OrderId | null)[]; returned: OrderId[] } => {
      const g = game();
      const player = council(g.state, 'tyranny', [...priests, trader!, last]);
      player.statecraft.pendingGovernment = { tier: 10, options: ['theocracy'] };
      const adoption = adoptGovernmentAt(g.state, player, 0)!;
      expect(adoption).not.toBeNull();
      return { slots: cards(player.statecraft.slots), returned: adoption.returned };
    };
    // With the card in the Wildcard chair, every card keeps its chair.
    const wide = adopt(MIXED);
    expect(wide.slots).toEqual([...priests, trader, MIXED]);
    expect(wide.returned).toEqual([]);
    // With another Wildcard card there, the plain rule moves the first civic
    // card to the free Civic chair and returns the economic card.
    const plain = adopt(wild!);
    expect(plain.slots).toEqual([null, priests[1], priests[2], priests[0], wild]);
    expect(plain.returned).toEqual([trader]);
  });

  it('re-seats by the plain rule at once when the card finds no chair in the new council', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    const [first, second] = cardsOf('military', 2);
    const [trader, factor] = cardsOf('economic', 2);
    // Imperium (M, M, M, E, E, C, W, W) becomes War Chief (M, M, E, C, W). The
    // card sat in the eighth chair, which War Chief does not have, and the one
    // Wildcard chair left keeps the economic card already in it.
    const player = council(g.state, 'imperium', [priest!, first!, second!, trader!, factor!, null, null, MIXED]);
    expect(chairFitFor(g.state, 0)(priest!, 'military')).toBe(true);
    player.statecraft.pendingGovernment = { tier: 4, options: ['warChief'] };
    const adoption = adoptGovernmentAt(g.state, player, 0)!;
    expect(slotTypesOf(player.statecraft)).toEqual(['military', 'military', 'economic', 'civic', 'wildcard']);
    // Then the plain rule: the military card and the economic card in chairs
    // that fit them stay, and the other three move to chairs of their own type.
    expect(cards(player.statecraft.slots)).toEqual([second, first, trader, priest, factor]);
    expect(adoption.reseated).toEqual([priest, first, second, trader, factor]);
    expect(adoption.returned).toEqual([MIXED]);
    expect(player.statecraft.orders).toContain(MIXED);
    expect(plainlySeated(player)).toBe(true);
    expect(chairFitFor(g.state, 0)).toBe(orderFitsSlot);
  });

  it('settles the council before the moment pays and the Doctrine offer is drawn', () => {
    const adopt = bodyOf('sim/statecraft/draft.ts', 'adoptGovernmentAt');
    const fit = adopt.indexOf('const fit = chairFitFor(state, player.id);');
    const government = adopt.indexOf('sc.government = id;');
    const reseat = adopt.indexOf('reseatCouncil(player, previous, state.turn, fit)');
    const settle = adopt.indexOf('settleCouncilFit(state, player)');
    const triumph = adopt.indexOf("awardOccasion(state, player.id, 'governmentAdopted')");
    expect(fit).toBeGreaterThan(0);
    expect(government).toBeGreaterThan(fit);
    expect(reseat).toBeGreaterThan(government);
    expect(settle).toBeGreaterThan(reseat);
    expect(triumph).toBeGreaterThan(settle);
  });
});

// --- leaving the chair --------------------------------------------------------------

describe('when the card leaves its chair, the council is re-seated at once', () => {
  it('by the unslot command: a misfit moves to a chair that fits it, and a card that stays keeps its seal', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    const [trader] = cardsOf('economic', 1);
    const turn = g.state.turn;
    const player = council(g.state, 'chiefdom', [sitting(priest!, turn + 5), sitting(trader!, turn + 5), MIXED]);
    expect(dispatch(g, { type: 'unslotOrder', playerId: 0, slotIndex: 2 } as Command).ok).toBe(true);
    // The civic card fits no chair of its own type in the chiefdom, so it takes
    // the Wildcard chair the card left, and its seal is lifted.
    expect(cards(player.statecraft.slots)).toEqual([null, trader, priest]);
    expect(sealRemaining(g.state, player.statecraft.slots[2]!)).toBe(0);
    // The economic card never moved and keeps its seal.
    expect(player.statecraft.slots[1]!.sealedUntil).toBe(turn + 5);
    expect(player.statecraft.orders).toContain(MIXED);
    expect(plainlySeated(player)).toBe(true);
  });

  it('by the unslot command: a card that fits no free chair goes back to the collection', () => {
    const g = game();
    const [priest, scribe] = cardsOf('civic', 2);
    const player = council(g.state, 'chiefdom', [priest!, scribe!, MIXED]);
    player.statecraft.tallies.push({ card: scribe!, count: 3 });
    bumpRevision(g.state);
    expect(dispatch(g, { type: 'unslotOrder', playerId: 0, slotIndex: 2 } as Command).ok).toBe(true);
    // The first civic card, in the old seat order, takes the Wildcard chair.
    expect(cards(player.statecraft.slots)).toEqual([null, null, priest]);
    expect(player.statecraft.orders).toContain(scribe);
    expect(player.statecraft.tallies).toContainEqual({ card: scribe!, count: 3 });
  });

  it('does nothing when another card leaves, or when the unslot is refused', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    const [trader] = cardsOf('economic', 1);
    const player = council(g.state, 'chiefdom', [priest!, trader!, sitting(MIXED, g.state.turn + 5)]);
    // Sealed: refused, and nothing moves.
    const before = snapshotState(g.state);
    expect(dispatch(g, { type: 'unslotOrder', playerId: 0, slotIndex: 2 } as Command).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
    // Another card leaving keeps the fit wide, so the civic card stays put.
    expect(dispatch(g, { type: 'unslotOrder', playerId: 0, slotIndex: 1 } as Command).ok).toBe(true);
    expect(cards(player.statecraft.slots)).toEqual([priest, null, MIXED]);
  });

  it('gives the same board twice from the same unslot', () => {
    const run = (): string => {
      const g = game();
      const [priest, scribe] = cardsOf('civic', 2);
      const [first] = cardsOf('military', 1);
      council(g.state, 'imperium', [priest!, first!, scribe!, null, null, null, MIXED, null]);
      expect(dispatch(g, { type: 'unslotOrder', playerId: 0, slotIndex: 6 } as Command).ok).toBe(true);
      return snapshotState(g.state);
    };
    expect(run()).toBe(run());
  });

  it('when a malice takes its chair', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    // Which chair the malice will take: asked of a copy of the same board, so
    // the draw is the one the real board makes.
    const probe = restoreState(snapshotState(g.state));
    council(probe, 'imperium', [null, null, null, null, null, null, null, null]);
    const chair = takeMalice(probe, playerById(probe, 0)!, 3)!.chair;
    expect(chair).not.toBeNull();
    expect(chair).not.toBe(0);
    // The card sits in that chair, a civic card in the first military chair.
    const chairs: (OrderId | null)[] = [priest!, null, null, null, null, null, null, null];
    chairs[chair!] = MIXED;
    const player = council(g.state, 'imperium', chairs);
    const seating = takeMalice(g.state, player, 3)!;
    expect(seating.chair).toBe(chair);
    expect(seating.displaced).toBe(MIXED);
    expect(maliceAt(player, chair!)).toBe(seating.id);
    // The civic card moved to the Civic chair, the sixth.
    expect(cards(player.statecraft.slots)[5]).toBe(priest);
    expect(cards(player.statecraft.slots)[0]).toBeNull();
    expect(plainlySeated(player)).toBe(true);
  });

  it('but not when a malice takes another card’s chair', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    const [first] = cardsOf('military', 1);
    const probe = restoreState(snapshotState(g.state));
    council(probe, 'imperium', [null, null, null, null, null, null, null, null]);
    const chair = takeMalice(probe, playerById(probe, 0)!, 3)!.chair!;
    // Another card sits where the malice will sit, and the card in a Wildcard
    // chair the malice does not take.
    const chairs: (OrderId | null)[] = [priest!, null, null, null, null, null, null, null];
    chairs[chair] = first!;
    const free = [6, 7].find((index) => index !== chair)!;
    chairs[free] = MIXED;
    const player = council(g.state, 'imperium', chairs);
    const seating = takeMalice(g.state, player, 3)!;
    expect(seating.displaced).toBe(first);
    expect(cards(player.statecraft.slots)[0]).toBe(priest);
    expect(cards(player.statecraft.slots)[free]).toBe(MIXED);
  });

  it('when a council that shrinks closes its chair', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    const [trader] = cardsOf('economic', 1);
    // The chiefdom's three chairs and a fourth no law opens any more.
    const player = council(g.state, 'chiefdom', [priest!, trader!, null, MIXED]);
    const returned = refitSlots(g.state, player);
    expect(returned).toEqual([MIXED]);
    expect(cards(player.statecraft.slots)).toEqual([null, trader, priest]);
    expect(plainlySeated(player)).toBe(true);
  });

  it('but not when a commission leaves its chair', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    // Imperium, the civic card in the first military chair, the card and
    // Commission: The Roll of the Senate in the two Wildcard chairs, and ten
    // Orders held, so the commission is met.
    const player = council(g.state, 'imperium', [priest!, null, null, null, null, null, MIXED, ROLL]);
    for (const id of cardsOf('economic', 8)) {
      if (!player.statecraft.orders.includes(id)) player.statecraft.orders.push(id);
    }
    bumpRevision(g.state);
    expect(player.statecraft.orders.length).toBeGreaterThanOrEqual(10);
    const reports = runCommissions(g.state);
    expect(reports.map((report) => report.card)).toEqual([ROLL]);
    expect(commissionFulfilledTurn(player.statecraft, ROLL)).toBe(g.state.turn);
    // The council keeps its shape, and a ninth chair opened.
    expect(cards(player.statecraft.slots)).toEqual([priest, null, null, null, null, null, MIXED, null, null]);
  });
});

// --- the pure answer -------------------------------------------------------------

describe('councilRefit', () => {
  it('answers nothing while every seated card fits, and changes nothing it is asked about', () => {
    const g = game();
    const [priest] = cardsOf('civic', 1);
    const [trader] = cardsOf('economic', 1);
    council(g.state, 'chiefdom', [priest!, trader!, MIXED]);
    expect(councilRefit(g.state, 0)).toBeNull();
    // Without the card, by hand: the civic card misfits.
    const player = council(g.state, 'chiefdom', [priest!, trader!, null]);
    const before = snapshotState(g.state);
    const refit = councilRefit(g.state, 0)!;
    expect(cards(refit.slots)).toEqual([null, trader, priest]);
    expect(refit.returned).toEqual([]);
    expect(snapshotState(g.state)).toBe(before);
    expect(cards(player.statecraft.slots)).toEqual([priest, trader, null]);
  });
});

// --- the register, read off the source -------------------------------------------

const SOURCES = import.meta.glob(['../../../src/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** A file's code with its comments taken out. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

/** The body of a top-level function in a file under `src/`: its signature to its closing brace. */
function bodyOf(file: string, name: string): string {
  const text = code(SOURCES[`../../../src/${file}`] ?? '');
  return new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`).exec(text)?.[0] ?? '';
}

/** A write of a seat's chairs: `slateRegister.test.ts`' pattern for the `slots` field, with `pop` and `shift` added. */
const SLOTS_WRITE = /\.slots\[[^\]]*\]\s*=[^=]|\.slots\s*=[^=]|\.slots\.(push|splice|pop|shift)\(/;

const FUNCTION_START =
  /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/;

/** Every function under `src/sim/` that writes a seat's chairs, as `file#function`. */
function chairWriters(): string[] {
  const found = new Set<string>();
  for (const [path, text] of Object.entries(SOURCES)) {
    if (!path.startsWith('../../../src/sim/')) continue;
    const file = path.replace('../../../src/sim/', '').replace(/^.*\//, '');
    const lines = code(text).split('\n');
    lines.forEach((line, index) => {
      if (!SLOTS_WRITE.test(line)) return;
      for (let back = index; back >= 0; back--) {
        const match = FUNCTION_START.exec(lines[back]!);
        if (match) {
          found.add(`${file}#${match[1] ?? match[2]}`);
          return;
        }
      }
    });
  }
  return [...found].sort();
}

describe('the register of chair writers', () => {
  /**
   * Every function that writes a seat's chairs either re-seats the council
   * when the fit narrows (`settleCouncilFit` in its own body) or says here why
   * it need not. A new writer fails until it is one or the other.
   */
  const SETTLES = [
    'commissions.ts#runCommissions',
    'draft.ts#adoptGovernmentAt',
    'draft.ts#refitSlots',
    'draft.ts#seatMalice',
  ];
  const EXCUSED: Record<string, string> = {
    'draft.ts#settleCouncilFit': 'it is the re-seating',
    'draft.ts#slotOrderAt': 'a card going into a chair never narrows the fit',
    'draft.ts#unslotOrderAt':
      'it takes no state, so the unslot command (`applyUnslotOrder`) settles beside it, checked below',
    'draft.ts#reseatCouncil':
      'it writes the council it is handed: `adoptGovernmentAt` settles after it, ' +
      'and the card stamp refits its ghost (`councilRefit`)',
  };

  it('names every writer, and each one settles or is excused', () => {
    const writers = chairWriters();
    expect(writers).toEqual([...SETTLES, ...Object.keys(EXCUSED)].sort());
    for (const writer of SETTLES) {
      const [file, name] = writer.split('#') as [string, string];
      const path = file === 'commissions.ts' ? 'sim/commissions.ts' : 'sim/statecraft/draft.ts';
      expect(bodyOf(path, name), writer).toContain('settleCouncilFit(state, player)');
    }
    expect(bodyOf('sim/commands.ts', 'applyUnslotOrder')).toContain('settleCouncilFit(state, actor)');
  });

  it('asks the plain rule directly only where no seat stands behind the question', () => {
    // The rule's own module, the fit's module (where the plain rule is the
    // answer without the card, and the re-seating's default), the staging's
    // ordering by the plain rule, and the flair gallery's sample cards.
    // Everything else asks `chairFitFor`.
    const readers = Object.entries(SOURCES)
      .filter(([, text]) => /\borderFitsSlot\b/.test(code(text)))
      .map(([path]) => path.replace('../../../src/', ''))
      .sort();
    expect(readers).toEqual([
      'flairGallery/cardFaces.ts',
      'sim/statecraft/draft.ts',
      'sim/statecraftData.ts',
      'ui/statecraftStaging.ts',
    ]);
    expect(bodyOf('sim/statecraft/draft.ts', 'slotOrderError')).toContain('chairFitFor(state, playerId)');
    expect(bodyOf('sim/statecraft/draft.ts', 'slotOrderError')).not.toMatch(/\borderFitsSlot\b/);
  });

  it('moves every caller the triage names to the seat’s fit', () => {
    const screen = code(SOURCES['../../../src/ui/statecraftScreen.ts']!);
    expect(screen).toContain('stagedFit(state, seat, arrangement)');
    expect(screen).toContain('councilDiff(state, seat, arrangement)');
    expect(screen).not.toMatch(/\bdiff\(/);
    const bot = code(SOURCES['../../../src/ai/bot.ts']!);
    expect(bot.match(/chairFitFor\(state, player\.id\)/g)).toHaveLength(3);
    expect(bot).toContain('chairFitWithout(state, player.id, slot)');
    expect(code(SOURCES['../../../src/ai/value.ts']!)).toContain('chairFor(sc, id, chairFitFor(state, playerId))');
    const impact = code(SOURCES['../../../src/sim/cardImpact.ts']!);
    expect(impact).toContain('const fit = chairFitFor(state, player.id);');
    expect(impact).toContain('councilRefit(without, player.id)');
  });
});
