/**
 * **The shared shelf, pinned** — `data/decks/common.json`, the seventh deck file
 * (the decks rework, `docs/plans/decks-rework.md` D1b; the design of record is
 * `docs/six-decks-first-cut.md`, its "Cross-type cards" and "Generic common
 * pool" tables, read against that doc's "Card-reading conventions").
 *
 * The file holds **two kinds of row and no third**: a *generic* row belongs to
 * every seat and names no deck (`decks: []`), a *cross-type* row names exactly
 * two (`decks: [a, b]`) and is drawn by a seat holding either. A row naming one
 * deck belongs in that deck's own file and fails `decks.test.ts`' register
 * before it reaches here.
 *
 * What is pinned, in the brief's order: the two shapes of membership; a band
 * and a rarity the draw can read; every live row's effects in the evaluator's
 * own vocabulary and printable in the describers' own words; every deferred row
 * out of the pools and carrying its sentence in plain prose; and the third
 * position's cadence dealt to a two-deck seat — a generic on a generic turn, a
 * cross naming one of the seat's decks on a cross turn, and never a cross
 * naming neither.
 *
 * **The doc tables are `statecraftDocSync.test.ts`'** (D1a re-cut the
 * cross-type and generic tables of `docs/orders-and-doctrines.md` to read this
 * file's two kinds). Nothing here mirrors them a second time.
 */

import { describe, expect, it } from 'vitest';

import { type Game } from '../../../src/sim/game';
import { applyCommand } from '../../../src/sim/commands';
import { type GameState, type Player, playerById } from '../../../src/sim/state';
import {
  eligibleFor,
  positionBag,
  settleDraft,
  thirdPositionOf,
} from '../../../src/sim/statecraft';
import { describeCard, describeEffects, stripRefs } from '../../../src/sim/statecraft/describers';
import {
  type CardEffect,
  type OrderId,
  BANDS,
  DECK_FILE_ORDERS,
  DECK_IDS,
  isDeckId,
  orderDef,
  orderIsDealt,
} from '../../../src/sim/statecraftData';
import { createGame } from '../newGameHelpers';

/** Every row of the shared file, in file order. */
const COMMON: readonly OrderId[] = DECK_FILE_ORDERS.common;

/** A row nothing deals — no effects and no charter. See `orderIsDealt`. */
function isDeferred(id: OrderId): boolean {
  return (orderDef(id).deferred?.length ?? 0) > 0;
}

/**
 * A shared card both its decks cut (batch S: Frontier Garrisons, Harvest
 * Offerings). Kept for saves and the Compendium, dealt by nobody, and counted
 * as neither live nor deferred here.
 */
function isRetired(id: OrderId): boolean {
  return orderDef(id).retired === true;
}

const LIVE = COMMON.filter((id) => !isDeferred(id) && !isRetired(id));
const DEFERRED = COMMON.filter((id) => isDeferred(id) && !isRetired(id));
const RETIRED = COMMON.filter((id) => isRetired(id));

const RARITIES = ['common', 'uncommon', 'rare'];

/**
 * The evaluator's own source, for the register below: `statecraft/evaluator.ts`
 * is the one module that switches on a `CardEffect.kind`, so a kind it never
 * names is a shape nothing reads. Read the repo's way (Vite's raw import), and
 * `?raw` rather than a parse because what is being asked is whether the word is
 * written there at all.
 */
