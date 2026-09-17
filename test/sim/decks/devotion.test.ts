/**
 * **The Devotion deck, as entered** (`docs/plans/decks-rework.md` D1b; the
 * design of record is the Devotion section of `docs/six-decks-first-cut.md` —
 * its four tier tables and the rules block above them).
 *
 * Forty-four rows, one file (`data/decks/devotion.json`), and the register this
 * test keeps is D1b's own bargain: **a card whose text fits an existing effect
 * shape is a live row, and a card that needs a shape, a predicate, an occasion
 * or a command that does not exist is a deferred row** — in the data, in the
 * Compendium, in no pool. So what is pinned here is the deck's shape rather
 * than its balance: every row folds under its own deck with a band and a rarity
 * the doc's tables say; every live row's effects are kinds the vocabulary
 * actually holds and print through the describers as sentences a player can
 * read; every deferred row carries its sentence and nothing to slot; and a
 * seeded draft for a Devotion figure deals live rows of this deck and nothing
 * else.
 *
 * The **age-2 gate** has a test of its own because it is the one rule of the
 * Devotion brief that a tier-0 row could break silently: the prophet, the
 * Temple and a foreign congregation are all age-2 things, and a first-age card
 * that named one would be offered in an age that cannot answer it.
 *
 * Core, not slow: it reads the tables, describes them and deals one seeded
 * hand. A source-reading register test is always core.
 */

import { describe, expect, it } from 'vitest';

import { type Game, createGame } from '../../../src/sim/game';
import { type GameState, type Player, playerById } from '../../../src/sim/state';
import { describeCard, eligibleFor, drawOrderOffer, settleDraft, stripRefs } from '../../../src/sim/statecraft';
import {
  type Band,
  type CardEffect,
  type CardEffectKind,
  type OrderId,
  type OrderRarity,
  BANDS,
  DECK_FILE_ORDERS,
  ORDER_IDS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';

/** The deck's own ids, in file order — the shelf everything below is asked of. */
const DEVOTION: readonly OrderId[] = DECK_FILE_ORDERS.devotion;

const LIVE = DEVOTION.filter((id) => orderIsDealt(id));
const DEFERRED = DEVOTION.filter((id) => !orderIsDealt(id));

/**
 * **The shapes this deck actually says**, declared as a typed list so that the
 * register is checked in both directions at once: a kind mistyped in the JSON
 * fails the assertion below, and a kind named here that the vocabulary does not
 * hold fails the build (`CardEffectKind` is the union's own `kind`). It is a
 * short list on purpose — most of Devotion's text waits on shapes that do not
 * exist, and the deferred table is the audit of which.
 */
const KINDS_USED = [
  'pays',
  'percentYields',
  'productionBonus',
  'combatLine',
  'conditionRule',
  'happiness',
  'unitStat',
] as const satisfies readonly CardEffectKind[];

/** The rarities the doc's C/U/R column spells. */
const RARITIES: readonly OrderRarity[] = ['common', 'uncommon', 'rare'];

/**
 * Every effect a row says, the ones **inside a gate included** — a
 * `conditionRule` carries its clause in `then`, and a walk that stopped at the
 * top of the list would call a shape unsaid that a card plainly says.
 */
function effectsOf(id: OrderId): CardEffect[] {
  const out: CardEffect[] = [];
  const walk = (effects: readonly CardEffect[]): void => {
    for (const effect of effects) {
      out.push(effect);
      if (effect.kind === 'conditionRule') walk(effect.then);
    }
  };
  walk(orderDef(id).effects);
  return out;
}

/** A duel seated under Akhenaten — Devotion and Magisterial (`data/leaders.json`). */
function akhenaten(seed = 7): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Akhet', color: '#d4502e', isHuman: true, leader: 'akhenaten' },
      { name: 'Bors', color: '#3a7fe8', leader: 'mithridates' },
    ],
  });
}

/** Fills the meter and deals this seat a draft. */
function dealTo(state: GameState, player: Player) {
  player.culturePool = 10_000;
  return settleDraft(state, player);
}

describe('the Devotion deck folds', () => {
  it('carries the design doc’s forty-four rows, ten · twelve · fourteen · eight', () => {
    expect(DEVOTION).toHaveLength(44);
    const perBand = BANDS.map((band) => DEVOTION.filter((id) => orderDef(id).band === band).length);
    expect(perBand).toEqual([10, 12, 14, 8]);
  });

  it('names its own deck on every row, with a band and a rarity', () => {
    for (const id of DEVOTION) {
      const def = orderDef(id);
      expect(def.decks, id).toEqual(['devotion']);
      expect(BANDS, id).toContain(def.band as Band);
      expect(RARITIES, id).toContain(def.rarity);
      expect(def.retired, id).toBeUndefined();
      expect(def.flavor, id).toBeTruthy();
      expect(def.text, id).toBeTruthy();
    }
  });

  it('gives every row an id of its own across the whole table', () => {
    const seen = new Set<string>();
    for (const id of ORDER_IDS) {
      expect(seen.has(id), `${id} is written twice`).toBe(false);
      seen.add(id);
    }
    for (const id of DEVOTION) expect(ORDER_IDS, id).toContain(id);
  });

  it('is reached by a Devotion seat and by nobody else’s deck', () => {
    const mine = ordersForDecks(['devotion']);
    for (const id of LIVE) expect(mine, id).toContain(id);
    const theirs = ordersForDecks(['dominion', 'expansionist', 'commerce', 'scientific', 'magisterial']);
    for (const id of DEVOTION) expect(theirs, id).not.toContain(id);
  });
});

