/**
 * The Faith sheet's Bonuses tab (batch UX10, `src/ui/bonusesTab.ts`), asked on
 * a real board: the shelves and what each card wears, the headline, the memory
 * that decides which figures count up, and the drawing with its opening.
 *
 * The spec is `docs/plans/faith-screen-f1.md`, Tab 2, with the user's answers of
 * 2026-10-15 (`docs/flags.md` (ssssss) 4): the deal plays every time the tab
 * opens and a figure counts only if it changed (4.1); a card wears the Ledger's
 * figure (4.2); no Order cards, and the headline still sums to the top bar with
 * the Statecraft cards as one slice (4.3).
 *
 * The world is `faithTabsWorld` (`faithTabHelpers.ts`), shared with the Religion
 * & followers suite. The drawing is built in a stand-in document.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  explainFaithLedger,
  explainLedger,
  explainReligionLedger,
  foldReligionLedger,
} from '../../src/sim/ledgerFold';
import { readEmpire } from '../../src/sim/readings';
import { cityRiteTurnsLeft, explainNextRung, nextRungWords, pantheonPlaces } from '../../src/sim/religion';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { RULES } from '../../src/sim/rulesData';
import { bumpRevision } from '../../src/sim/state';
import { isOrderId } from '../../src/sim/statecraftData';
import { techDef } from '../../src/sim/techData';
import { dealtAt, DEAL_STAGGER_MS } from '../../src/ui/cardDeal';
import { cityDisplayName } from '../../src/ui/cityDisplay';
import { signedFigure } from '../../src/ui/figures';
import {
  type BonusCard,
  type BonusesModel,
  type BonusesMotion,
  bonusFigures,
  bonusSourceKey,
  bonusesTabModel,
  drawBonusesTab,
  figureChanged,
  paidText,
} from '../../src/ui/bonusesTab';
import {
  type FakeNode,
  all,
  byClass,
  faithTabsWorld,
  fire,
  installFakeDocument,
  textOf,
} from './faithTabHelpers';

/** Every card on every shelf. */
function cards(model: BonusesModel): BonusCard[] {
  return model.shelves.flatMap((shelf) => shelf.cards);
}

function card(model: BonusesModel, key: string): BonusCard {
  const found = cards(model).find((one) => one.key === key);
  if (found === undefined) throw new Error(`no card ${key}`);
  return found;
}

