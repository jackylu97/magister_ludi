/**
 * **The decks rework, D1a — the structure, pinned** (`docs/plans/decks-rework.md`
 * "D1a", its "Pins" line; the design of record is `docs/six-decks-first-cut.md`
 * — "The structure", "Leader pools", "Availability and offer rules", "Doctrine
 * reward hands"; ruled `docs/flags.md` (iiiiii)).
 *
 * What is pinned, in the plan's own order: the seat pool for a two-deck leader
 * and for the rainbow; the bands gated on the ladder tier **and** the research
 * age; the draw's positions and cadence over twenty seeded hands; the
 * rarity-first odds within tolerance; a charter pick that grants and seats
 * nothing; the reward hands at the three counts; the retired rows in no pool;
 * a replayed log byte-identical; and the design doc's structure paragraphs
 * sync-tested where they state a number (chairs, counts, probabilities, the
 * leader pools).
 *
 * **The shelf is stocked by the bench** (`stockStandardDecks`): every
 * pre-rework row is `retired: true` and D1b's rows do not exist yet, so a test
 * about the draw un-retires rows of the table into decks for the file's
 * lifetime and puts them back after. The one describe that runs *unstocked*
 * is the honest state of D1a itself — every seat's pool empty, every draft an
 * exhausted hand that charges nothing.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import { type Game, createGame, dispatch, snapshotState } from '../../src/sim/game';
import { LEADER_IDS, leaderDecks, leaderDef } from '../../src/sim/leaderData';
import { RITE_IDS, riteAbility } from '../../src/sim/religionData';
import {
  type GameState,
  type Player,
  SCHEMA_VERSION,
  newGame,
  playerById,
} from '../../src/sim/state';
import {
  HAND_POSITIONS,
  type HandPosition,
  adoptGovernmentAt,
  bandOpen,
  deckPoolOf,
  draftExhausted,
  drawOrderOffer,
  drawOrderOptions,
  drawRarityFirst,
  eligibleFor,
  eligibleRaresFor,
  expectedHandBags,
  isRainbowSeat,
  newPlayerStatecraft,
  positionBag,
  rarityFirstOdds,
  rarityOdds,
  settleDraft,
  slotOrderError,
  slotTypesOf,
  statecraftBlocker,
  thirdPositionOf,
} from '../../src/sim/statecraft';
import {
  type DeckId,
  BANDS,
  DECK_FILES,
  DECK_FILE_ORDERS,
  DECK_IDS,
  DECK_WORDS,
  DOCTRINE_IDS,
  GOVERNMENT_IDS,
  ORDER_IDS,
  REWARD_DRAFTS,
  STATECRAFT,
  TIER_LADDER,
  bandTierAt,
  chairsAtTier,
  doctrineDef,
  governmentDef,
  governmentsAtTier,
  isDeckId,
  orderDef,
  orderIsDealt,
  ordersForDecks,
  slotCount,
} from '../../src/sim/statecraftData';
import { hasAbility, isUnlocked, researchError } from '../../src/sim/tech';
import { TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
import { stockDecks, stockStandardDecks, stockedShelf } from './statecraftHelpers';

// --- the design doc, read ------------------------------------------------------

const docFiles = import.meta.glob('../../docs/six-decks-first-cut.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const DOC = Object.values(docFiles)[0] as string;

/** The rows of the first table under a heading, cells trimmed, header and rule skipped. */
function docTable(heading: string): string[][] {
  const start = DOC.indexOf(heading);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const lines = DOC.slice(start).split('\n').slice(1);
  const rows: string[][] = [];
  let inTable = false;
  for (const line of lines) {
    if (!line.startsWith('|')) {
      if (inTable) break;
      continue;
    }
    inTable = true;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.every((cell) => /^-+$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows.slice(1);
}

// --- fixtures -------------------------------------------------------------------

/** A two-seat duel: seat 0 under a two-deck figure, seat 1 under the rainbow. */
function seated(seed = 11): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: 'pachacuti' },
      { name: 'Bors', color: '#3a7fe8', leader: 'ibnBattutaOfTangier' },
    ],
  });
}

/** Fills the meter and deals a draft to this seat; answers what it dealt. */
function dealTo(state: GameState, player: Player) {
  player.culturePool = 10_000;
  return settleDraft(state, player);
}

/** A technology of this age, for the research-age gate. */
function techOfAge(age: 1 | 2 | 3 | 4): TechId {
  const id = TECH_IDS.find((tech) => techDef(tech).age === age);
  expect(id, `a technology of age ${age}`).toBeDefined();
  return id!;
}