describe('the live rows', () => {
  it('say only shapes the vocabulary holds', () => {
    expect(LIVE.length).toBeGreaterThan(0);
    const used = new Set<string>();
    for (const id of LIVE) {
      const effects = effectsOf(id);
      expect(orderDef(id).effects.length, `${id} is dealt and pays nothing`).toBeGreaterThan(0);
      for (const effect of effects) {
        expect(KINDS_USED as readonly string[], `${id}: ${effect.kind}`).toContain(effect.kind);
        used.add(effect.kind);
      }
    }
    // Both directions: a kind listed above and said by no row is a register
    // entry that reads as a feature.
    for (const kind of KINDS_USED) expect([...used], kind).toContain(kind);
  });

  it('print through the describers, with no keyword mark left raw', () => {
    for (const id of LIVE) {
      const clauses = describeCard(id);
      expect(clauses.length, `${id} describes to nothing`).toBeGreaterThanOrEqual(
        orderDef(id).effects.length,
      );
      for (const clause of clauses) {
        expect(clause.deferred, `${id}: a live row carries a deferred clause`).not.toBe(true);
        const text = stripRefs(clause.text);
        expect(text.trim(), id).not.toBe('');
        expect(text, `${id} leaves a keyword mark raw`).not.toContain('[[');
      }
    }
  });
});

describe('the deferred rows', () => {
  it('carry their sentence, slot nothing and sit in no pool', () => {
    expect(DEFERRED.length).toBeGreaterThan(0);
    for (const id of DEFERRED) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.charter, id).toBeUndefined();
      expect(def.deferred, id).toBeDefined();
      expect(def.deferred!.length, id).toBeGreaterThan(0);
      for (const sentence of def.deferred!) expect(sentence.trim(), id).not.toBe('');
      expect(def.note, `${id} defers without saying why`).toBeTruthy();
      expect(orderIsDealt(id), id).toBe(false);
      expect(ordersForDecks(['devotion']), id).not.toContain(id);
    }
  });

  it('say their halves in a player’s words, with no identifier in them', () => {
    for (const id of DEFERRED) {
      for (const sentence of orderDef(id).deferred ?? []) {
        expect(sentence, id).not.toMatch(/[a-z][A-Z]/);
        expect(sentence, id).not.toContain('_');
      }
    }
  });
});

describe('a Devotion draft', () => {
  it('deals Akhenaten live rows of his own decks and nothing else', () => {
    const g = akhenaten();
    const seat = playerById(g.state, 0)!;
    expect(seat.decks).toEqual(['devotion', 'magisterial']);

    const bag = eligibleFor(g.state, seat);
    expect(bag.length).toBeGreaterThan(0);
    for (const id of bag) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      // Commons carry no deck and a cross-type carries two; every other row a
      // seat may draw names one of its own.
      if (def.decks.length > 0) {
        expect(def.decks.some((deck) => seat.decks.includes(deck)), id).toBe(true);
      }
      // A fresh seat stands at band 0 in the first age.
      expect(def.band, id).toBe(0);
    }

    seat.culturePool = 10_000;
    const offer = drawOrderOffer(g.state, seat);
    expect(offer.options.length).toBeGreaterThan(0);
    for (const option of offer.options) expect(bag, option).toContain(option);

    const dealt = dealTo(g.state, seat);
    expect(dealt, 'a seat with a stocked deck is dealt a hand').not.toBeNull();
  });
});

/**
 * **The age-2 gate** (the Devotion rules block: *"Shrines and basic rites are
 * age 1; Temples, Prophets, routes and great-person calls age 2"*). A band-0
 * row is offered in the first age, so a first-age card that leant on a Temple,
 * a prophet or somebody else's congregation would be a card the age cannot
 * answer. Read off the rows' own words and their own effects, which is the only
 * reading that cannot drift from what the card prints.
 */
describe('the first age', () => {
  const FORBIDDEN = /\b(prophet|prophets|temple|temples|apostle|apostles|inquisitor|inquisitors|cathedral|cathedrals|foreign)\b/i;

  it('leaves the prophet, the Temple and a foreign congregation out of every tier-0 row', () => {
    for (const id of DEVOTION.filter((row) => orderDef(row).band === 0)) {
      const def = orderDef(id);
      expect(def.text ?? '', `${id} names an age-2 thing in its text`).not.toMatch(FORBIDDEN);
      const written = JSON.stringify(def.effects);
      expect(written, `${id} names an age-2 thing in its effects`).not.toMatch(
        /temple|cathedral|prophet|apostle|inquisitor|following/i,
      );
    }
  });
});