describe('the shelves', () => {
  it("add up to the right-hand headline, which is the Ledger's Religion slice", () => {
    const { state } = faithTabsWorld();
    const model = bonusesTabModel(state, 0);
    const ledger = explainLedger(state, 0);
    for (const key of CITY_YIELD_KEYS) {
      const shelves = model.shelves.reduce((sum, shelf) => sum + shelf.total[key], 0);
      expect(shelves, key).toBeCloseTo(model.religion[key], 9);
      expect(model.religion[key], key).toBeCloseTo(ledger.find((voice) => voice.key === key)!.byClass.religion, 9);
    }
    expect(model.religion).toEqual(foldReligionLedger(explainReligionLedger(state, 0)));
  });

  it('put every source the Ledger names on exactly one card, wearing its figure', () => {
    const { state } = faithTabsWorld();
    const model = bonusesTabModel(state, 0);
    const keys = cards(model).map((one) => one.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const line of explainReligionLedger(state, 0)) {
      const key = bonusSourceKey(line.source);
      expect(keys, key).toContain(key);
      expect(card(model, key).paid, key).toEqual(line.paid);
    }
  });

  it('show no Order card, even one that pays faith (the ruling of 2026-10-15, 4.3)', () => {
    const { state } = faithTabsWorld();
    for (const one of cards(bonusesTabModel(state, 0))) {
      expect(isOrderId(one.key.replace(/^card:/, '')), one.key).toBe(false);
    }
  });

  it('deal the gods in the pantheon’s order, and say what each empty place waits for', () => {
    const { state } = faithTabsWorld();
    const model = bonusesTabModel(state, 0);
    const gods = model.shelves.find((shelf) => shelf.id === 'gods')!;
    expect(gods.cards.map((one) => one.key)).toEqual(['card:keeperOfTheHearth', 'card:sacredFire']);
    expect(gods.cards.every((one) => one.eyebrow === 'a god')).toBe(true);
    const empty = pantheonPlaces(state, 0).filter((place) => place.belief === null);
    expect(gods.ghosts).toHaveLength(empty.length);
    const rung = explainNextRung(state, 0, readEmpire(state, 0).totals.faith);
    let first = true;
    empty.forEach((place, index) => {
      const ghost = gods.ghosts[index]!;
      if (place.awaits !== null) {
        expect(ghost.text).toBe(`${techDef(place.awaits).name} opens this place`);
        return;
      }
      if (first && (rung.kind === 'open' || rung.kind === 'waiting')) expect(ghost.text).toBe(nextRungWords(rung));
      first = false;
    });
  });

  it('hold your religion’s beliefs, with each empty place as an outline', () => {
    const { state } = faithTabsWorld();
    const beliefs = bonusesTabModel(state, 0).shelves.find((shelf) => shelf.id === 'beliefs')!;
    expect(beliefs.cards.map((one) => [one.key, one.eyebrow])).toEqual([
      ['card:theQuietHours', 'a follower belief'],
      ['card:templeSpires', 'a follower belief'],
      ['card:pilgrimsCoin', 'an enhancer belief'],
    ]);
    const enhancer = beliefs.ghosts.find((ghost) => ghost.key === 'ghost:enhancer')!;
    expect(enhancer.title).toBe('enhancer beliefs · 1 of 2');
    // Theology is not known, so the outline says what opens the place.
    expect(enhancer.text).toBe('a prophet’s charge, once you have Theology');
    // The follower gate is known (a prophet can be called), so it does not.
    expect(beliefs.ghosts.find((ghost) => ghost.key === 'ghost:follower')!.text).toBe('a prophet’s charge draws one');
  });

  it('say a building-gated belief pays once its building stands, and then where it stands', () => {
    const { state, uruk } = faithTabsWorld();
    const before = card(bonusesTabModel(state, 0), 'card:templeSpires');
    expect(before.chips).toEqual([]);
    expect(before.where).toBe('no Wat bought yet');
    expect(before.quiet).toBe('pays once a Wat stands');
    uruk.buildings.push('wat');
    bumpRevision(state);
    const after = card(bonusesTabModel(state, 0), 'card:templeSpires');
    // The Wat's own faith is counted with buildings, so the card still pays no
    // yield, and says where its building stands instead.
    expect(paidText(after.paid)).toBe('');
    expect(after.chips.map((chip) => chip.label)).toEqual([cityDisplayName(state, uruk)]);
    expect(after.where).toBe('has a Wat');
    expect(after.quiet).toBe('the Wat’s yield is counted with buildings');
  });

  it('put the holy city on a wide plaque: the founder’s share, who pays it, and the site’s reach', () => {
    const { state, ours, lagash } = faithTabsWorld();
    const plaque = card(bonusesTabModel(state, 0), `founderShare:${ours.id}`);
    expect(plaque.kind).toBe('holyCity');
    expect(plaque.wide).toBe(true);
    expect(plaque.eyebrow).toBe('holy city · the Grain Cult');
    expect(plaque.chips.map((chip) => chip.label)).toEqual([lagash.name]);
    expect(plaque.where).toBe('follow by majority');
    expect(plaque.paid.faith).toBeGreaterThan(0);
    expect(plaque.clauses.length).toBeGreaterThan(0);
    expect(plaque.notes).toEqual([
      `The holy site presses +${RULES.religion.siteStrength} a turn on every town within ${RULES.religion.siteRange} hexes.`,
    ]);
    // The share is the empire's own line, so its hover names no town.
    expect(plaque.parts.map((part) => part.label)).toEqual(['your empire as a whole']);
  });

  it('draw a rite on a wide card with its towns and their turns', () => {
    const { state, uruk } = faithTabsWorld();
    const rite = card(bonusesTabModel(state, 0), 'card:omenReading');
    expect(rite.kind).toBe('rite');
    expect(rite.wide).toBe(true);
    expect(rite.eyebrow).toBe('a rite · kept in 1 town');
    const left = cityRiteTurnsLeft(state, uruk);
    expect(rite.chips).toHaveLength(1);
    expect(rite.chips[0]!.label).toBe(cityDisplayName(state, uruk));
    expect(rite.chips[0]!.turnsLeft).toBe(left);
    expect(rite.chips[0]!.turnsTotal).toBeGreaterThanOrEqual(left);
    expect(rite.paid.science).toBeGreaterThan(0);
  });

  it('give another faith’s beliefs paying in your towns a shelf of their own', () => {
    const { state, eridu, ours } = faithTabsWorld();
    const others = bonusesTabModel(state, 0).shelves.find((shelf) => shelf.id === 'otherFaiths')!;
    expect(others.cards.map((one) => [one.key, one.eyebrow])).toEqual([
      ['card:titheHouses', 'a follower belief of the Way of the Hearth'],
    ]);
    expect(others.cards[0]!.paid.gold).toBeGreaterThan(0);
    expect(others.cards[0]!.chips.map((chip) => chip.label)).toEqual([eridu.name]);
    // A seat whose towns follow no other faith has no such shelf.
    eridu.followers = { [ours.id]: eridu.population };
    bumpRevision(state);
    expect(bonusesTabModel(state, 0).shelves.map((shelf) => shelf.id)).toEqual(['gods', 'beliefs', 'holy']);
  });

  it('list each card’s figure town by town for its hover card', () => {
    const { state } = faithTabsWorld();
    const fire = card(bonusesTabModel(state, 0), 'card:sacredFire');
    // Sacred Fire pays in every town of the seat's, in the towns' own order.
    const towns = state.cities.filter((city) => city.ownerId === 0).map((city) => cityDisplayName(state, city));
    expect(fire.parts.map((part) => part.label)).toEqual(towns);
    expect(fire.chips.map((chip) => chip.label)).toEqual(towns);
    for (const key of CITY_YIELD_KEYS) {
      expect(fire.parts.reduce((sum, part) => sum + part.paid[key], 0), key).toBe(fire.paid[key]);
    }
  });
});

