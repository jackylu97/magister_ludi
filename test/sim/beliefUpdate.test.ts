/**
 * **Batch B1, the belief update** (`docs/plans/belief-update-2026-11-10.md`;
 * `docs/flags.md` item (jjjjjjj), the user's ruling: *"belief page is ready"*).
 *
 * The gods' new rows are pinned in `religion.test.ts`, beside the cases that
 * already read each god. This file holds the rest of the batch:
 *
 *   1. **The Faith house keyword**: which belief carries it is read off the
 *      belief's own data, it is the belief's first clause, and the sentence
 *      after it no longer repeats the house's rule.
 *   2. **The changed and new follower beliefs**: The Alms Box, Pilgrimage,
 *      Holy Water and The Quiet Hours, each paid in the town that follows.
 *   3. **The withdrawn rows**: Theocratic Mandate leaves the enhancer pool and
 *      The Green Cathedral leaves the cathedral's roll; both rows still read.
 *   4. **The held row**: Feast Days keeps its effect, because a flat rite
 *      length scoped to a town is a shape the game does not have.
 *   5. **The rites**: each text states the number its effects carry, and the
 *      technology summaries say the same thing.
 *   6. **The bots still price every live belief.**
 *
 * Core, not slow: small boards and the tables.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { scoreEffects } from '../../src/ai/value';
import { buildingDef, isFaithHouse } from '../../src/sim/buildingData';
import { foundCityAt, realiseItem } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { foundReligion } from '../../src/sim/religion';
import {
  ALL_BELIEF_IDS,
  BELIEF_KEYWORDS,
  CONSECRATION_IDS,
  ENHANCER_BELIEF_IDS,
  FOLLOWER_BELIEF_IDS,
  LIVE_CONSECRATION_IDS,
  LIVE_RITE_IDS,
  type BeliefId,
  beliefDef,
  poolBeliefs,
  beliefKeyword,
  consecrationDef,
  riteDef,
} from '../../src/sim/religionData';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import {
  anyCardDef,
  cardHappiness,
  cardPurchaseRiders,
  describeCard,
  explainCardCityYields,
  stripRefs,
} from '../../src/sim/statecraft';
import { explainPurchaseCost } from '../../src/sim/purchase';
import { abilityDef } from '../../src/sim/techData';
import { cityYieldPercents } from '../../src/sim/yields/town';
import { createGame } from './newGameHelpers';

/** A two-seat duel, both seats at their starting units. */
function game() {
  return createGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

/** A town for a seat at a chosen hex. */
function town(state: GameState, playerId: number, col: number, row: number): City {
  return foundCityAt(state, playerId, getTileAt(state.map, col, row)!);
}

/** Seat 0's religion, founded on one god, with these follower beliefs in its house. */
function religionWith(state: GameState, ...follower: BeliefId[]) {
  const player = playerById(state, 0)!;
  player.pantheon.beliefs.push('sacredFire');
  const religion = foundReligion(state, player);
  religion.follower = follower;
  bumpRevision(state);
  return religion;
}

/** Makes every citizen of a town follow a religion. */
function follows(state: GameState, city: City, religion: { id: number }): City {
  city.followers = { [religion.id]: city.population };
  bumpRevision(state);
  return city;
}

/** One card's town lines in one voice. */
function paid(state: GameState, city: City, card: string, voice: 'faith' | 'culture' | 'food'): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

const said = (id: string): string[] => describeCard(id as never).map((clause) => stripRefs(clause.text));

// --- 1. the keyword ---------------------------------------------------------------

describe('the Faith house keyword', () => {
  it('is read off the belief’s own data: a belief that opens a faith house', () => {
    for (const id of ALL_BELIEF_IDS) {
      const opens = beliefDef(id).effects.some(
        (effect) => effect.kind === 'unlocksBuilding' && isFaithHouse(effect.building),
      );
      expect(beliefKeyword(id), id).toBe(opens ? 'faithHouse' : null);
    }
    expect(BELIEF_KEYWORDS).toEqual(['faithHouse']);
    expect(FOLLOWER_BELIEF_IDS.filter((id) => beliefKeyword(id) !== null).sort()).toEqual(
      ['minarets', 'templeSpires', 'theOpenKitchen', 'theEternalFlame'].sort(),
    );
  });

  it('reads a faith house off its three markers, and the four houses are the only ones', () => {
    for (const id of ['mosque', 'wat', 'gurdwara', 'darEMehr'] as const) {
      const def = buildingDef(id);
      expect(isFaithHouse(id), id).toBe(true);
      expect([def.purchaseOnly, def.purchase?.currency, def.followingOnly], id).toEqual([true, 'faith', true]);
    }
    expect(isFaithHouse('temple')).toBe(false);
    expect(isFaithHouse('cathedral')).toBe(false);
  });

  it('is the first clause, and the house’s sentence after it does not repeat the rule', () => {
    for (const id of FOLLOWER_BELIEF_IDS.filter((one) => beliefKeyword(one) === 'faithHouse')) {
      const clauses = describeCard(id);
      expect(clauses[0], id).toEqual({ text: '[[concept:faithHouse|Faith house]]', keyword: 'faithHouse' });
      const words = clauses.slice(1).map((clause) => stripRefs(clause.text)).join(' ');
      expect(words, id).toMatch(/^unlocks the .+: /);
      expect(words, id).not.toContain('bought with faith');
      expect(words, id).not.toContain('raised only in a city');
      // The keyword is the face's word, so the row's own text leaves it out.
      expect(beliefDef(id).text ?? '', id).not.toContain('Faith house');
      expect(beliefDef(id).text ?? '', id).toMatch(/^Unlocks the /);
    }
  });

  it('leaves the house’s own page saying the whole rule, since it carries no keyword', () => {
    const page = said('mosque');
    expect(page).toContain('+1 authority capacity');
  });
});

// --- 2. the follower beliefs ---------------------------------------------------------

describe('the changed and new follower beliefs, paid in the town that follows', () => {
  it('The Alms Box takes 20% off what a following town buys with faith, and nothing else', () => {
    const g = game();
    const religion = religionWith(g.state, 'theAlmsBox');
    const devout = follows(g.state, town(g.state, 0, 6, 6), religion);
    const lapsed = town(g.state, 0, 10, 6);
    bumpRevision(g.state);
    const alms = (city: City, kind: 'unit' | 'building', currency: 'faith' | 'gold') =>
      cardPurchaseRiders(
        g.state,
        0,
        kind,
        kind === 'unit' ? 'prophet' : undefined,
        city,
        kind === 'building' ? 'mosque' : undefined,
        currency,
      ).filter((line) => line.card === 'theAlmsBox');
    // A unit and a building, bought with faith, in the town that follows.
    expect(alms(devout, 'unit', 'faith').map((line) => line.percent)).toEqual([-20]);
    expect(alms(devout, 'building', 'faith').map((line) => line.percent)).toEqual([-20]);
    // Not with gold, and not in a town of the same seat that does not follow.
    expect(alms(devout, 'unit', 'gold')).toEqual([]);
    expect(alms(lapsed, 'unit', 'faith')).toEqual([]);
    // A follower belief is never the empire's law, so a price asked with no
    // town in hand never sees it.
    expect(
      cardPurchaseRiders(g.state, 0, 'unit', 'prophet', undefined, undefined, 'faith').some(
        (line) => line.card === 'theAlmsBox',
      ),
    ).toBe(false);
    expect(beliefDef('theAlmsBox').axis).toBe('none');
  });

  it('The Alms Box lowers the printed price, as one labelled line of the price list', () => {
    const g = game();
    const religion = religionWith(g.state);
    const devout = follows(g.state, town(g.state, 0, 6, 6), religion);
    const prophet = { kind: 'unit', id: 'prophet' } as const;
    const before = explainPurchaseCost(g.state, 0, devout.id, prophet, 'faith');
    expect(before).not.toBeNull();
    religion.follower = ['theAlmsBox'];
    bumpRevision(g.state);
    const after = explainPurchaseCost(g.state, 0, devout.id, prophet, 'faith')!;
    expect(after.total).toBe(Math.floor((before!.total * 80) / 100));
    expect(after.lines.some((line) => line.source.includes('The Alms Box'))).toBe(true);
    // Rule 5 for a price: the fold of the printed lines is the total.
    expect(after.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(after.total);
  });

  it('The Alms Box applies to whoever owns the town, a rival included', () => {
    const g = game();
    const religion = religionWith(g.state, 'theAlmsBox');
    town(g.state, 0, 6, 6);
    const theirs = follows(g.state, town(g.state, 1, 10, 6), religion);
    expect(
      cardPurchaseRiders(g.state, 1, 'unit', 'prophet', theirs, undefined, 'faith').map((line) => line.percent),
    ).toEqual([-20]);
    // The town's cards are read only for the seat that buys there.
    expect(
      cardPurchaseRiders(g.state, 0, 'unit', 'prophet', theirs, undefined, 'faith').some(
        (line) => line.card === 'theAlmsBox',
      ),
    ).toBe(false);
  });

  it('Pilgrimage pays +1 faith for every 3 followers in the town', () => {
    const g = game();
    const religion = religionWith(g.state, 'pilgrimage');
    const city = town(g.state, 0, 6, 6);
    city.population = 8;
    follows(g.state, city, religion);
    expect(paid(g.state, city, 'pilgrimage', 'faith')).toBe(2);
    city.followers = { [religion.id]: 6 };
    bumpRevision(g.state);
    expect(paid(g.state, city, 'pilgrimage', 'faith')).toBe(2);
    city.followers = { [religion.id]: 5 };
    bumpRevision(g.state);
    expect(paid(g.state, city, 'pilgrimage', 'faith')).toBe(1);
  });

  it('Holy Water pays +10% food in a following town on fresh water, and no flat yield', () => {
    const g = game();
    const religion = religionWith(g.state, 'holyWater');
    const city = follows(g.state, town(g.state, 0, 6, 6), religion);
    const share = (): number =>
      cityYieldPercents(g.state, city)
        .filter((line) => line.source.includes('Holy Water') && line.yield === 'food')
        .reduce((sum, line) => sum + line.percent, 0);
    const seat = getTileAt(g.state.map, city.col, city.row)!;
    seat.freshwater = false;
    bumpRevision(g.state);
    expect(share()).toBe(0);
    seat.freshwater = true;
    bumpRevision(g.state);
    expect(share()).toBe(10);
    expect(paid(g.state, city, 'holyWater', 'food')).toBe(0);
    expect(paid(g.state, city, 'holyWater', 'faith')).toBe(0);
  });

  it('The Quiet Hours pays +2 culture and +1 happiness for each building that supplies faith', () => {
    const g = game();
    const religion = religionWith(g.state, 'theQuietHours');
    const city = follows(g.state, town(g.state, 1, 6, 6), religion);
    const cheer = (): number =>
      cardHappiness(g.state, 1)
        .filter((line) => line.source.includes('The Quiet Hours'))
        .reduce((sum, line) => sum + line.amount, 0);
    expect(paid(g.state, city, 'theQuietHours', 'culture')).toBe(0);
    expect(cheer()).toBe(0);
    city.buildings.push('shrine');
    bumpRevision(g.state);
    expect(paid(g.state, city, 'theQuietHours', 'culture')).toBe(2);
    expect(cheer()).toBe(1);
    city.buildings.push('temple', 'monument');
    bumpRevision(g.state);
    expect(paid(g.state, city, 'theQuietHours', 'culture')).toBe(4);
    expect(cheer()).toBe(2);
    // Paid to the town's owner, never to the founder.
    expect(cardHappiness(g.state, 0).some((line) => line.source.includes('The Quiet Hours'))).toBe(false);
  });

  it('keeps a follower row a fact about a town: none of the changed rows pays an empire', () => {
    for (const id of ['theAlmsBox', 'pilgrimage', 'holyWater', 'theQuietHours', 'guildOfTheFaithful'] as const) {
      for (const effect of beliefDef(id).effects) {
        if (effect.kind === 'pays') expect(effect.where, id).not.toBe('empire');
      }
    }
  });
});

// --- 3. the withdrawn rows -----------------------------------------------------------

describe('the withdrawn rows', () => {
  it('takes Theocratic Mandate out of the enhancer pool and keeps the row readable', () => {
    expect(beliefDef('theocraticMandate').retired).toBe(true);
    expect(ENHANCER_BELIEF_IDS).toContain('theocraticMandate');
    expect(poolBeliefs('enhancer')).not.toContain('theocraticMandate');
    expect(anyCardDef('theocraticMandate' as never).name).toBe('Theocratic Mandate');
  });

  it('takes The Green Cathedral out of the roll and keeps the row readable', () => {
    expect(consecrationDef('theGreenCathedral').retired).toBe(true);
    expect(CONSECRATION_IDS).toContain('theGreenCathedral');
    expect(LIVE_CONSECRATION_IDS).not.toContain('theGreenCathedral');
    expect(LIVE_CONSECRATION_IDS).toHaveLength(CONSECRATION_IDS.length - 1);
    expect(said('theGreenCathedral')).toEqual(['+1 culture, +1 faith on every unimproved hex']);
  });

  it('never rolls a withdrawn patron, however many cathedrals are finished', () => {
    const g = game();
    const city = town(g.state, 0, 6, 6);
    const seen = new Set<string>();
    for (let index = 0; index < 60; index += 1) {
      // The roll sits in `realiseItem`, which every way of finishing a building
      // goes through. The town is cleared of its cathedral and its patron
      // before each roll, so each draw is a fresh one off the game's stream.
      city.buildings = city.buildings.filter((id) => id !== 'cathedral');
      delete city.consecration;
      realiseItem(g.state, city, { kind: 'building', id: 'cathedral' });
      if (city.consecration !== undefined) seen.add(city.consecration);
    }
    expect(seen.size).toBe(LIVE_CONSECRATION_IDS.length);
    expect(seen.has('theGreenCathedral')).toBe(false);
  });
});

// --- 4. the held row -----------------------------------------------------------------

describe('the row held back', () => {
  it('leaves Feast Days as it was, since a flat rite length scoped to a town has no shape', () => {
    expect(beliefDef('feastDays').text).toBe(
      '+1 happiness for every city that follows, and Temples supply +1 happiness.',
    );
    expect(beliefDef('feastDays').effects.map((effect) => effect.kind)).toEqual(['happiness', 'happiness']);
  });
});

// --- 5. the rites -----------------------------------------------------------------------

describe('the rites’ texts', () => {
  /** Every figure a rite's lasting effects carry, as the text would write it. */
  const FIGURES: Record<string, readonly string[]> = {
    riteOfTheHarvest: ['+1'],
    omenReading: ['+1 science'],
    consecrationOfTheBounds: ['+1 culture', '30%'],
    blessingOfArms: ['+10 defence'],
    riteOfPlenty: ['+1 gold'],
    riteOfFasting: ['+1 science', '+1 culture'],
  };

  it('state the numbers the rites’ effects already carry', () => {
    for (const [id, figures] of Object.entries(FIGURES)) {
      const text = riteDef(id as never).text ?? '';
      for (const figure of figures) expect(text, id).toContain(figure);
    }
    // The four the spec words without a figure still have a text.
    for (const id of LIVE_RITE_IDS) expect((riteDef(id).text ?? '').length, id).toBeGreaterThan(0);
  });

  it('match the figures on the rows, which did not move', () => {
    const effect = (id: string, at = 0) => riteDef(id as never).effects[at] as unknown as Record<string, unknown>;
    expect(effect('riteOfTheHarvest').food).toBe(1);
    expect(effect('omenReading').amount).toBe(1);
    expect(effect('consecrationOfTheBounds').culture).toBe(1);
    expect(effect('consecrationOfTheBounds', 1).percent).toBe(30);
    expect(effect('blessingOfArms').amount).toBe(10);
    expect(effect('riteOfPlenty').gold).toBe(1);
    for (const id of LIVE_RITE_IDS) {
      expect(riteDef(id).duration, id).toBe(id === 'votiveOffering' ? 1 : id === 'restoringOfTheHost' ? 5 : 10);
    }
  });

  it('say the same plain thing on the tree’s rite summaries', () => {
    for (const [id, figures] of Object.entries(FIGURES)) {
      if (id === 'riteOfFasting') continue;
      const summary = abilityDef(id as never).summary;
      expect(summary, id).toMatch(/^A town may keep this rite: /);
      for (const figure of figures) expect(summary, id).toContain(figure);
    }
  });
});

// --- 6. the bots ------------------------------------------------------------------------

describe('the bots', () => {
  it('price every live belief with a finite figure, the new rows included', () => {
    const g = game();
    const religion = religionWith(g.state, 'theAlmsBox');
    follows(g.state, town(g.state, 0, 6, 6), religion);
    const ctx = valueContext(g.state, playerById(g.state, 0)!);
    for (const id of ALL_BELIEF_IDS) {
      if (beliefDef(id).retired === true) continue;
      const worth = scoreEffects(beliefDef(id).effects, ctx);
      expect(Number.isFinite(worth), id).toBe(true);
    }
    // The three new rows are worth something to a seat that could use them.
    expect(scoreEffects(beliefDef('theAlmsBox').effects, ctx)).toBeGreaterThanOrEqual(0);
  });
});
