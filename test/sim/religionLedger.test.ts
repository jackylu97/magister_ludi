/**
 * The Religion class split by source, the founder's share as a source of its
 * own, and the faith headline (batch UX8b: `docs/plans/faith-screen-audit.md`
 * §6 and item 8; `docs/plans/faith-screen-f1.md`, the Bonuses tab).
 *
 * What is pinned here:
 *
 *   · `explainReligionLedger`'s six sums are the Ledger's Religion slice, voice
 *     by voice (rule 5: the slice is the fold of the list);
 *   · the founder's share is credited to its religion and never to the belief
 *     whose id its line carries, files under religion even before the faith
 *     holds a belief, and says what it counts in words rather than "×N";
 *   · `explainFaithLedger` folds to the top bar's faith figure, opens the
 *     Religion class into its sources, and keeps every Order card inside one
 *     deck slice (the user's ruling of 2026-10-15, `docs/flags.md` (ssssss) 4.3);
 *   · `explainReligionLedgerByPlace` (batch UX10) is the same list with each
 *     source split by town, and a town's part is `religionLinesOfCity`'s line,
 *     the figure the Rites tab prints for a kept rite.
 *
 * Core: one small board, read a handful of times.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { getTileAt, tileIndex } from '../../src/sim/map';
import {
  type GameState,
  type Religion,
  bumpRevision,
  playerById,
} from '../../src/sim/state';
import { foundReligion, performRiteAt } from '../../src/sim/religion';
import {
  classifyEmpireLine,
  explainDeckLedger,
  explainFaithLedger,
  explainLedger,
  explainReligionLedger,
  explainReligionLedgerByPlace,
  foldFaithLedger,
  foldReligionLedger,
  religionLinesOfCity,
} from '../../src/sim/ledgerFold';
import { readEmpire } from '../../src/sim/readings';
import { explainCardEmpireYields } from '../../src/sim/statecraft';
import { explainEmpireLines } from '../../src/sim/yields/empire';
import { type OrderId, isOrderId } from '../../src/sim/statecraftData';
import { createGame } from './newGameHelpers';

/**
 * Seat 0's faith, paid every way a religion pays: two gods, a follower belief in
 * its own following town, an enhancer that pays the empire, a rite a town is
 * keeping, and the founder's share for a foreign town that follows.
 *
 * The holy site stands on the holy city's own hex, the fixture
 * `test/sim/religion.test.ts` uses for the founder's half.
 */
function world(): { state: GameState; religion: Religion } {
  const g = createGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const state = g.state;
  const player = playerById(state, 0)!;
  const seat = foundCityAt(state, 0, getTileAt(state.map, 6, 6)!);
  player.pantheon.beliefs.push('keeperOfTheHearth', 'sacredFire');
  const religion = foundReligion(state, player);
  getTileAt(state.map, 6, 6)!.improvement = 'holySite';
  state.tileOwner[tileIndex(state.map, 6, 6)] = seat.id;
  religion.holySite = { col: 6, row: 6 };
  const theirs = foundCityAt(state, 1, getTileAt(state.map, 9, 6)!);
  seat.followers = { [religion.id]: seat.population };
  theirs.followers = { [religion.id]: theirs.population };
  religion.follower = ['theQuietHours'];
  religion.enhancer = ['pilgrimsCoin'];
  seat.buildings.push('granary');
  player.faithPool = 1000;
  bumpRevision(state);
  performRiteAt(state, player, seat, 'omenReading');
  bumpRevision(state);
  return { state, religion };
}

