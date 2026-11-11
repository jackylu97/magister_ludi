/**
 * **The four card keywords** (batch DS8, `docs/plans/deck-simplification-2026-11-10.md`,
 * "Keywords"; `docs/flags.md` item (hhhhhhh)).
 *
 * The user, 2026-11-10: *"lets change 'grower' to scaler. The keyword should
 * show on the card, and can be moused over regardless of how many times
 * they've seen it."* This file holds the simulation's half:
 *
 *   1. **Which card carries which keyword is read off its data**, never off its
 *      name or its `text`: a commission has a goal and a reward, a charter opens
 *      a thing and takes no chair, a Boon's whole effect is a grant paid when it
 *      is drafted, and a Scaler gains a stored amount while it is seated.
 *   2. **The keyword is the card's first clause**, and the sentences after it no
 *      longer repeat the standing rule the keyword's tooltip states.
 *   3. **A Scaler's value** is its starting value plus one gain for each helping
 *      of its tally, which is the figure its face prints.
 *   4. **A Boon takes no chair**: the chair refuses it, as it refuses a charter.
 *   5. **A strength line says the side of the fight** it pays on.
 *
 * The interface's half (the face, the tooltip on hover and on focus, the
 * Compendium pages) is `test/ui/cardKeywords.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { DOCTRINE_IDS, ORDER_IDS, type OrderId, doctrineDef, orderDef, orderKeyword, isBoon, scalerShape } from '../../src/sim/statecraftData';
import {
  combatSideWords,
  describeCard,
  keywordMark,
  recordScalingOccasion,
  scalerFigures,
  slotOrderError,
  stripRefs,
  tallyOf,
} from '../../src/sim/statecraft';
import { applyCommand } from '../../src/sim/commands';
import { bumpRevision, playerById } from '../../src/sim/state';
import { game } from './statecraftHelpers';

const LIVE = ORDER_IDS.filter((id) => orderDef(id).retired !== true);

/** The plain words of a card's clauses. */
const said = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));