const evaluatorFiles = import.meta.glob('../../../src/sim/statecraft/evaluator.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const EVALUATOR = Object.values(evaluatorFiles)[0] as string;

describe('the shared shelf is two kinds of row and no third', () => {
  it('holds rows at all, of both kinds', () => {
    expect(COMMON.length).toBeGreaterThan(0);
    expect(LIVE.length).toBeGreaterThan(0);
    expect(COMMON.filter((id) => orderDef(id).decks.length === 0).length).toBeGreaterThan(0);
    expect(COMMON.filter((id) => orderDef(id).decks.length === 2).length).toBeGreaterThan(0);
  });

  it('names zero decks or two, each a deck, and never the same one twice', () => {
    for (const id of COMMON) {
      const home = orderDef(id).decks;
      expect([0, 2], `${id} names ${home.length} deck(s)`).toContain(home.length);
      for (const deck of home) expect(isDeckId(deck), `${id}: "${deck}"`).toBe(true);
      expect(new Set(home).size, `${id} names one deck twice`).toBe(home.length);
      for (const deck of home) expect(DECK_IDS, id).toContain(deck);
    }
  });

  it('gives every row a band, a rarity, a name, a thread and its ratified words', () => {
    for (const id of COMMON) {
      const def = orderDef(id);
      expect(BANDS, `${id} — the band`).toContain(def.band);
      expect(RARITIES, `${id} — the rarity`).toContain(def.rarity);
      expect(def.name.length, `${id} — the name`).toBeGreaterThan(0);
      expect(def.flavor.length, `${id} — the flavour`).toBeGreaterThan(0);
      expect(def.text, `${id} carries no ratified text`).toBeDefined();
      expect(def.text!.length, `${id} — the words`).toBeGreaterThan(0);
      // The shared shelf carries no archetype thread: a card everybody may draw
      // belongs to nobody's line.
      expect(def.line, `${id} — the thread`).toBe('none');
      // The old pool and office fields are the retired shelf's; a row written
      // after the rework carries neither.
      expect(def.pool, `${id} carries a pre-rework pool`).toBeUndefined();
      expect(def.slot, `${id} carries a pre-rework office`).toBeUndefined();
    }
  });

  it('keeps a retired shared row out of every pool', () => {
    // Batch S retired the two shared cards both their sheets cut.
    expect([...RETIRED].sort()).toEqual(['frontierGarrisons', 'harvestOfferings']);
    for (const id of RETIRED) {
      expect(orderIsDealt(id), `${id} is retired and dealt`).toBe(false);
      expect(orderDef(id).decks.length, `${id} names ${orderDef(id).decks.length} deck(s)`).toBe(2);
    }
  });

  it('writes no id twice, and writes every id in lowerCamel', () => {
    expect(new Set(COMMON).size).toBe(COMMON.length);
    for (const id of COMMON) expect(id, id).toMatch(/^[a-z][A-Za-z0-9]*$/);
  });
});

describe('a live row', () => {
  it('carries effects, and is dealt', () => {
    for (const id of LIVE) {
      // A charter's grant is the whole of the card (The Chartered Company).
      if (orderDef(id).charter === undefined) {
        expect(orderDef(id).effects.length, `${id} is live and pays nothing`).toBeGreaterThan(0);
      }
      expect(orderDef(id).deferred, id).toBeUndefined();
      expect(orderIsDealt(id), `${id} is live and in no pool`).toBe(true);
    }
  });

  it('says every clause in a shape the evaluator reads — the register', () => {
    // A nested clause counts: `conditionRule.then` holds ordinary effects and a
    // shape nothing reads is no better for being gated.
    function walk(effects: readonly CardEffect[], id: OrderId): void {
      for (const effect of effects) {
        expect(
          EVALUATOR.includes(`'${effect.kind}'`),
          `${id} names "${effect.kind}", which the evaluator never reads`,
        ).toBe(true);
        if (effect.kind === 'conditionRule') walk(effect.then, id);
      }
    }
    for (const id of LIVE) walk(orderDef(id).effects, id);
  });

  it('prints through the describers, in whole sentences, with no raw keyword ref', () => {
    for (const id of LIVE) {
      // A charter that opens a unit prints its grant through the Compendium,
      // not the describers — the Commerce deck test's rule.
      if (orderDef(id).charter !== undefined) continue;
      const clauses = describeCard(id);
      expect(clauses.length, `${id} describes as nothing`).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.text.trim().length, `${id} — an empty clause`).toBeGreaterThan(0);
        // Every named thing is a well-formed ref (`[[kind:id|Name]]`); strip
        // them and nothing that opens one may be left.
        expect(stripRefs(clause.text), `${id} — a raw ref survives`).not.toContain('[[');
        expect(clause.deferred, `${id} — a live row prints a struck clause`).not.toBe(true);
      }
      // The card's face is its effects' words first, whatever it adds after.
      const printed = describeEffects(orderDef(id).effects, 'empire');
      expect(printed.length, `${id} — the effects describe as nothing`).toBeGreaterThan(0);
    }
  });
});