describe('the schema, as landed', () => {
  it('gives every Order and Doctrine row a deck list and a band, and retires every one of them', () => {
    for (const id of ORDER_IDS) {
      const def = orderDef(id);
      expect(Array.isArray(def.decks), id).toBe(true);
      expect(def.decks.length, id).toBeLessThanOrEqual(2);
      expect(new Set(def.decks).size, id).toBe(def.decks.length);
      for (const deck of def.decks) expect(isDeckId(deck), `${id}: ${deck}`).toBe(true);
      expect(BANDS, id).toContain(def.band);
      // D1a: the old shelf is kept and dealt by nobody. D1b's rows are the
      // first live ones.
      expect(def.retired, id).toBe(true);
      expect(orderIsDealt(id), id).toBe(false);
    }
    for (const id of DOCTRINE_IDS) {
      const def = doctrineDef(id);
      expect(Array.isArray(def.decks), id).toBe(true);
      expect(BANDS, id).toContain(def.band);
      expect(def.retired, id).toBe(true);
    }
  });

  it('leaves the old pool and office fields in place on every retired row, read by nothing that deals', () => {
    for (const id of ORDER_IDS) {
      expect(orderDef(id).pool, id).toBeDefined();
      expect(orderDef(id).slot, id).toBeDefined();
    }
    // The register: nothing under `src/sim/statecraft/` reads `.pool` or `.slot`
    // to deal a card. The one reading of the office is `orderSlot`, for the
    // surfaces that still print it.
    const sources = import.meta.glob('../../src/sim/statecraft/draft.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    });
    const draft = Object.values(sources)[0] as string;
    expect(draft).not.toMatch(/orderDef\([^)]*\)\.pool\b/);
    expect(draft).not.toMatch(/poolOfGovernment\(/);
  });

  it('is a four-rung ladder with universal chairs, and every government carries its rung’s count', () => {
    expect(TIER_LADDER.map((rung) => rung.drafts)).toEqual([0, 4, 18, 29]);
    expect(TIER_LADDER.map((rung) => rung.chairs)).toEqual([3, 4, 6, 9]);
    expect(REWARD_DRAFTS).toEqual([4, 18, 29]);
    for (const id of GOVERNMENT_IDS) {
      const def = governmentDef(id);
      expect(def.chairs, id).toBe(chairsAtTier(def.tier));
      expect(slotCount(id), id).toBe(def.chairs);
    }
    // A tier between two rungs keeps the rung below it.
    expect(chairsAtTier(10)).toBe(4);
    expect(chairsAtTier(45)).toBe(9);
    expect(bandTierAt(0)).toBe(0);
    expect(bandTierAt(3)).toBe(0);
    expect(bandTierAt(4)).toBe(1);
    expect(bandTierAt(17)).toBe(1);
    expect(bandTierAt(18)).toBe(2);
    expect(bandTierAt(29)).toBe(3);
    expect(bandTierAt(400)).toBe(3);
  });

  it('draws rarity first at 60 / 30 / 10, and a pass moves points out of common', () => {
    expect(STATECRAFT.rarityOdds).toEqual({ common: 60, uncommon: 30, rare: 10 });
    expect('rarityWeights' in STATECRAFT).toBe(false);
    const plain = rarityOdds(0);
    expect(plain.common + plain.uncommon + plain.rare).toBe(100);
    const once = rarityOdds(1);
    expect(once.common).toBeLessThan(plain.common);
    expect(once.uncommon).toBeGreaterThan(plain.uncommon);
    expect(once.rare).toBeGreaterThan(plain.rare);
    expect(once.common + once.uncommon + once.rare).toBeCloseTo(100, 6);
    // The floor: however many passes, common never goes negative and the three
    // still sum to the table.
    const many = rarityOdds(50);
    expect(many.common).toBe(0);
    expect(many.common + many.uncommon + many.rare).toBeCloseTo(100, 6);
  });

  it('opens every council with three universal chairs, and the rainbow’s with four', () => {
    const fresh = newPlayerStatecraft();
    expect(fresh.slots).toHaveLength(3);
    expect(fresh.rewardHands).toEqual([]);
    expect(slotTypesOf(fresh).every((type) => type === 'wildcard')).toBe(true);
    const g = seated();
    expect(playerById(g.state, 0)!.statecraft.slots).toHaveLength(3);
    // A Guest at Every Court: one more chair, additive on top of the count.
    expect(playerById(g.state, 1)!.statecraft.slots).toHaveLength(4);
  });

  it('bumps the schema: a pre-rework save is refused, and the seat carries the four new fields', () => {
    expect(SCHEMA_VERSION).toBe(119);
    const g = seated();
    const seat = playerById(g.state, 0)!;
    expect(seat.decks).toEqual(['expansionist', 'commerce']);
    expect(seat.charteredTechs).toEqual([]);
    expect(seat.charteredBuildings).toEqual([]);
    expect(seat.charteredRites).toEqual([]);
    // The wild, where a board seats one, holds nothing.
    const wild = g.state.players.find((p) => p.barbarian);
    if (wild !== undefined) expect(wild.decks).toEqual([]);
  });
});

describe('the leader pools', () => {
  it('gives every figure two distinct decks, or the rainbow — Ibn Battuta', () => {
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      if (def.rainbow === true) {
        expect(id).toBe('ibnBattutaOfTangier');
        expect(def.decks).toBeUndefined();
        expect(leaderDecks(id)).toEqual([...DECK_IDS]);
        continue;
      }
      expect(def.decks, id).toHaveLength(2);
      expect(def.decks![0]).not.toBe(def.decks![1]);
      expect(leaderDecks(id)).toEqual([...def.decks!]);
    }
    // A seat under nobody holds every deck — the harness seat, stated in
    // `leaderDecks`.
    expect(leaderDecks(undefined)).toEqual([...DECK_IDS]);
  });

  it('mirrors the design doc’s "Leader pools" table, figure for figure', () => {
    const rows = docTable('## Leader pools');
    expect(rows.length).toBe(LEADER_IDS.length);
    const wordToDeck = new Map(DECK_IDS.map((deck) => [DECK_WORDS[deck], deck] as const));
    for (const [name, decks] of rows) {
      // The doc's table says "Taizong" where the sheet says "Emperor Taizong",
      // "Mithridates" for "Mithridates VI" — the figure's name contains the
      // table's word, and exactly one figure's does.
      const matches = LEADER_IDS.filter((id) => leaderDef(id).name.includes(name!));
      expect(matches, `the doc names "${name}"`).toHaveLength(1);
      const id = matches[0];
      if (decks!.startsWith('Rainbow')) {
        expect(leaderDef(id!).rainbow, name).toBe(true);
        continue;
      }
      const wanted = decks!.split('+').map((word) => wordToDeck.get(word.trim()));
      expect(wanted, `${name}: ${decks}`).not.toContain(undefined);
      expect(leaderDecks(id!), name).toEqual(wanted);
    }
  });

  it('writes the config’s own decks onto the seat when it names them, and refuses a bad list', () => {
    const made = newGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', leader: 'pachacuti', decks: ['devotion', 'magisterial'] },
        { name: 'B', color: '#00a' },
      ],
    });
    expect(playerById(made, 0)!.decks).toEqual(['devotion', 'magisterial']);
    expect(playerById(made, 1)!.decks).toEqual([...DECK_IDS]);
    expect(() =>
      newGame({ seed: 3, sizeName: 'duel', players: [{ name: 'A', color: '#a00', decks: ['devotion', 'devotion'] }] }),
    ).toThrow(/twice/);
    expect(() =>
      newGame({ seed: 3, sizeName: 'duel', players: [{ name: 'A', color: '#a00', decks: ['tarot' as DeckId] }] }),
    ).toThrow(/Unknown deck/);
    expect(() =>
      newGame({ seed: 3, sizeName: 'duel', players: [{ name: 'A', color: '#a00', decks: [] }] }),
    ).toThrow(/no deck/);
  });
});

