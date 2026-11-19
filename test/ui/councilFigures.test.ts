/**
 * **One reading for a card's figures** (stage 2 of the Council and In play
 * board; `docs/plans/ui-critique-2026-10-16.md`, "After the Council screen
 * landed: figures and drag"). The core tier checks every fortieth live Order;
 * `councilFigures.slow.test.ts` checks every one.
 *
 * The rule, on a mid game the bots played: a card's plate is the totals with
 * it less the totals without it, each rounded as the line prints it; the
 * council without a card is the council less that card's stamp, to the last
 * digit; a chip is the difference of two totals, and the same board on both
 * sides is no change; and the council's happiness and authority are the
 * meters' own figures on the board with the council less the board without.
 */
import { describe, expect, it } from 'vitest';

import { cardImpactWorlds } from '../../src/sim/cardImpact';
import { authorityOf, happinessOf } from '../../src/sim/meters';
import { playerById } from '../../src/sim/state';
import { roundYield } from '../../src/sim/yieldFormat';
import { COUNCIL_VOICES, councilChange, councilPlate, explainCouncil, foldImpactVoices } from '../../src/ui/councilTotals';
import { remove, stage } from '../../src/ui/statecraftStaging';
import { checkCard, liveOrders, midGame } from './councilFiguresHelpers';
import { explainCardImpact } from '../../src/sim/cardImpact';

const SEAT = 0;

describe('one reading for a card’s plate, its chip and the totals', () => {
  it('makes each plate what the totals lose when the card leaves, for every fortieth live Order', () => {
    const state = midGame();
    const before = foldImpactVoices(explainCouncil(state, SEAT));
    const sample = liveOrders().filter((_, index) => index % 40 === 0);
    let checked = 0;
    for (const id of sample) {
      const check = checkCard(state, SEAT, id, before);
      if (check === null) continue;
      checked += 1;
      expect(check.identityMiss, id).toBeLessThan(1e-6);
      for (const voice of COUNCIL_VOICES) expect(check.plate[voice], `${id} ${voice}`).toBe(check.totalsMoved[voice]);
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('checks the cards the seat has seated, its Doctrines and its government the same way', () => {
    const state = midGame();
    const sc = playerById(state, SEAT)!.statecraft;
    const council = foldImpactVoices(explainCouncil(state, SEAT));
    const subjects = [
      ...sc.slots.flatMap((slot) => (slot === null ? [] : [{ kind: 'order' as const, id: slot.card }])),
      ...sc.doctrines.map((id) => ({ kind: 'doctrine' as const, id: id as never })),
      { kind: 'government' as const, id: sc.government },
    ];
    expect(subjects.length).toBeGreaterThan(1);
    for (const subject of subjects) {
      const worlds = cardImpactWorlds(state, SEAT, subject)!;
      expect(worlds.with, subject.kind).toBe(state);
      const without = foldImpactVoices(explainCouncil(worlds.without, SEAT));
      const own = foldImpactVoices(explainCardImpact(state, SEAT, subject));
      const plate = councilPlate(council, explainCardImpact(state, SEAT, subject));
      for (const voice of COUNCIL_VOICES) {
        expect(Math.abs(council[voice] - without[voice] - own[voice]), `${subject.kind} ${voice}`).toBeLessThan(1e-6);
        const shown = roundYield(council[voice]) - roundYield(without[voice]);
        expect(plate.find((figure) => figure.voice === voice)?.amount ?? 0, `${subject.kind} ${voice}`).toBe(shown);
      }
    }
  });

  it('makes a chip the difference of two totals, and the same board no change', () => {
    const state = midGame();
    const sc = playerById(state, SEAT)!.statecraft;
    const live = stage(sc.slots);
    for (const voice of COUNCIL_VOICES) expect(councilChange(state, SEAT, live, live)[voice], voice).toBe(0);
    // Each seated card, taken out and put back: the chip that puts it back is
    // its plate, and the chip that takes it out is the same figure negated.
    const council = foldImpactVoices(explainCouncil(state, SEAT));
    let tried = 0;
    sc.slots.forEach((slot, index) => {
      if (slot === null) return;
      const out = remove(live, index);
      const chipIn = councilChange(state, SEAT, out, live);
      const chipOut = councilChange(state, SEAT, live, out, council);
      const plate = councilPlate(council, explainCardImpact(state, SEAT, { kind: 'order', id: slot.card }));
      for (const voice of COUNCIL_VOICES) {
        expect(chipIn[voice] + chipOut[voice], `${slot.card} ${voice}`).toBe(0);
        expect(chipIn[voice], `${slot.card} ${voice}`).toBe(plate.find((figure) => figure.voice === voice)?.amount ?? 0);
      }
      tried += 1;
    });
    expect(tried, 'the staged game has a seated card').toBeGreaterThan(0);
  });

  it('reads the council’s happiness and authority off the meters themselves, every card credited', () => {
    // A card whose effect the rules fold into a line no card owns (a share on
    // the luxuries, a city's writ cut) is in this difference all the same.
    const state = midGame();
    const council = foldImpactVoices(explainCouncil(state, SEAT));
    const without = cardImpactWorlds(state, SEAT, { kind: 'council' })!.without;
    expect(Math.abs(happinessOf(state, SEAT) - happinessOf(without, SEAT) - council.happiness)).toBeLessThan(0.11);
    expect(Math.abs(authorityOf(state, SEAT) - authorityOf(without, SEAT) - council.authority)).toBeLessThan(0.11);
  });
});