/** Hands a card to seat 0's collection, the way a draft would. */
function hold(id: OrderId): ReturnType<typeof game> {
  const g = game();
  const sc = playerById(g.state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  bumpRevision(g.state);
  return g;
}

describe('which card carries which keyword', () => {
  it('reads each keyword off the row’s own data', () => {
    for (const id of ORDER_IDS) {
      const def = orderDef(id);
      const keyword = orderKeyword(id);
      const tally = def.effects.some((effect) => effect.kind === 'pays' && effect.count === 'tally');
      const boon = (def.onDraft?.length ?? 0) > 0 && def.effects.length === 0 && def.onSlot === undefined;
      const expected =
        def.commission !== undefined
          ? 'commission'
          : def.charter !== undefined
            ? 'charter'
            : boon
              ? 'boon'
              : tally
                ? 'scaler'
                : null;
      expect(keyword, id).toBe(expected);
    }
  });

  it('gives every keyword at least one live card, and leaves most cards plain', () => {
    const counts = new Map<string, number>();
    for (const id of LIVE) {
      const keyword = orderKeyword(id) ?? 'none';
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
    for (const keyword of ['commission', 'charter', 'scaler', 'boon']) {
      expect(counts.get(keyword) ?? 0, keyword).toBeGreaterThan(0);
    }
    expect(counts.get('none') ?? 0).toBeGreaterThan(LIVE.length / 2);
  });

  it('settles the three cards whose text and data disagreed in batches DS4 and DS7', () => {
    // The Senate Charter takes a chair, and its Assembly Hall works only while
    // it is seated, so it is no Charter and carries no keyword.
    expect(orderKeyword('theSenateCharter' as OrderId)).toBeNull();
    expect(orderDef('theSenateCharter' as OrderId).text).not.toMatch(/^Charter\. /);
    // The Great Loan is still a commission in its data (the on-draft grant has
    // no arm for twenty turns of income, nor for a timed loss), so it carries
    // the keyword its data is: Commission, not Boon.
    expect(orderKeyword('theGreatLoan' as OrderId)).toBe('commission');
    // The Captured Arms counts kills over the whole game, seated or not. A
    // Scaler counts only while seated, so it is not one.
    expect(orderKeyword('theCapturedArms' as OrderId)).toBeNull();
  });

  it('gives a Doctrine no keyword: none has a goal, a charter, a draft grant or a tally', () => {
    for (const id of DOCTRINE_IDS) {
      const def = doctrineDef(id) as unknown as Record<string, unknown>;
      expect(def.commission, id).toBeUndefined();
      expect(def.charter, id).toBeUndefined();
      expect(def.onDraft, id).toBeUndefined();
      const effects = doctrineDef(id).effects;
      expect(effects.some((effect) => effect.kind === 'pays' && effect.count === 'tally'), id).toBe(false);
    }
  });

  it('keeps the keyword out of every live row’s text, since the card face prints it', () => {
    // A retired row keeps the text it was retired with, for saves and the
    // Compendium, so only the live rows are asked.
    for (const id of LIVE) {
      expect(orderDef(id).text, id).not.toMatch(/^(Commission|Charter|Scaler|Boon)\. /);
    }
  });
});

describe('the keyword on the card', () => {
  it('is the first clause of every keyword card, and of no plain card', () => {
    for (const id of ORDER_IDS) {
      const keyword = orderKeyword(id);
      const first = describeCard(id)[0];
      if (keyword === null) {
        expect(describeCard(id).some((clause) => clause.keyword !== undefined), id).toBe(false);
        continue;
      }
      expect(first, id).toEqual({ text: keywordMark(keyword), keyword });
      expect(describeCard(id).filter((clause) => clause.keyword !== undefined), id).toHaveLength(1);
    }
    expect(keywordMark('scaler')).toBe('[[concept:scaler|Scaler]]');
  });

  it('carries the standing rule, so no sentence after it repeats one', () => {
    const standing = [
      'while this card is seated',
      'leaves its chair',
      'this card takes no chair',
      'seated, this card does nothing',
      'counted while this Order is seated',
      'once drafted',
      'only an empire holding this charter',
    ];
    for (const id of ORDER_IDS) {
      if (orderKeyword(id) === null) continue;
      for (const line of said(id)) {
        for (const words of standing) expect(line, `${id}: ${line}`).not.toContain(words);
      }
    }
  });

  it('says a commission as "Goal: … Reward: …", with a timed reward’s turns kept', () => {
    expect(said('dominionClearTheFrontier' as OrderId)).toEqual([
      'Commission',
      'Goal: clear 2 barbarian camps. Reward: a great general to call',
    ]);
    // A lasting reward says no "for the rest of the game".
    expect(said('dominionTheFirstProvince' as OrderId)[1]).toBe(
      'Goal: capture 1 city. Reward: +5 food, +5 gold in every captured city',
    );
    // A timed reward says its turns.
    expect(said('dominionHoldTheCapitals' as OrderId)[1]).toContain('Reward: for 20 turns, +25% production in every city');
  });

  it('says a charter as what it opens', () => {
    expect(said('theFishTraps' as OrderId)).toEqual(['Charter', 'opens the Fish Traps for your workers to build']);
    expect(said('theGlassmakersCharter' as OrderId).slice(0, 2)).toEqual(['Charter', 'opens Optics for you to research']);
    expect(said('theFast' as OrderId)[1]).toMatch(/^your cities may keep Rite of Fasting: /);
  });

  it('says a Boon as "On draft: …"', () => {
    expect(said('theFirstCaravan' as OrderId)).toEqual(['Boon', 'On draft: a Trader joins you in your capital']);
    expect(said('theFirstOffering' as OrderId)).toEqual(['Boon', 'On draft: +25 faith']);
  });

  it('says a Scaler as "Gains … each time …", with no starting value and the cap kept', () => {
    // The starting value (+2 science, +2 culture) is the figure, not a sentence.
    expect(said('theGatheringHost' as OrderId)).toEqual([
      'Scaler',
      'Gains +1 science and +1 culture each time you gain a military unit',
    ]);
    expect(said('theStrongbox' as OrderId)[1]).toBe(
      'Gains +1 science and +1 culture each time you end a turn with at least 300 gold in your treasury, up to +15 each',
    );
    // Two places: the gain in the capital is said first, so "in your capital"
    // cannot be read as true of the gain to the empire.
    expect(said('theCaptiveCraftsmen' as OrderId)[1]).toBe(
      'Gains +1 production in your capital and +1 science each time you pillage a hex',
    );
  });
});

describe('a Scaler’s value', () => {
  it('reads every counted line, and the flat lines that are only its starting value', () => {
    const shape = scalerShape(orderDef('theGatheringHost' as OrderId).effects);
    expect(shape.parts.map((part) => [part.line.to, part.start])).toEqual([
      ['science', 2],
      ['culture', 2],
    ]);
    expect(shape.rows).toEqual([0, 1, 2]);
    // A card with no flat line starts at nought.
    expect(scalerShape(orderDef('theMartyrology' as OrderId).effects).parts.map((part) => part.start)).toEqual([0, 0]);
    // A plain card has no parts.
    expect(scalerShape(orderDef('theCapturedArms' as OrderId).effects).parts).toEqual([]);
  });

  it('starts at its starting value and grows by one gain a helping, up to its cap', () => {
    expect(scalerFigures('theGatheringHost' as OrderId, 0)).toEqual([
      { voice: 'science', value: 2 },
      { voice: 'culture', value: 2 },
    ]);
    expect(scalerFigures('theGatheringHost' as OrderId, 3)).toEqual([
      { voice: 'science', value: 5 },
      { voice: 'culture', value: 5 },
    ]);
    expect(scalerFigures('theStrongbox' as OrderId, 40)).toEqual([
      { voice: 'science', value: 15 },
      { voice: 'culture', value: 15 },
    ]);
  });

  it('reads the seat’s own tally, which grows only while the card is seated', () => {
    const g = hold('theMartyrology' as OrderId);
    const sc = playerById(g.state, 0)!.statecraft;
    sc.slots[0] = { card: 'theMartyrology' as OrderId, sealedUntil: g.state.turn };
    recordScalingOccasion(g.state, 0, 'unitLost');
    recordScalingOccasion(g.state, 0, 'unitLost');
    expect(tallyOf(sc, 'theMartyrology' as OrderId)).toBe(2);
    expect(scalerFigures('theMartyrology' as OrderId, tallyOf(sc, 'theMartyrology' as OrderId))).toEqual([
      { voice: 'faith', value: 4 },
      { voice: 'culture', value: 4 },
    ]);
  });
});

describe('a Boon takes no chair', () => {
  const BOONS = LIVE.filter((id) => orderKeyword(id) === 'boon');

  it('is refused by every chair, in the reducer’s own words', () => {
    expect(BOONS.length).toBeGreaterThan(0);
    for (const id of BOONS) {
      expect(isBoon(id), id).toBe(true);
      const g = hold(id);
      const chairs = playerById(g.state, 0)!.statecraft.slots.length;
      expect(chairs, id).toBeGreaterThan(0);
      for (let index = 0; index < chairs; index++) {
        expect(slotOrderError(g.state, 0, id, index), id).toBe(`${orderDef(id).name} is a Boon and never sits in a chair`);
      }
      const result = applyCommand(g.state, { type: 'slotOrder', playerId: 0, cardId: id, slotIndex: 0 });
      expect(result.ok, id).toBe(false);
    }
  });

  it('leaves a plain card, a commission and a Scaler free to be seated as before', () => {
    // Every chair may still refuse one of them for its type, but never because
    // the card takes no chair.
    for (const keyword of [null, 'commission', 'scaler'] as const) {
      for (const id of LIVE.filter((one) => orderKeyword(one) === keyword)) {
        const g = hold(id);
        const chairs = playerById(g.state, 0)!.statecraft.slots.length;
        for (let index = 0; index < chairs; index++) {
          expect(slotOrderError(g.state, 0, id, index) ?? '', id).not.toContain('never sits in a chair');
        }
      }
    }
  });
});

describe('the side of a fight', () => {
  it('says "when defending" and "when attacking", and leaves both sides alone', () => {
    expect(combatSideWords('both', { test: 'onHills' })).toBe('on hills');
    expect(combatSideWords('defend', { test: 'onHills' })).toBe('when defending on hills');
    expect(combatSideWords('defend', { test: 'always' })).toBe('when defending');
    expect(combatSideWords('attack', { test: 'always' })).toBe('when attacking');
    // A target becomes the attack's object.
    expect(combatSideWords('attack', { test: 'vsCity' })).toBe('when attacking cities');
    // A condition that already says the side is left alone.
    expect(combatSideWords('attack', { test: 'targetWounded' })).toBe('when attacking a wounded unit');
  });

  it('prints The Siege Train’s and The Serried Ranks’ lines with their side', () => {
    expect(said('dominionTheSiegeTrain' as OrderId)).toContain('+5 combat strength for siege units when defending');
    expect(said('theSerriedRanks' as OrderId)).toContain(
      '+10 combat strength for melee units when defending while standing beside melee units',
    );
  });
});