describe('the headline', () => {
  it("sums to the top bar's faith, with the Statecraft cards as one slice", () => {
    const { state } = faithTabsWorld();
    const model = bonusesTabModel(state, 0);
    expect(model.faith.total).toBeCloseTo(readEmpire(state, 0).totals.faith, 9);
    expect(model.faith.slices.reduce((sum, slice) => sum + slice.faith, 0)).toBeCloseTo(model.faith.total, 9);
    const deck = model.faith.slices.filter((slice) => slice.ledgerClass === 'deck');
    expect(deck).toHaveLength(1);
    expect(deck[0]!.faith).toBeGreaterThan(0);
    expect(deck[0]!.label).toBe('Statecraft cards (see the Statecraft sheet)');
    // The rest are the faith Ledger's own lines, in its order.
    expect(model.faith.slices.map((slice) => slice.faith)).toEqual(explainFaithLedger(state, 0).map((line) => line.faith));
  });

  it('gives each of the religion’s slices the key of the card it lights', () => {
    const { state } = faithTabsWorld();
    const model = bonusesTabModel(state, 0);
    const keys = new Set(cards(model).map((one) => one.key));
    for (const slice of model.faith.slices) {
      if (slice.ledgerClass === null) expect(keys, slice.key).toContain(slice.key);
    }
  });
});

describe('the memory of what was last seen (the ruling of 2026-10-15, 4.1)', () => {
  it('counts every figure the first time, and afterwards only a figure that changed', () => {
    const { state, uruk } = faithTabsWorld();
    const first = bonusFigures(bonusesTabModel(state, 0));
    for (const [key, words] of first) expect(figureChanged(undefined, key, words), key).toBe(true);
    // Looked at again with nothing changed: nothing counts.
    const again = bonusFigures(bonusesTabModel(state, 0));
    for (const [key, words] of again) expect(figureChanged(first, key, words), key).toBe(false);
    // A town grows: Sacred Fire's figure does not move, Omen Reading's does once
    // a building goes up.
    uruk.buildings.push('monument');
    bumpRevision(state);
    const later = bonusFigures(bonusesTabModel(state, 0));
    expect(figureChanged(first, 'card:omenReading', later.get('card:omenReading')!)).toBe(true);
    expect(figureChanged(first, 'card:sacredFire', later.get('card:sacredFire')!)).toBe(false);
  });
});