describe('the Religion class, split by source', () => {
  it("sums to the Ledger's Religion slice, voice by voice", () => {
    const { state } = world();
    const lines = explainReligionLedger(state, 0);
    // Every way the fixture pays: two gods, a follower belief, an enhancer, a
    // rite and the founder's share.
    expect(lines.length).toBeGreaterThanOrEqual(5);
    const folded = foldReligionLedger(lines);
    for (const voice of explainLedger(state, 0)) {
      expect(folded[voice.key], voice.key).toBe(voice.byClass.religion);
    }
  });

  it('names each card that paid, and pays each its own voices', () => {
    const { state } = world();
    const lines = explainReligionLedger(state, 0);
    const paidBy = (card: string) =>
      lines.find((line) => line.source.kind === 'card' && line.source.card === card)?.paid;
    expect(paidBy('sacredFire')?.faith).toBeGreaterThan(0);
    expect(paidBy('theQuietHours')?.culture).toBeGreaterThan(0);
    expect(paidBy('omenReading')?.science).toBeGreaterThan(0);
    expect(paidBy('pilgrimsCoin')?.gold).toBeGreaterThan(0);
  });
});

describe('the Religion class, place by place', () => {
  it('is explainReligionLedger, source for source, in the same order', () => {
    const { state } = world();
    const plain = explainReligionLedger(state, 0);
    const byPlace = explainReligionLedgerByPlace(state, 0);
    expect(byPlace.map((line) => line.source)).toEqual(plain.map((line) => line.source));
    byPlace.forEach((line, index) => expect(line.paid, JSON.stringify(line.source)).toEqual(plain[index]!.paid));
  });

  it("adds each source's places up to its figure", () => {
    const { state } = world();
    for (const line of explainReligionLedgerByPlace(state, 0)) {
      expect(line.parts.length, JSON.stringify(line.source)).toBeGreaterThan(0);
      expect(foldReligionLedger(line.parts.map((part) => ({ source: line.source, paid: part.paid })))).toEqual(
        line.paid,
      );
    }
  });

  it("gives a town's part as that town's own line, and the founder's share to the empire", () => {
    const { state } = world();
    const byPlace = explainReligionLedgerByPlace(state, 0);
    const town = state.cities.find((city) => city.ownerId === 0)!;
    for (const line of religionLinesOfCity(state, town)) {
      const entry = byPlace.find((one) => one.source.kind === 'card' && one.source.card === line.card)!;
      expect(entry.parts.find((part) => part.cityId === town.id)?.paid, line.card).toEqual(line.paid);
    }
    // The kept rite is one of them, which is the figure the Rites tab prints.
    expect(religionLinesOfCity(state, town).find((line) => line.card === 'omenReading')?.paid.science).toBeGreaterThan(0);
    const share = byPlace.find((one) => one.source.kind === 'founderShare')!;
    expect(share.parts.map((part) => part.cityId)).toEqual([null]);
  });

  it('reads the board and changes nothing', () => {
    const { state } = world();
    const before = JSON.stringify(state);
    explainReligionLedgerByPlace(state, 0);
    religionLinesOfCity(state, state.cities[0]!);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("the founder's share", () => {
  it('is credited to its religion, never to the belief its line carries', () => {
    const { state, religion } = world();
    const trickle = explainCardEmpireYields(state, 0).filter(
      (line) => line.founderShare === religion.id,
    );
    expect(trickle.length).toBeGreaterThan(0);
    // The line still carries the first enhancer's id, because every line must
    // carry a card; its own source is the religion.
    expect(trickle.every((line) => line.card === 'pilgrimsCoin')).toBe(true);
    const share = explainReligionLedger(state, 0).find(
      (line) => line.source.kind === 'founderShare',
    );
    expect(share?.source).toEqual({ kind: 'founderShare', religion: religion.id });
    const trickleFaith = trickle.reduce((sum, line) => sum + line.faith, 0);
    expect(trickleFaith).toBe(1);
    expect(share!.paid.faith).toBe(trickleFaith);
    // Pilgrims' Coin is credited with its own gold and none of the share's faith.
    const coin = explainReligionLedger(state, 0).find(
      (line) => line.source.kind === 'card' && line.source.card === 'pilgrimsCoin',
    );
    expect(coin!.paid.faith).toBe(0);
  });

  it('says what it counts in words, with no multiplier', () => {
    const { state, religion } = world();
    const label = (): string[] =>
      explainCardEmpireYields(state, 0)
        .filter((line) => line.founderShare === religion.id)
        .map((line) => line.source);
    expect(label()).toEqual([`Religion · ${religion.name} · founder's share from 1 foreign city`]);
    // A second foreign town: the plural, and the gold half (one gold for every
    // two) joins with the same words.
    const another = foundCityAt(state, 1, getTileAt(state.map, 9, 9)!);
    another.followers = { [religion.id]: another.population };
    bumpRevision(state);
    const twice = label();
    expect(twice.length).toBe(2);
    for (const source of twice) {
      expect(source).toBe(`Religion · ${religion.name} · founder's share from 2 foreign cities`);
      expect(source).not.toMatch(/×/);
    }
  });

  it('is filed under religion even before the faith holds a belief', () => {
    // With no belief to borrow, the share's line carries the government's id,
    // which would have filed it under the deck.
    const { state, religion } = world();
    religion.follower = [];
    religion.enhancer = [];
    bumpRevision(state);
    const government = playerById(state, 0)!.statecraft.government;
    const line = explainEmpireLines(state, 0).find((one) => one.founderShare === religion.id)!;
    expect(line.card).toBe(government);
    expect(classifyEmpireLine(line)).toBe('religion');
    expect(explainDeckLedger(state, 0).some((one) => one.card === government && one.paid.faith > 0)).toBe(false);
    const share = explainReligionLedger(state, 0).find((one) => one.source.kind === 'founderShare');
    expect(share!.paid.faith).toBe(line.faith);
  });
});

describe('the faith headline', () => {
  /** The fixture with The Camp Chaplains seated: an Order paying faith. */
  function withChaplains(): GameState {
    const { state } = world();
    const player = playerById(state, 0)!;
    const chaplains = 'dominionTheCampChaplains' as OrderId;
    player.statecraft.orders = [chaplains];
    player.statecraft.slots = [{ card: chaplains, sealedUntil: 0 }];
    bumpRevision(state);
    return state;
  }

  it("folds to the top bar's faith figure", () => {
    const state = withChaplains();
    expect(foldFaithLedger(explainFaithLedger(state, 0))).toBeCloseTo(
      readEmpire(state, 0).totals.faith,
      9,
    );
  });

  it('opens the Religion class into its sources and keeps every Order in one deck slice', () => {
    const state = withChaplains();
    const faith = explainFaithLedger(state, 0);
    // The deck is one slice, and it is paying: The Camp Chaplains counts the
    // seat's units.
    const deck = faith.filter((line) => line.kind === 'class' && line.class === 'deck');
    expect(deck).toHaveLength(1);
    expect(deck[0]!.faith).toBeGreaterThan(0);
    // No slice names an Order, and the Religion class is never a whole slice.
    for (const line of faith) {
      if (line.kind === 'class') {
        expect(line.class).not.toBe('religion');
        continue;
      }
      if (line.source.kind === 'card') expect(isOrderId(line.source.card), line.source.card).toBe(false);
    }
    // The religion's slices are the Ledger's Religion faith.
    const religionFaith = faith
      .filter((line) => line.kind === 'religion')
      .reduce((sum, line) => sum + line.faith, 0);
    const ledger = explainLedger(state, 0).find((voice) => voice.key === 'faith')!;
    expect(religionFaith).toBeCloseTo(ledger.byClass.religion, 9);
    // And nothing paying no faith is drawn.
    expect(faith.every((line) => line.faith !== 0)).toBe(true);
  });

  it('reads the board and changes nothing', () => {
    const state = withChaplains();
    const before = JSON.stringify(state);
    explainFaithLedger(state, 0);
    explainReligionLedger(state, 0);
    expect(JSON.stringify(state)).toBe(before);
  });
});
