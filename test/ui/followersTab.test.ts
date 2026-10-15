/**
 * The Faith sheet's Religion & followers tab (batch UX11,
 * `src/ui/followersTab.ts`), asked on a real board: the religion's facts and
 * counts, who follows at home and abroad, the rival faiths pressing your towns,
 * and the clergy cards with their prices and refusals.
 *
 * The spec is `docs/plans/faith-screen-f1.md`, Tab 3, and the user's answer
 * 4.5 of 2026-10-15 (`docs/flags.md` (ssssss)): rival rows follow the faith
 * lens's fog rule. Every town on that list is the reader's own, and a seat
 * always sees its own towns, so every rival faith pressing one is listed.
 *
 * The world is `faithTabsWorld` (`faithTabHelpers.ts`), shared with the
 * Bonuses suite. The drawing is built in a stand-in document.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { explainPressure, holySites } from '../../src/sim/religion';
import { explainPurchaseCost, purchaseError } from '../../src/sim/purchase';
import { RULES } from '../../src/sim/rulesData';
import { bumpRevision, playerById } from '../../src/sim/state';
import { explainCardEmpireYields } from '../../src/sim/statecraft';
import { unitDef } from '../../src/sim/unitData';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import { religionReading } from '../../src/ui/faithReading';
import {
  CLERGY,
  type FollowersHandlers,
  type FollowersModel,
  drawFollowersTab,
  followersTabModel,
} from '../../src/ui/followersTab';
import { purchaseLook } from '../../src/ui/priceCell';
import {
  type FakeNode,
  byClass,
  byKey,
  faithTabsWorld,
  fire,
  installFakeDocument,
  textOf,
} from './faithTabHelpers';
import { sourceOf } from './faithHelpers';
import type { GameState } from '../../src/sim/state';

function model(state: GameState, seat: number, aimed: number | null = null): FollowersModel {
  return followersTabModel(state, seat, religionReading(state, seat), aimed);
}

describe('the religion, in the column', () => {
  it('names the religion and puts its facts in pills', () => {
    const { state, uruk } = faithTabsWorld();
    const shown = model(state, 0);
    expect(shown.religion).toEqual({
      name: 'the Grain Cult',
      facts: ['founded by you', `holy city ${cityDisplayName(state, uruk)}`, religionReading(state, 0).count],
    });
    expect(shown.found).toBeNull();
  });

  it('counts the towns that follow, at home and abroad, and the holy site’s pressure', () => {
    const { state } = faithTabsWorld();
    const shown = model(state, 0);
    // Uruk at home and Lagash abroad hold followers; Eridu is pressed but holds
    // none, and Ur is out of reach.
    expect(shown.counts).toEqual([
      { value: '2', label: 'towns follow' },
      { value: '1 / 3', label: 'of yours' },
      { value: '1', label: 'foreign' },
      { value: `+${RULES.religion.siteStrength}`, label: 'from the holy site a turn' },
    ]);
  });

  it('says how a religion is founded before one is, and counts nothing', () => {
    const { state, ours } = faithTabsWorld();
    state.religions = state.religions.filter((one) => one.id !== ours.id);
    bumpRevision(state);
    const shown = model(state, 0);
    expect(shown.religion).toBeNull();
    expect(shown.found?.how).toContain('A prophet plants the first holy site');
    expect(shown.counts).toBeNull();
    expect(shown.yours).toEqual([]);
  });
});

describe('who follows', () => {
  it('lists your towns your faith holds or presses, then the ones it does not reach', () => {
    const { state, uruk, eridu, ur, ours } = faithTabsWorld();
    const shown = model(state, 0);
    expect(shown.yours.map((row) => [row.cityId, row.following, row.majority])).toEqual([
      [uruk.id, uruk.population, true],
      [eridu.id, 0, false],
    ]);
    // Each row's figure is the fold of its own ledger, which is the hover.
    for (const row of shown.yours) {
      const city = state.cities.find((one) => one.id === row.cityId)!;
      const lines = explainPressure(state, city, holySites(state)).filter((line) => line.religion === ours.id);
      expect(row.pressure).toBe(Math.max(0, lines.reduce((sum, line) => sum + line.amount, 0)));
    }
    expect(shown.unreached).toEqual([
      { cityId: ur.id, name: ur.name, population: ur.population, reason: 'your faith does not reach it' },
    ]);
  });

  it('lists the foreign towns that follow, with whose they are', () => {
    const { state, lagash } = faithTabsWorld();
    const shown = model(state, 0);
    expect(shown.foreign.map((row) => [row.cityId, row.majority, row.empire?.name])).toEqual([
      [lagash.id, true, 'Crimson'],
    ]);
  });
});

describe('rival faiths pressing your towns (the ruling of 2026-10-15, 4.5)', () => {
  it('lists every rival faith pressing a town of yours, with its ledger', () => {
    const { state, lagash, ours } = faithTabsWorld();
    // From seat 1's side: Lagash is pressed by the Grain Cult's holy site.
    const rows = model(state, 1).rivals;
    expect(rows.map((row) => [row.cityId, row.religion, row.founderName])).toEqual([
      [lagash.id, 'the Grain Cult', 'Azure'],
    ]);
    const lines = explainPressure(state, lagash, holySites(state)).filter((line) => line.religion === ours.id);
    expect(rows[0]!.pressure).toBe(lines.reduce((sum, line) => sum + line.amount, 0));
    expect(rows[0]!.ledger).toContain('Holy site');
  });

  it('says so plainly when no rival faith presses any of your towns', () => {
    const { state } = faithTabsWorld();
    const shown = model(state, 0);
    expect(shown.rivals).toEqual([]);
    expect(shown.rivalsEmpty).toBe(
      'No rival faith presses any of your towns this turn: the Way of the Hearth reaches none of them.',
    );
  });
});

describe('the clergy', () => {
  it('calls the clergy in the capital by default, and in the town the player picked', () => {
    const { state, uruk, eridu, lagash } = faithTabsWorld();
    expect(model(state, 0).clergy.cityId).toBe(uruk.id);
    expect(model(state, 0, eridu.id).clergy.cityId).toBe(eridu.id);
    // A town that is not the seat's falls back to the capital.
    expect(model(state, 0, lagash.id).clergy.cityId).toBe(uruk.id);
  });

  it('puts the roster’s verb, the price and the gate’s answer on each card', () => {
    const { state, uruk } = faithTabsWorld();
    const shown = model(state, 0);
    expect(shown.clergy.cards.map((one) => one.type)).toEqual([...CLERGY]);
    for (const one of shown.clergy.cards) {
      const def = unitDef(one.type);
      const item = { kind: 'unit', id: one.type } as const;
      expect(one.verb).toBe(def.purchase!.verb);
      expect(one.look).toEqual(purchaseLook(state, 0, uruk.id, item, 'faith'));
      expect(one.look.price).toBe(explainPurchaseCost(state, 0, uruk.id, item, 'faith')!.total);
      if (one.look.look === 'none') expect(one.look.refusal).toBe(purchaseError(state, 0, uruk.id, item, 'faith'));
    }
    // The prophet can be called; the inquisitor waits on its technology.
    expect(shown.clergy.cards[0]!.look.look).toBe('buy');
    expect(shown.clergy.cards[2]!.look.look).toBe('none');
  });
});

describe('the founder’s share', () => {
  it('is read by its own field, never by its label', () => {
    const { state, ours } = faithTabsWorld();
    const trickle = religionReading(state, 0).trickle;
    expect(trickle.length).toBeGreaterThan(0);
    expect(trickle).toEqual(explainCardEmpireYields(state, 0).filter((line) => line.founderShare === ours.id));
    // Until batch UX11 the sheet matched the line's label, which a reworded
    // label would have silently broken.
    const reading = sourceOf('faithReading.ts');
    expect(reading).toContain('line.founderShare === mine.id');
    expect(reading).not.toContain('source.startsWith(');
  });
});

// --- the drawing ---------------------------------------------------------------------------

describe('the drawing', () => {
  let undo: () => void = () => undefined;
  beforeEach(() => {
    undo = installFakeDocument();
  });
  afterEach(() => undo());

  function recorder(): { handlers: FollowersHandlers; calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      handlers: {
        rename: (name) => calls.push(`rename ${name}`),
        refuse: (message) => calls.push(`refuse ${message}`),
        buy: (cityId, item, currency) => calls.push(`buy ${cityId} ${item.id} ${currency}`),
        aim: (cityId) => calls.push(`aim ${cityId}`),
        toBonuses: () => calls.push('bonuses'),
      },
    };
  }

  function draw(state: GameState, handlers: FollowersHandlers, seat = 0): FakeNode {
    return drawFollowersTab(state, seat, model(state, seat), handlers) as unknown as FakeNode;
  }

  it('calls a prophet in one press of a button carrying the price', () => {
    const { state, uruk } = faithTabsWorld();
    const { handlers, calls } = recorder();
    const tab = draw(state, handlers);
    const button = byKey(tab, 'clergy:prophet')!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.disabled).toBe(false);
    const price = explainPurchaseCost(state, 0, uruk.id, { kind: 'unit', id: 'prophet' }, 'faith')!.total;
    expect(textOf(button).startsWith(`Call a prophet · ${price}`)).toBe(true);
    fire(button, 'click');
    expect(calls).toEqual([`buy ${uruk.id} prophet faith`]);
  });

  it('keeps a refused piece’s price in view, with the reason on the card and no button', () => {
    const { state } = faithTabsWorld();
    const tab = draw(state, recorder().handlers);
    const card = byClass(tab, 'faith-clergy-card').find((node) => node.dataset.unit === 'inquisitor')!;
    expect(byKey(card, 'clergy:inquisitor')).toBeUndefined();
    expect(textOf(byClass(card, 'faith-clergy-price')[0]!)).toContain('Call an inquisitor · 200');
    expect(textOf(byClass(card, 'refusal-line')[0]!)).toBe('Inquisitors need The Holy Office');
  });

  it('quiets a pressable button once the seat has ended its turn', () => {
    const { state } = faithTabsWorld();
    state.turnEnded[0] = true;
    const button = byKey(draw(state, recorder().handlers), 'clergy:prophet')!;
    expect(button.disabled).toBe(true);
    expect(button.title).toBe(`You have ended turn ${state.turn}`);
  });

  it('renames in place, and says a refusal instead of sending it', () => {
    const { state } = faithTabsWorld();
    const { handlers, calls } = recorder();
    const tab = draw(state, handlers);
    const field = byClass(tab, 'rel-name-field')[0]!;
    field.value = '   ';
    fire(field, 'change');
    expect(calls.length).toBe(1);
    expect(calls[0]!.startsWith('refuse ')).toBe(true);
    expect(field.value).toBe('the Grain Cult');
    field.value = 'the Long Harvest';
    fire(field, 'change');
    expect(calls[1]).toBe('rename the Long Harvest');
  });

  it('aims the clergy at another town, and goes to Bonuses from the link', () => {
    const { state, eridu } = faithTabsWorld();
    const { handlers, calls } = recorder();
    const tab = draw(state, handlers);
    const select = byClass(tab, 'rel-city-select')[0]!;
    select.value = String(eridu.id);
    fire(select, 'change');
    fire(byKey(tab, 'to-bonuses')!, 'click');
    expect(calls).toEqual([`aim ${eridu.id}`, 'bonuses']);
  });

  it('prints a town’s pressure on its row, never “+0 a turn”, and no raw keyword mark', () => {
    const { state, ur } = faithTabsWorld();
    const tab = draw(state, recorder().handlers);
    const presses = byClass(tab, 'faith-follower-press').map(textOf);
    expect(presses.some((text) => /^\+\d+ a turn$/.test(text))).toBe(true);
    expect(presses).not.toContain('+0 a turn');
    const far = byClass(tab, 'faith-follower').find((node) => node.dataset.city === String(ur.id))!;
    expect(textOf(far)).toContain('your faith does not reach it');
    expect(textOf(tab)).not.toContain('[[');
    expect(playerById(state, 0)).toBeDefined();
  });

  it('lists the rival faith pressing a town, from the side of the seat it presses', () => {
    const { state, lagash } = faithTabsWorld();
    const tab = draw(state, recorder().handlers, 1);
    const rivals = byClass(tab, 'faith-rivals')[0]!;
    const row = byClass(rivals, 'faith-follower').find((node) => node.dataset.city === String(lagash.id))!;
    expect(textOf(row)).toContain('the Grain Cult · Azure');
    expect(row.title).toContain('Holy site');
  });
});