describe('a deferred row', () => {
  it('carries its sentence in plain words, no effects, and sits in no pool', () => {
    for (const id of DEFERRED) {
      const def = orderDef(id);
      expect(def.effects, `${id} is deferred and carries effects`).toEqual([]);
      expect(def.deferred!.length, `${id} — the deferred list`).toBeGreaterThan(0);
      for (const sentence of def.deferred!) {
        expect(sentence.trim().length, `${id} — an empty deferred clause`).toBeGreaterThan(0);
        // Player prose: no identifiers, no numbers (rule 7).
        expect(sentence, `${id} — "${sentence}" names an identifier`).not.toMatch(/[a-z][A-Z]|[_[\]{}]/);
        expect(sentence, `${id} — "${sentence}" prints a number`).not.toMatch(/\d/);
      }
      // `orderIsDealt`'s own rule: no effects and no charter is no pool.
      expect(orderIsDealt(id), `${id} is deferred and dealt`).toBe(false);
      expect(def.charter, `${id} is deferred and charters something`).toBeUndefined();
      // Still fully readable — the Compendium prints it.
      expect(def.text, `${id} carries no ratified text`).toBeDefined();
    }
  });
});

// --- the draw ----------------------------------------------------------------

/** A duel: seat 0 under Pachacuti (expansionist · commerce), seat 1 the rainbow. */
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

describe('the third position, dealt to a two-deck seat', () => {
  it('bags a generic for everybody and a cross only where a deck is shared', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    expect(ada.decks).toEqual(['expansionist', 'commerce']);
    const eligible = eligibleFor(g.state, ada);

    const generic = positionBag(eligible, { kind: 'generic' }, ada.decks);
    expect(generic.length, 'no generic is eligible at the opening band').toBeGreaterThan(0);
    for (const id of generic) expect(orderDef(id).decks, id).toEqual([]);

    const cross = positionBag(eligible, { kind: 'cross' }, ada.decks);
    expect(cross.length, 'no cross-type is eligible at the opening band').toBeGreaterThan(0);
    for (const id of cross) {
      const home = orderDef(id).decks;
      expect(home.length, id).toBe(2);
      expect(
        home.some((deck) => ada.decks.includes(deck)),
        `${id} (${home.join(' · ')}) names neither of the seat's decks`,
      ).toBe(true);
    }

    // And the cut is real: a cross naming neither of this seat's decks is on
    // the shelf and out of its bag.
    const foreign = COMMON.filter((id) => {
      const home = orderDef(id).decks;
      return orderIsDealt(id) && home.length === 2 && !home.some((deck) => ada.decks.includes(deck));
    });
    expect(foreign.length, 'the shelf carries no cross outside this seat').toBeGreaterThan(0);
    for (const id of foreign) expect(cross, id).not.toContain(id);
  });

  it('deals a generic on the cadence’s generic turns and a shared cross on its cross turns', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    let dealtGeneric = 0;
    let dealtCross = 0;
    // Eight regular drafts: the cadence (generic · cross · generic · single)
    // twice over. Each hand is skipped, which spends it and advances the count.
    for (let n = 1; n <= 8; n++) {
      const dealt = dealTo(g.state, ada);
      expect(dealt, `draft ${n}`).not.toBeNull();
      expect(ada.statecraft.drafts, `draft ${n}`).toBe(n);
      const options = dealt!.offer.options;
      const positions = dealt!.offer.positions;
      expect(positions?.[2], `draft ${n} — the third position`).toEqual(
        thirdPositionOf(n).turn === 'single'
          ? { kind: 'deck', deck: ada.decks[thirdPositionOf(n).single % ada.decks.length]! }
          : { kind: thirdPositionOf(n).turn },
      );
      const third = options[2];
      if (third !== undefined) {
        const home = orderDef(third).decks;
        if (thirdPositionOf(n).turn === 'generic') {
          expect(home, `draft ${n} — the third card`).toEqual([]);
          dealtGeneric += 1;
        } else if (thirdPositionOf(n).turn === 'cross') {
          expect(home.length, `draft ${n} — the third card`).toBe(2);
          expect(
            home.some((deck) => ada.decks.includes(deck)),
            `draft ${n} dealt ${third} (${home.join(' · ')}), which names neither of the seat's decks`,
          ).toBe(true);
          dealtCross += 1;
        }
      }
      // A cross naming neither deck is never anywhere in the hand.
      for (const id of options) {
        const home = orderDef(id).decks;
        if (home.length !== 2) continue;
        expect(
          home.some((deck) => ada.decks.includes(deck)),
          `draft ${n} dealt ${id} (${home.join(' · ')}) out of the seat's pool`,
        ).toBe(true);
      }
      expect(applyCommand(g.state, { type: 'skipOrderOffer', playerId: 0 }).ok, `draft ${n}`).toBe(true);
    }
    // The cadence actually came round: four generic turns and two cross turns
    // in eight drafts, and both kinds were really dealt.
    expect(dealtGeneric).toBe(4);
    expect(dealtCross).toBe(2);
  });
});