describe('the design doc’s numbers', () => {
  it('bands: the four rungs, their draft counts and their chairs are the ladder', () => {
    const rows = docTable('### Four content bands, independent of government form');
    expect(rows.length).toBe(TIER_LADDER.length);
    rows.forEach((row, index) => {
      const unlock = row[2]!;
      const drafts = unlock === 'Start' ? 0 : Number(/Regular draft count (\d+)/.exec(unlock)?.[1]);
      expect(drafts, unlock).toBe(TIER_LADDER[index]!.drafts);
      expect(Number(row[3]), row[0]).toBe(TIER_LADDER[index]!.chairs);
    });
  });

  it('rarity: the 60 / 30 / 10 of rule 1 is the table', () => {
    const match = /(\d+)% C \/ (\d+)% U \/ (\d+)% R/.exec(DOC);
    expect(match).not.toBeNull();
    expect(STATECRAFT.rarityOdds).toEqual({
      common: Number(match![1]),
      uncommon: Number(match![2]),
      rare: Number(match![3]),
    });
  });

  it('reward hands: the milestones of "Doctrine reward hands" are the ladder’s later rungs', () => {
    const section = DOC.slice(DOC.indexOf('### Doctrine reward hands'));
    const match = /milestones \*\*(\d+), (\d+) and (\d+)\*\*/.exec(section);
    expect(match).not.toBeNull();
    expect(REWARD_DRAFTS).toEqual([Number(match![1]), Number(match![2]), Number(match![3])]);
  });

  it('the cadence of rule 2 — generic, cross-type, generic, single-type — is the third position’s', () => {
    expect(DOC).toContain('**generic, cross-type, generic, single-type**');
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((n) => thirdPositionOf(n).turn)).toEqual([
      'generic', 'cross', 'generic', 'single', 'generic', 'cross', 'generic', 'single',
    ]);
    expect(thirdPositionOf(4).single).toBe(0);
    expect(thirdPositionOf(8).single).toBe(1);
    expect(thirdPositionOf(12).single).toBe(2);
  });
});