// --- the drawing ---------------------------------------------------------------------------

describe('the drawing', () => {
  let undo: () => void = () => undefined;
  beforeEach(() => {
    undo = installFakeDocument();
  });
  afterEach(() => undo());

  /** A motion that records what it was asked to schedule, and runs it on demand. */
  function recorder(opening: boolean, counts: (key: string) => boolean = () => true) {
    const scheduled: { ms: number; run: () => void }[] = [];
    const motion: BonusesMotion = {
      opening,
      counts,
      later: (ms, run) => scheduled.push({ ms, run }),
      keep: () => undefined,
    };
    return {
      motion,
      scheduled,
      runAll: () => {
        for (const item of [...scheduled].sort((a, b) => a.ms - b.ms)) item.run();
      },
    };
  }

  function draw(model: BonusesModel, motion: BonusesMotion, hovers: FakeNode[] = []): FakeNode {
    return drawBonusesTab(model, motion, {
      hover: (anchor) => {
        hovers.push(anchor as unknown as FakeNode);
      },
    }) as unknown as FakeNode;
  }

  /** The drawn faces of the real cards, in shelf order. */
  function faces(tab: FakeNode): FakeNode[] {
    return byClass(tab, 'faith-card').filter((node) => node.className.includes('sc-card'));
  }

  it('deals every card face down on an opening, a beat apart, and settles each once it has come round', () => {
    const { state } = faithTabsWorld();
    const model = bonusesTabModel(state, 0);
    const { motion, scheduled, runAll } = recorder(true);
    const tab = draw(model, motion);
    const dealt = faces(tab);
    expect(dealt).toHaveLength(cards(model).length);
    dealt.forEach((face, index) => {
      expect(face.className.split(' ')).toContain('is-dealing');
      expect(face.props['--deal-delay']).toBe(`${index * DEAL_STAGGER_MS}ms`);
      expect(byClass(face, 'card-back')).toHaveLength(1);
      expect(scheduled.some((item) => item.ms === dealtAt(index))).toBe(true);
    });
    // The outlines of empty places are not cards, and are not dealt.
    for (const ghost of byClass(tab, 'is-ghost')) expect(ghost.className).not.toContain('is-dealing');
    runAll();
    for (const face of dealt) {
      expect(face.className.split(' ')).not.toContain('is-dealing');
      expect(face.props['--deal-delay']).toBeUndefined();
      expect(byClass(face, 'card-back')).toHaveLength(0);
    }
  });

  it('counts a changed figure from nought, and lands an unchanged one', () => {
    const { state } = faithTabsWorld();
    const model = bonusesTabModel(state, 0);
    const counted = 'card:sacredFire';
    const { motion, runAll } = recorder(true, (key) => key === counted);
    const tab = draw(model, motion);
    const stampOf = (key: string): FakeNode =>
      byClass(faces(tab).find((face) => face.dataset.src === key)!, 'card-stamp')[0]!;
    const counting = stampOf(counted);
    const resting = stampOf('card:keeperOfTheHearth');
    // Before the card comes round: the counted figure waits at nought, the
    // unchanged one is already there.
    expect(counting.dataset.phase).toBe('anticipate');
    expect(textOf(counting)).toContain('+0');
    expect(resting.dataset.phase).toBe('held');
    expect(textOf(resting)).toContain('+1');
    runAll();
    // The stand-in window asks for no motion, so the count lands at once.
    expect(counting.dataset.phase).toBe('landed');
    expect(textOf(counting)).toContain(signedFigure(card(model, counted).paid.faith));
    expect(resting.dataset.phase).toBe('landed');
  });

  it('moves nothing on a plain repaint', () => {
    const { state } = faithTabsWorld();
    const { motion, scheduled } = recorder(false);
    const tab = draw(bonusesTabModel(state, 0), motion);
    expect(scheduled).toEqual([]);
    expect(byClass(tab, 'is-dealing')).toEqual([]);
    expect(byClass(tab, 'card-back')).toEqual([]);
    for (const stamp of byClass(tab, 'card-stamp')) {
      if (stamp.dataset.face === 'figure') expect(stamp.dataset.phase).toBe('held');
    }
    // The bar is drawn at its widths at once.
    for (const slice of byClass(tab, 'faith-slice')) expect(slice.props.width).not.toBe('0%');
  });

  it('grows the faith bar’s slices from nothing, each a beat after the one before', () => {
    const { state } = faithTabsWorld();
    const { motion, runAll } = recorder(true);
    const tab = draw(bonusesTabModel(state, 0), motion);
    const slices = byClass(tab, 'faith-slice');
    expect(slices.length).toBeGreaterThan(1);
    slices.forEach((slice, index) => {
      expect(slice.props.width).toBe('0%');
      expect(slice.props['--slice-delay']).toBe(`${index * 90}ms`);
    });
    runAll();
    const widths = slices.map((slice) => Number.parseFloat(slice.props.width!));
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(100, 1);
  });

  it('wears the flourish on a card that pays no yield, with what it waits for', () => {
    const { state } = faithTabsWorld();
    const tab = draw(bonusesTabModel(state, 0), recorder(false).motion);
    const spires = faces(tab).find((face) => face.dataset.src === 'card:templeSpires')!;
    expect(byClass(spires, 'card-stamp')[0]!.dataset.face).toBe('flourish');
    expect(textOf(byClass(spires, 'faith-card-quiet')[0]!)).toBe('pays once a Wat stands');
  });

  it('lights a card’s slice of the bar while the others dim, and the card from its slice', () => {
    const { state } = faithTabsWorld();
    const tab = draw(bonusesTabModel(state, 0), recorder(false).motion);
    const bar = byClass(tab, 'faith-bar')[0]!;
    const face = faces(tab).find((one) => one.dataset.src === 'card:sacredFire')!;
    const slice = byClass(tab, 'faith-slice').find((one) => one.dataset.src === 'card:sacredFire')!;
    fire(face, 'pointerenter');
    expect(bar.className).toContain('is-dim');
    expect(slice.className).toContain('is-lit');
    fire(face, 'pointerleave');
    expect(bar.className).not.toContain('is-dim');
    fire(slice, 'pointerenter');
    expect(face.className).toContain('is-lit');
  });

  it('hands every card to the hover card, and prints no raw keyword mark', () => {
    const { state } = faithTabsWorld();
    const model = bonusesTabModel(state, 0);
    const hovers: FakeNode[] = [];
    const tab = draw(model, recorder(false).motion, hovers);
    expect(hovers.map((node) => node.dataset.src)).toEqual(cards(model).map((one) => one.key));
    expect(textOf(tab)).not.toContain('[[');
    // Every element drawn is an article, a list or a span: no card is a button.
    expect(all(tab).some((node) => node.tagName === 'BUTTON')).toBe(false);
  });

  it('keeps the eyebrow on the card it belongs to', () => {
    const { state } = faithTabsWorld();
    const model = bonusesTabModel(state, 0);
    const tab = draw(model, recorder(false).motion);
    for (const face of faces(tab)) {
      const want = card(model, face.dataset.src!).eyebrow;
      expect(textOf(byClass(face, 'sc-card-type')[0]!)).toBe(want);
    }
    // What a shelf adds up to is printed at its head, voice by voice (the marks
    // are drawn, so only the figures are text here).
    const gods = byClass(tab, 'faith-shelf').find((node) => node.className.includes('is-gods'))!;
    const total = textOf(byClass(gods, 'faith-shelf-total')[0]!);
    const sum = model.shelves.find((shelf) => shelf.id === 'gods')!.total;
    for (const key of CITY_YIELD_KEYS) if (sum[key] !== 0) expect(total, key).toContain(signedFigure(sum[key]));
  });
});