// --- C2, the two shared rows Commerce was waiting on --------------------------

/**
 * **Letters of Marque** and **The Exchange of Discoveries** came live in batch
 * C2, and neither needed a new shape: C1 had found both fully reachable and
 * left them only because this file was outside its fence.
 *
 * Both belong to **two** decks, so lighting them changes what Dominion and
 * Scientific deal as well as what Commerce does — which is the point of a
 * shared row and is stated here so the next reader of either deck's counts
 * knows where the change came from.
 */
describe('C2 — the two shared rows', () => {
  it('lights Letters of Marque for both its decks, with all three halves written', () => {
    const def = orderDef('lettersOfMarque' as OrderId);
    expect(def.decks).toEqual(['dominion', 'commerce']);
    expect(def.deferred).toBeUndefined();
    expect(orderIsDealt('lettersOfMarque' as OrderId)).toBe(true);
    // A kill by one of this empire's ships, more gold in a harbour town (the
    // purchase discount until ruling (qqqqqq) 1, batch S), and a penalty on
    // that same town's yards.
    expect(def.effects.map((effect) => effect.kind)).toEqual([
      'windfallRider',
      'percentYields',
      'productionBonus',
    ]);
    for (const effect of def.effects) {
      if (effect.kind === 'windfallRider') {
        expect(effect.occasion).toBe('kill');
        expect(effect.class).toEqual({ category: 'naval' });
      }
      if (effect.kind === 'percentYields' || effect.kind === 'productionBonus') {
        expect(effect.scope).toEqual({ test: 'hasBuilding', building: 'harbour' });
      }
    }
  });

  it('lights The Exchange of Discoveries as two hex lines, the second scoped', () => {
    const def = orderDef('theExchangeOfDiscoveries' as OrderId);
    expect(def.decks).toEqual(['commerce', 'scientific']);
    expect(def.deferred).toBeUndefined();
    expect(orderIsDealt('theExchangeOfDiscoveries' as OrderId)).toBe(true);
    // The user's sheet rewrote this card: the old text counted the courts a
    // town's caravans reach, and the new one pays the seams themselves.
    expect(def.text).toBe(
      '+2 science on mines and quarries on a resource. Additional +2 if the city has a market.',
    );
    const lines = def.effects.filter(
      (effect): effect is Extract<CardEffect, { kind: 'pays' }> => effect.kind === 'pays',
    );
    expect(lines.length).toBe(2);
    for (const line of lines) {
      expect(line.where).toBe('hex');
      expect(line.science).toBe(2);
      expect(line.on).toEqual({
        test: 'all',
        of: [
          { test: 'anyImprovement', improvements: ['mine', 'quarry'] },
          { test: 'hasResource' },
        ],
      });
    }
    // Only the second names the town that owns the ground — "additional +2 if
    // the city has a market" is one clause about where, not about which hex.
    expect(lines[0]!.scope).toBeUndefined();
    expect(lines[1]!.scope).toEqual({ test: 'hasBuilding', building: 'market' });
  });
});