describe('the honest state of D1a — every shelf empty', () => {
  it('deals nobody anything: the pool is empty, the draft is exhausted, and nothing is charged', () => {
    const g = seated();
    for (const seat of [0, 1]) {
      const player = playerById(g.state, seat)!;
      expect(deckPoolOf(g.state, player)).toEqual([]);
      expect(eligibleFor(g.state, player)).toEqual([]);
      player.culturePool = 500;
      const before = snapshotState(g.state);
      expect(settleDraft(g.state, player)).toBeNull();
      expect(snapshotState(g.state)).toBe(before);
      expect(player.culturePool).toBe(500);
      expect(player.statecraft.drafts).toBe(0);
      expect(player.statecraft.pendingOrder).toBeUndefined();
      expect(draftExhausted(g.state, player)).toBe(true);
      expect(statecraftBlocker(player)).toBeNull();
    }
    // And the bot's plan reads the same emptiness: no bags, nothing to weigh.
    expect(expectedHandBags(g.state, playerById(g.state, 0)!)).toEqual([]);
  });
});

describe('with the shelf stocked', () => {
  let restore: () => void = () => {};
  beforeAll(() => {
    restore = stockStandardDecks();
  });
  afterAll(() => restore());

  it('a two-deck seat’s pool is exactly its two decks, the commons and the either-type crosses', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const pool = new Set(deckPoolOf(g.state, ada));
    const shelf = stockedShelf();
    for (const { deck, id } of shelf) {
      const home = orderDef(id).decks;
      const shelfOf: string = deck;
      const wanted =
        shelfOf === 'generic' ||
        (shelfOf === 'cross' && home.some((d) => ada.decks.includes(d))) ||
        (shelfOf !== 'cross' && shelfOf !== 'generic' && ada.decks.includes(deck as DeckId));
      expect(pool.has(id), `${id} (${deck})`).toBe(wanted);
    }
    // Exactly: nothing in the pool is off the shelf.
    for (const id of pool) expect(shelf.some((row) => row.id === id), id).toBe(true);
    // Two decks of eight, the three crosses that name either (each deck is
    // paired with its neighbour on the stocked shelf), six generic.
    expect(pool.size).toBe(8 + 8 + 3 + 6);
  });

  it('the rainbow seat’s pool is everything dealt', () => {
    const g = seated();
    const bors = playerById(g.state, 1)!;
    expect(isRainbowSeat(bors)).toBe(true);
    expect(deckPoolOf(g.state, bors)).toEqual(ordersForDecks(DECK_IDS));
    expect(deckPoolOf(g.state, bors)).toHaveLength(stockedShelf().length);
  });

  it('gates every band on the ladder tier AND the research age — both, per the age check', () => {
    expect(bandOpen(0, 0, 1)).toBe(true);
    expect(bandOpen(1, 1, 1)).toBe(false);
    expect(bandOpen(1, 0, 2)).toBe(false);
    expect(bandOpen(1, 1, 2)).toBe(true);
    expect(bandOpen(3, 3, 3)).toBe(false);
    expect(bandOpen(3, 3, 4)).toBe(true);
    expect(bandOpen(0, 3, 4)).toBe(true);

    const g = seated();
    const ada = playerById(g.state, 0)!;
    const bandsOf = (): number[] => [...new Set(eligibleFor(g.state, ada).map((id) => orderDef(id).band))].sort();
    // Drafts 0, age 1: the opening shelf alone.
    expect(bandsOf()).toEqual([0]);
    // Culture alone reaches Government I; the age still says one.
    ada.statecraft.drafts = 4;
    expect(bandsOf()).toEqual([0]);
    // The age comes: band 1 opens.
    ada.techsResearched.push(techOfAge(2));
    expect(bandsOf()).toEqual([0, 1]);
    // Age three, still at four drafts: nothing more — the tier is the other gate.
    ada.techsResearched.push(techOfAge(3));
    expect(bandsOf()).toEqual([0, 1]);
    ada.statecraft.drafts = 18;
    expect(bandsOf()).toEqual([0, 1, 2]);
    ada.statecraft.drafts = 29;
    expect(bandsOf()).toEqual([0, 1, 2]);
    ada.techsResearched.push(techOfAge(4));
    expect(bandsOf()).toEqual([0, 1, 2, 3]);
  });

  it('deals two positions from the seat’s decks and the third by the cadence, over twenty seeded hands', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    const cadence: string[] = [];
    for (let n = 1; n <= 20; n++) {
      sc.drafts = n;
      delete sc.pendingOrder;
      const offer = drawOrderOffer(g.state, ada);
      expect(offer.positions).toHaveLength(HAND_POSITIONS);
      expect(offer.options).toHaveLength(HAND_POSITIONS);
      const [first, second, third] = offer.positions as HandPosition[];
      expect(first).toEqual({ kind: 'deck', deck: 'expansionist' });
      expect(second).toEqual({ kind: 'deck', deck: 'commerce' });
      const turn = thirdPositionOf(n);
      if (turn.turn === 'generic') expect(third).toEqual({ kind: 'generic' });
      else if (turn.turn === 'cross') expect(third).toEqual({ kind: 'cross' });
      else expect(third).toEqual({ kind: 'deck', deck: ada.decks[turn.single % 2] });
      // Each dealt card answers its position's ask (the bag is never empty on
      // this shelf, so the fallback is never taken).
      const eligible = eligibleFor(g.state, ada);
      offer.options.forEach((id, index) => {
        expect(positionBag(eligible, offer.positions![index]!, ada.decks), `${n}:${index}`).toContain(id);
      });
      expect(new Set(offer.options).size).toBe(offer.options.length);
      cadence.push(third!.kind === 'deck' ? `single:${third!.deck}` : third!.kind);
    }
    expect(cadence).toEqual([
      'generic', 'cross', 'generic', 'single:expansionist',
      'generic', 'cross', 'generic', 'single:commerce',
      'generic', 'cross', 'generic', 'single:expansionist',
      'generic', 'cross', 'generic', 'single:commerce',
      'generic', 'cross', 'generic', 'single:expansionist',
    ]);
  });

  it('samples the rainbow two distinct decks a hand, and a third deck on the single turn', () => {
    const g = seated();
    const bors = playerById(g.state, 1)!;
    const sc = bors.statecraft;
    const seen = new Set<DeckId>();
    for (let n = 1; n <= 40; n++) {
      sc.drafts = n;
      delete sc.pendingOrder;
      const offer = drawOrderOffer(g.state, bors);
      const [first, second, third] = offer.positions as HandPosition[];
      expect(first!.kind).toBe('deck');
      expect(second!.kind).toBe('deck');
      expect((first as { deck: DeckId }).deck).not.toBe((second as { deck: DeckId }).deck);
      seen.add((first as { deck: DeckId }).deck);
      seen.add((second as { deck: DeckId }).deck);
      if (thirdPositionOf(n).turn === 'single') {
        expect(third!.kind).toBe('deck');
        expect([(first as { deck: DeckId }).deck, (second as { deck: DeckId }).deck]).not.toContain(
          (third as { deck: DeckId }).deck,
        );
      }
    }
    expect(seen.size).toBe(DECK_IDS.length);
  });

  it('draws rarity first at the table’s odds, within tolerance, and the pity shifts them', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const bag = eligibleFor(g.state, ada).filter((id) => orderDef(id).decks[0] === 'expansionist' && orderDef(id).decks.length === 1);
    expect(bag.length).toBeGreaterThanOrEqual(3);
    const tally = (skips: number, draws: number) => {
      const counts = { common: 0, uncommon: 0, rare: 0 };
      for (let i = 0; i < draws; i++) counts[orderDef(drawRarityFirst(g.state, bag, skips)!).rarity] += 1;
      return counts;
    };
    const plain = tally(0, 4000);
    expect(plain.rare / 4000).toBeGreaterThan(0.07);
    expect(plain.rare / 4000).toBeLessThan(0.13);
    expect(plain.uncommon / 4000).toBeGreaterThan(0.26);
    expect(plain.uncommon / 4000).toBeLessThan(0.34);
    const pitied = tally(2, 4000);
    expect(pitied.common / 4000).toBeLessThan(plain.common / 4000 - 0.15);
    expect(pitied.rare / 4000).toBeGreaterThan(plain.rare / 4000 + 0.05);
    // The written distribution agrees with the sampled one: per rung, the
    // odds sum to the rung's renormalised share.
    const odds = rarityFirstOdds(bag, 0);
    const share = (rarity: string) => odds.filter(({ id }) => orderDef(id).rarity === rarity).reduce((s, o) => s + o.chance, 0);
    expect(share('common')).toBeCloseTo(0.6, 6);
    expect(share('uncommon')).toBeCloseTo(0.3, 6);
    expect(share('rare')).toBeCloseTo(0.1, 6);
    expect(odds.reduce((s, o) => s + o.chance, 0)).toBeCloseTo(1, 6);
  });

  it('renormalises over the rungs present when one is absent, and spends one roll a card', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const noRares = eligibleFor(g.state, ada).filter((id) => orderDef(id).rarity !== 'rare');
    const odds = rarityFirstOdds(noRares, 0);
    const share = (rarity: string) => odds.filter(({ id }) => orderDef(id).rarity === rarity).reduce((s, o) => s + o.chance, 0);
    expect(share('common')).toBeCloseTo(60 / 90, 6);
    expect(share('uncommon')).toBeCloseTo(30 / 90, 6);
    const before = g.state.rng.state;
    drawRarityFirst(g.state, noRares, 0);
    const afterOne = g.state.rng.state;
    expect(afterOne).not.toBe(before);
    // An empty bag spends nothing.
    expect(drawRarityFirst(g.state, [], 0)).toBeUndefined();
    expect(g.state.rng.state).toBe(afterOne);
  });

  it('excludes the held and the hand, falls back to the union, deals a smaller hand, and charges nothing when dry', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    // Hold every expansionist single: the first position falls back to the union.
    const expansionist = eligibleFor(g.state, ada).filter((id) => orderDef(id).decks.length === 1 && orderDef(id).decks[0] === 'expansionist');
    sc.orders.push(...expansionist);
    sc.drafts = 1;
    const offer = drawOrderOffer(g.state, ada);
    expect(offer.options).toHaveLength(3);
    for (const id of offer.options) expect(sc.orders).not.toContain(id);
    expect(new Set(offer.options).size).toBe(3);
    // Hold everything but two: the hand is two.
    const left = eligibleFor(g.state, ada);
    sc.orders.push(...left.slice(2));
    delete sc.pendingOrder;
    expect(drawOrderOffer(g.state, ada).options).toHaveLength(2);
    // Hold the last two: exhausted — no draft, no charge, no count.
    sc.orders.push(...left.slice(0, 2));
    delete sc.pendingOrder;
    expect(eligibleFor(g.state, ada)).toEqual([]);
    ada.culturePool = 1000;
    const before = snapshotState(g.state);
    expect(settleDraft(g.state, ada)).toBeNull();
    expect(snapshotState(g.state)).toBe(before);
    expect(draftExhausted(g.state, ada)).toBe(true);
  });

  it('adds a rider’s extra cards after the base hand, from the union, distinct', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const eligible = eligibleFor(g.state, ada);
    const positions: HandPosition[] = [
      { kind: 'deck', deck: 'expansionist' },
      { kind: 'deck', deck: 'commerce' },
      { kind: 'generic' },
    ];
    const hand = drawOrderOptions(g.state, eligible, positions, 5, 0, ada.decks);
    expect(hand).toHaveLength(5);
    expect(new Set(hand).size).toBe(5);
    expect(orderDef(hand[0]!).decks).toEqual(['expansionist']);
    expect(orderDef(hand[1]!).decks).toEqual(['commerce']);
    expect(orderDef(hand[2]!).decks).toEqual([]);
  });

  it('keeps a redraw in the hand’s own positions, and deals the same hand from the same state', () => {
    const a = seated();
    const b = seated();
    for (const g of [a, b]) {
      const bors = playerById(g.state, 1)!;
      bors.statecraft.drafts = 1;
    }
    const first = drawOrderOffer(a.state, playerById(a.state, 1)!);
    const twin = drawOrderOffer(b.state, playerById(b.state, 1)!);
    expect(twin).toEqual(first);
    // A redraw over the standing hand keeps its rainbow decks (rule 6).
    const bors = playerById(a.state, 1)!;
    bors.statecraft.pendingOrder = first;
    const again = drawOrderOffer(a.state, bors);
    expect(again.positions).toEqual(first.positions);
  });

  it('banks a reward hand at 4, 18 and 29 that blocks nothing, and deals rares only when opened', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    for (let n = 1; n <= 4; n++) {
      const dealt = dealTo(g.state, ada);
      expect(dealt, `draft ${n}`).not.toBeNull();
      expect(sc.drafts).toBe(n);
      expect(sc.rewardHands).toEqual(n < 4 ? [] : [4]);
      expect(applyCommand(g.state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
    }
    expect(statecraftBlocker(ada)).toBeNull();
    // Opening: a command, taken; the count spent; three rares from the seat's
    // decks on the table.
    expect(applyCommand(g.state, { type: 'openRewardHand', playerId: 0 }).ok).toBe(true);
    expect(sc.rewardHands).toEqual([]);
    const offer = sc.pendingReward!;
    expect(offer.drafts).toBe(4);
    expect(offer.options.length).toBeGreaterThan(0);
    expect(offer.options.length).toBeLessThanOrEqual(3);
    for (const id of offer.options) {
      expect(orderDef(id).rarity, id).toBe('rare');
      expect(sc.orders).not.toContain(id);
    }
    expect(offer.positions![0]).toEqual({ kind: 'deck', deck: 'expansionist' });
    expect(offer.positions![1]).toEqual({ kind: 'deck', deck: 'commerce' });
    expect(statecraftBlocker(ada)).toBeNull();
    // A second open is refused byte-identically while one is on the table.
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'openRewardHand', playerId: 0 }).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
    // The pick lands in the collection and clears the hand.
    const taken = offer.options[0]!;
    expect(applyCommand(g.state, { type: 'chooseReward', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(sc.orders).toContain(taken);
    expect(sc.pendingReward).toBeUndefined();
    // And a rare taken here is out of every later normal hand.
    for (let n = 0; n < 10; n++) {
      delete sc.pendingOrder;
      expect(drawOrderOffer(g.state, ada).options).not.toContain(taken);
    }
  });

  it('passes a reward for nothing, refuses the three verbs with nothing on the table, and resolves an empty shelf as exhausted', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    for (const verb of ['openRewardHand', 'chooseReward', 'passReward'] as const) {
      const before = snapshotState(g.state);
      const command = verb === 'chooseReward'
        ? { type: verb, playerId: 0, optionIndex: 0 }
        : { type: verb, playerId: 0 };
      expect(applyCommand(g.state, command).ok, verb).toBe(false);
      expect(snapshotState(g.state), verb).toBe(before);
    }
    sc.rewardHands.push(4);
    expect(applyCommand(g.state, { type: 'openRewardHand', playerId: 0 }).ok).toBe(true);
    const skipsBefore = sc.orderSkips;
    expect(applyCommand(g.state, { type: 'passReward', playerId: 0 }).ok).toBe(true);
    expect(sc.pendingReward).toBeUndefined();
    expect(sc.orderSkips).toBe(skipsBefore);
    // Every rare held: the reward comes to nothing, at no cost.
    sc.orders.push(...eligibleRaresFor(g.state, ada));
    expect(eligibleRaresFor(g.state, ada)).toEqual([]);
    sc.rewardHands.push(18);
    const result = applyCommand(g.state, { type: 'openRewardHand', playerId: 0 });
    expect(result.ok).toBe(true);
    expect(result.ok && result.rewardExhausted).toBe(true);
    expect(sc.rewardHands).toEqual([]);
    expect(sc.pendingReward).toBeUndefined();
  });

  it('seats a hand’s cards in any chair — universal — and adoption widens the council to its tier’s count', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    const dealt = dealTo(g.state, ada)!;
    const id = dealt.offer.options[0]!;
    expect(applyCommand(g.state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    for (let chair = 0; chair < sc.slots.length; chair++) {
      expect(slotOrderError(g.state, 0, id, chair), `chair ${chair}`).toBeNull();
    }
    sc.pendingGovernment = { tier: 4, options: governmentsAtTier(4) };
    adoptGovernmentAt(g.state, ada, 0);
    expect(sc.slots).toHaveLength(4);
    expect(slotTypesOf(sc).every((type) => type === 'wildcard')).toBe(true);
  });

  it('replays a sequence of drafts, a reward opened and taken, and a reward passed, byte for byte', () => {
    // `statecraft.slow.test.ts`'s shape: the same script on two fresh games
    // — culture the duel would never earn written in at the same points, every
    // decision a dispatched command — and the two boards compared byte for
    // byte. The script drafts to the first reward, opens it, takes a rare,
    // drafts on, and passes the next hand.
    const play = () => {
      const g = seated(5);
      const ada = playerById(g.state, 0)!;
      const bors = playerById(g.state, 1)!;
      let opened = 0;
      for (let turn = 0; turn < 8; turn++) {
        ada.culturePool += 10_000;
        bors.culturePool += 10_000;
        expect(dispatch(g, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
        expect(dispatch(g, { type: 'endTurn', playerId: 1 }).ok).toBe(true);
        if (ada.statecraft.pendingOrder !== undefined) {
          expect(dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
        }
        if (bors.statecraft.pendingOrder !== undefined) {
          expect(dispatch(g, { type: 'skipOrderOffer', playerId: 1 }).ok).toBe(true);
        }
        if (ada.statecraft.rewardHands.length > 0) {
          expect(dispatch(g, { type: 'openRewardHand', playerId: 0 }).ok).toBe(true);
          opened += 1;
          if (ada.statecraft.pendingReward !== undefined) {
            expect(dispatch(g, { type: 'chooseReward', playerId: 0, optionIndex: 0 }).ok).toBe(true);
          }
        }
        if (bors.statecraft.rewardHands.length > 0) {
          expect(dispatch(g, { type: 'openRewardHand', playerId: 1 }).ok).toBe(true);
          if (bors.statecraft.pendingReward !== undefined) {
            expect(dispatch(g, { type: 'passReward', playerId: 1 }).ok).toBe(true);
          }
        }
      }
      return { snapshot: snapshotState(g.state), log: g.log, opened, drafts: ada.statecraft.drafts };
    };
    const a = play();
    const b = play();
    expect(b.snapshot).toBe(a.snapshot);
    expect(a.drafts).toBeGreaterThanOrEqual(4);
    expect(a.opened).toBeGreaterThanOrEqual(1);
    expect(a.log.filter((command) => command.type === 'chooseReward').length).toBeGreaterThanOrEqual(1);
    expect(a.log.filter((command) => command.type === 'passReward').length).toBeGreaterThanOrEqual(1);
  });

  it('reads the bot’s expectation off the deal’s own bags', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const bags = expectedHandBags(g.state, ada);
    expect(bags).toHaveLength(3);
    const eligible = eligibleFor(g.state, ada);
    expect(bags[0]).toEqual(positionBag(eligible, { kind: 'deck', deck: 'expansionist' }, ada.decks));
    expect(bags[1]).toEqual(positionBag(eligible, { kind: 'deck', deck: 'commerce' }, ada.decks));
    expect(bags[2]).toEqual(positionBag(eligible, { kind: 'generic' }, ada.decks));
  });
});

describe('the eight files', () => {
  /**
   * **The decks' own files** (the orchestrator's structural addition to D1a):
   * a live Order lives in `data/decks/<deck>.json`, the generic and cross-type
   * rows in `data/decks/common.json`, the retired shelf in `statecraft.json`.
   * Read here **off the raw files**, not the fold, so a collision the loader
   * would throw on has a name in the register first.
   */
  const rawDecks = import.meta.glob('../../data/decks/*.json', { eager: true, import: 'default' }) as Record<
    string,
    { orders: Record<string, { decks?: unknown }> }
  >;
  const rawShelf = import.meta.glob('../../data/statecraft.json', { eager: true, import: 'default' }) as Record<
    string,
    { orders: Record<string, unknown> }
  >;

  it('are the retired shelf and the seven deck files, each starting as an orders map', () => {
    const names = Object.keys(rawDecks).map((path) => path.split('/').pop()!.replace('.json', '')).sort();
    expect(names).toEqual([...DECK_FILES].sort());
    for (const [path, file] of Object.entries(rawDecks)) {
      expect(typeof file.orders, path).toBe('object');
    }
    expect(Object.keys(rawShelf)).toHaveLength(1);
  });

  it('never write one id twice across the eight, and the fold carries every row once', () => {
    const seen = new Map<string, string>();
    const files: [string, Record<string, unknown>][] = [
      ['statecraft.json', Object.values(rawShelf)[0]!.orders],
      ...Object.entries(rawDecks).map(([path, file]) => [path.split('/').pop()!, file.orders] as [string, Record<string, unknown>]),
    ];
    let total = 0;
    for (const [name, orders] of files) {
      for (const id of Object.keys(orders)) {
        expect(seen.has(id), `"${id}" is written in ${seen.get(id)} and in ${name}`).toBe(false);
        seen.set(id, name);
        total += 1;
      }
    }
    expect(ORDER_IDS).toHaveLength(total);
    for (const id of seen.keys()) expect(ORDER_IDS, id).toContain(id);
  });

  it('keep every row of a deck file in that deck, and a common row in none or two', () => {
    for (const file of DECK_FILES) {
      for (const id of DECK_FILE_ORDERS[file]) {
        const home = orderDef(id).decks;
        if (file === 'common') {
          expect([0, 2], `${id} in common.json names ${home.length} deck(s)`).toContain(home.length);
        } else {
          expect(home, `${id} in ${file}.json`).toContain(file);
        }
      }
    }
    // The retired shelf's rows are in no deck file.
    for (const id of Object.keys(Object.values(rawShelf)[0]!.orders)) {
      for (const file of DECK_FILES) expect(DECK_FILE_ORDERS[file], `${id} in ${file}.json`).not.toContain(id);
    }
  });
});

describe('a charter', () => {
  let restore: () => void = () => {};
  const CHARTER_ROW = 'bloodedSpears';
  const CHARTERED_TECH = 'siegecraft';
  const CHARTERED_BUILDING = 'gildedHall';
  const CHARTERED_RITE = RITE_IDS[0]!;
  beforeAll(() => {
    restore = stockDecks({
      [CHARTER_ROW]: {
        decks: ['expansionist'],
        band: 0,
        rarity: 'rare',
        charter: { unlocks: { tech: CHARTERED_TECH, building: CHARTERED_BUILDING, rites: [CHARTERED_RITE] } },
      },
    });
  });
  afterAll(() => restore());

  it('applies its grant on the pick — the tech researchable, the building open, the rite known — and never sits', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const bors = playerById(g.state, 1)!;
    // Shut to everybody until drafted.
    expect(researchError(g.state, 0, CHARTERED_TECH)).toMatch(/charter/);
    expect(isUnlocked(g.state, 0, 'building', CHARTERED_BUILDING)).toBe(false);
    expect(hasAbility(g.state, 0, riteAbility(CHARTERED_RITE))).toBe(false);

    const dealt = dealTo(g.state, ada)!;
    expect(dealt.offer.options).toEqual([CHARTER_ROW]);
    const result = applyCommand(g.state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 });
    expect(result.ok).toBe(true);
    expect(ada.statecraft.orders).toContain(CHARTER_ROW);
    expect(ada.charteredTechs).toEqual([CHARTERED_TECH]);
    expect(ada.charteredBuildings).toEqual([CHARTERED_BUILDING]);
    expect(ada.charteredRites).toEqual([CHARTERED_RITE]);
    expect(researchError(g.state, 0, CHARTERED_TECH)).toBeNull();
    expect(isUnlocked(g.state, 0, 'building', CHARTERED_BUILDING)).toBe(true);
    expect(hasAbility(g.state, 0, riteAbility(CHARTERED_RITE))).toBe(true);
    // The other seat is where it was.
    expect(researchError(g.state, 1, CHARTERED_TECH)).toMatch(/charter/);
    expect(isUnlocked(g.state, 1, 'building', CHARTERED_BUILDING)).toBe(false);
    expect(bors.charteredTechs).toEqual([]);
    // Never seated.
    expect(slotOrderError(g.state, 0, CHARTER_ROW, 0)).toMatch(/charter/);
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'slotOrder', playerId: 0, cardId: CHARTER_ROW, slotIndex: 0 }).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });
});
