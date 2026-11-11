/**
 * **Batch DS9: the three changes outside the cards** (`docs/flags.md` items
 * (hhhhhhh) and (jjjjjjj); the spec is
 * `docs/plans/deck-simplification-2026-11-10.md`, "Changes outside the cards").
 *
 * What this file pins:
 *
 *   1. the Chiefdom's three chairs are all Wildcard chairs, so every card the
 *      first drafts deal fits every first chair, a bot seats its first cards,
 *      and the first adoption re-seats a full council;
 *   2. a charter technology costs the ordinary price: the same as an ordinary
 *      technology in its column (the price list's own tests are in
 *      `test/sim/charterTechs.test.ts`);
 *   3. The Second Reading is dealt in Tier 0 and in Tier I, and in no later
 *      tier, and the Magisterial sheet says so.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import { type Game } from '../../src/sim/game';
import { type Player, bumpRevision, playerById } from '../../src/sim/state';
import { explainTechCost, foldTechCost } from '../../src/sim/tech';
import { currentBandOf, eligibleFor, newPlayerStatecraft } from '../../src/sim/statecraft/draft';
import { slotOrderError, slotTypesOf } from '../../src/sim/statecraft';
import {
  type OrderId,
  DECK_IDS,
  STARTING_GOVERNMENT,
  governmentDef,
  orderDef,
  ordersForDecks,
  slotLayout,
} from '../../src/sim/statecraftData';
import { CHARTER_TECH_IDS, TECH_IDS, techColumn, techDef } from '../../src/sim/techData';
import { createGame } from './newGameHelpers';
import { researchingGame } from './techHelpers';

const SECOND_READING = 'theSecondReading' as OrderId;

/** A duel with a Magisterial seat, for the deal. */
function seated(): Game {
  return createGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, decks: ['magisterial', 'commerce'] },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

// --- 1. the Chiefdom's chairs ----------------------------------------------------

describe('the Chiefdom’s three Wildcard chairs (batch DS9)', () => {
  it('lays out three Wildcard chairs, and nothing else', () => {
    expect(STARTING_GOVERNMENT).toBe('chiefdom');
    expect(governmentDef('chiefdom').chairMix).toEqual({ military: 0, economic: 0, civic: 0, wildcard: 3 });
    expect(slotLayout('chiefdom')).toEqual(['wildcard', 'wildcard', 'wildcard']);
    expect(slotTypesOf(newPlayerStatecraft())).toEqual(['wildcard', 'wildcard', 'wildcard']);
  });

  it('lets every card the shelf deals sit in every first chair', () => {
    const g = seated();
    const player = playerById(g.state, 0)!;
    for (const id of ordersForDecks(DECK_IDS)) {
      if (orderDef(id).charter !== undefined) continue;
      const sc = player.statecraft;
      if (!sc.orders.includes(id)) sc.orders.push(id);
      for (let chair = 0; chair < 3; chair++) {
        const refusal = slotOrderError(g.state, 0, id, chair);
        // A Boon takes no chair (batch DS8); every other card fits.
        if (refusal !== null) expect(refusal, `${id} in chair ${chair + 1}`).not.toMatch(/chair \d is an? \w+ chair/);
      }
      sc.orders = sc.orders.filter((held) => held !== id);
    }
  });

  it('re-seats a full council of three into the first government’s chairs', () => {
    const g = seated();
    const player = playerById(g.state, 0)!;
    const sc = player.statecraft;
    // Three Civic cards fill the chiefdom: a council the old typed chairs could
    // not hold. The Priest-King has two Civic chairs and a Wildcard chair.
    const civic = ordersForDecks(DECK_IDS)
      .filter((id) => orderDef(id).type === 'civic' && orderDef(id).charter === undefined)
      .slice(0, 3);
    expect(civic).toHaveLength(3);
    for (const [chair, id] of civic.entries()) {
      sc.orders.push(id);
      const result = applyCommand(g.state, { type: 'slotOrder', playerId: 0, cardId: id, slotIndex: chair });
      expect(result.ok, result.ok ? '' : result.error).toBe(true);
    }
    sc.pendingGovernment = { tier: 4, options: ['priestKing'] };
    bumpRevision(g.state);
    expect(applyCommand(g.state, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 }).ok).toBe(true);
    expect(slotTypesOf(sc)).toEqual(['military', 'economic', 'civic', 'civic', 'wildcard']);
    // Two keep a Civic chair and the third moves to the Wildcard chair: no
    // card goes back to the collection.
    const seatedNow = sc.slots.map((slot) => slot?.card ?? null).filter((card) => card !== null);
    expect([...seatedNow].sort()).toEqual([...civic].sort());
  });
});

// --- 2. the charter price ----------------------------------------------------------

describe('a charter technology costs the ordinary price (batch DS9)', () => {
  it('costs what an ordinary technology in its column costs', () => {
    const g = researchingGame();
    const player: Player = playerById(g.state, 0)!;
    for (const id of CHARTER_TECH_IDS) {
      const column = techColumn(id);
      const ordinary = TECH_IDS.find((other) => techDef(other).charter !== true && techColumn(other) === column);
      const price = foldTechCost(explainTechCost(g.state, player, id));
      expect(price, id).toBe(techDef(id).cost);
      if (ordinary !== undefined) {
        expect(price, `${id} against ${ordinary}`).toBe(foldTechCost(explainTechCost(g.state, player, ordinary)));
      }
    }
  });
});

// --- 3. The Second Reading in two tiers -------------------------------------------

describe('The Second Reading in Tier 0 and Tier I (batch DS9)', () => {
  it('carries Tier 0 and a last tier of Tier I', () => {
    const def = orderDef(SECOND_READING);
    expect([def.band, def.lastBand]).toEqual([0, 1]);
    expect(def.retired).toBeUndefined();
  });

  it('is dealt in bands 0 and 1 and in no other band', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const bands = new Set<number>();
    for (let drafts = 0; drafts <= 30; drafts++) {
      const band = currentBandOf(ada, drafts);
      bands.add(band);
      const dealtHere = eligibleFor(g.state, ada, drafts).includes(SECOND_READING);
      expect(dealtHere, `band ${band}, ${drafts} drafts`).toBe(band === 0 || band === 1);
    }
    expect([...bands].sort()).toEqual([0, 1, 2, 3, 4]);
    // A held card is never dealt again.
    ada.statecraft.orders.push(SECOND_READING);
    bumpRevision(g.state);
    expect(eligibleFor(g.state, ada, 4).includes(SECOND_READING)).toBe(false);
  });

  it('is named on the Magisterial sheet as also dealt in Tier I', () => {
    const sheet = (
      import.meta.glob('../../docs/decks/magisterial.md', { query: '?raw', import: 'default', eager: true }) as Record<
        string,
        string
      >
    )['../../docs/decks/magisterial.md']!;
    const also = [...sheet.matchAll(/^\*\*(.+?)\*\* is also dealt in Tier (0|I|II|III|IV)\b/gm)].map((match) => [
      match[1],
      match[2],
    ]);
    expect(also).toEqual([['The Second Reading', 'I']]);
  });
});
