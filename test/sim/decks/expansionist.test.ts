/**
 * **The Expansionist deck, entered** (the decks rework, D1b —
 * `docs/plans/decks-rework.md` "D1b — the cards"; the design of record is the
 * "Rebuilt card pool — citizens, woodland and the working frontier" section of
 * `docs/six-decks-first-cut.md`, with its four tier tables and its "Shared
 * readings").
 *
 * What is pinned here is the deck's own file and nothing else: every row in
 * `data/decks/expansionist.json` names this deck and carries the band, the
 * rarity, the name, the flavour and the ratified words a draft and a Compendium
 * entry are made of; every **live** row's effects describe in words with no
 * reference left raw; every **deferred** row carries a stated sentence, no
 * effects, and is dealt to nobody; and a seeded draft under Pachacuti — the
 * Expansionist figure — deals only rows this seat may actually be offered.
 *
 * **The deck is mostly deferred, and that is the honest state of it.** The five
 * lines the design doc names are population payments, planting and maturity,
 * worker-led claims, farm-water adjacency and founding traits — five systems
 * D2 has yet to build (the plan's "D2 — the shapes") — so a card whose text
 * needs one of them is a row with a `deferred` sentence and no effects, in the
 * data and the Compendium and in no pool, exactly as the house rule says: never
 * bend a card to a near-fit.
 *
 * **The doc table is `statecraftDocSync.test.ts`' job, not this file's.** That
 * test mirrors `docs/orders-and-doctrines.md`'s "### Expansionist" table against
 * this deck's file, and the table is empty as D1a left it; what this file pins
 * instead is that every live row carries the four cells such a table is written
 * from, so the mirror has something exact to be written against.
 */

import { describe, expect, it } from 'vitest';

import { type Game, createGame } from '../../../src/sim/game';
import { type Player, playerById } from '../../../src/sim/state';
import { describeCard, drawOrderOffer, eligibleFor, stripRefs } from '../../../src/sim/statecraft';
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
import { TECH_IDS, type TechId, techDef } from '../../../src/sim/techData';

/** The deck's own rows, in file order — what every draw and every screen walks. */
const ROWS: readonly OrderId[] = DECK_FILE_ORDERS.expansionist;

/** A row with something to slot; the deferred ones are the rest. */
function isLive(id: OrderId): boolean {
  return orderDef(id).effects.length > 0;
}

const LIVE = ROWS.filter(isLive);
const DEFERRED = ROWS.filter((id) => !isLive(id));

const RARITIES: readonly OrderRarity[] = ['common', 'uncommon', 'rare'];

describe('the Expansionist deck, as entered', () => {
  it('carries rows at all, and they fold into the one registry', () => {
    expect(ROWS.length).toBeGreaterThan(0);
    for (const id of ROWS) {
      expect(ORDER_IDS, id).toContain(id);
      expect(orderDef(id), id).toBeDefined();
    }
  });

  it('names this deck on every row, and nothing else', () => {
    for (const id of ROWS) expect(orderDef(id).decks, id).toEqual(['expansionist']);
  });

  it('gives every row a valid band and rarity, a name, a flavour and its ratified words', () => {
    for (const id of ROWS) {
      const def = orderDef(id);
      expect(BANDS as readonly Band[], id).toContain(def.band);
      expect(RARITIES, id).toContain(def.rarity);
      expect(def.name, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
      expect(def.text, id).toBeTruthy();
      // The rows are written after the rework, so neither old field is on them
      // (`OrderDef.pool` / `.slot`: "a row written after the rework carries
      // neither"), and none of them is a charter — the design doc gives the
      // eight charters to Scientific, Commerce and Devotion.
      expect(def.pool, id).toBeUndefined();
      expect(def.slot, id).toBeUndefined();
      expect(def.charter, id).toBeUndefined();
      expect(def.retired, id).toBeUndefined();
    }
  });

  it('gives every row a lowerCamel id, unique across all eight files', () => {
    for (const id of ROWS) expect(id, id).toMatch(/^[a-z][A-Za-z0-9]*$/);
    // `foldOrders` throws at load on a collision; this is the register saying so
    // by name before a stack trace does.
    const seen = new Map<string, string>();
    for (const file of Object.keys(DECK_FILE_ORDERS) as (keyof typeof DECK_FILE_ORDERS)[]) {
      for (const id of DECK_FILE_ORDERS[file]) {
        expect(seen.has(id), `${id} is written twice: ${seen.get(id)} and ${file}`).toBe(false);
        seen.set(id, file);
      }
    }
    expect(new Set(ROWS).size).toBe(ROWS.length);
  });

  it('spreads the rows across the four bands the design doc’s tiers name', () => {
    const bands = new Set(ROWS.map((id) => orderDef(id).band));
    expect([...bands].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('the live rows', () => {
  it('deals them, and describes every clause in words', () => {
    expect(LIVE.length).toBeGreaterThan(0);
    for (const id of LIVE) {
      expect(orderIsDealt(id), id).toBe(true);
      const clauses = describeCard(id);
      expect(clauses.length, id).toBeGreaterThan(0);
      for (const clause of clauses) expect(clause.text, id).toBeTruthy();
    }
  });

  it('leaves no keyword reference raw on any surface', () => {
    for (const id of LIVE) {
      for (const clause of describeCard(id)) {
        expect(stripRefs(clause.text), `${id}: ${clause.text}`).not.toContain('[[');
      }
    }
  });

  it('writes every effect in the vocabulary’s own kinds', () => {
    // The register at the row's scale: a `kind` the union does not carry is a
    // row the one evaluator would fall through, and a shape invented for a card
    // is exactly what the house rule forbids.
    const kinds = new Set<CardEffectKind>([
      'pays',
      'percentYields',
      'productionBonus',
      'rulePercent',
      'happiness',
      'authority',
      'happinessTierBoost',
      'combatLine',
      'unitStat',
      'unitStamp',
      'windfallRider',
      'foundingRider',
      'offerRider',
      'routeRider',
      'slotRider',
      'effectAmplifier',
      'meterRule',
      'conditionRule',
      'cityStat',
      'metaRule',
      'rule',
      'periodicOffer',
      'periodicMuster',
      'landfall',
      'unlocksBuilding',
      'unlocksUnit',
      'pantheonSlots',
      'purchaseRider',
      'projectRider',
      'renown',
      'pressureRule',
      'pressure',
      'upkeepRebate',
      'upkeepSurcharge',
      'cardYieldAmplifier',
      'buildingYieldPercent',
      'slotPosition',
      'periodic',
      'periodShorten',
      'cityRenownPercent',
      'beadPerOccasion',
      'grantsAbility',
    ]);
    const walk = (effects: readonly CardEffect[], id: OrderId): void => {
      for (const effect of effects) {
        expect(kinds, `${id}: ${effect.kind}`).toContain(effect.kind);
        if (effect.kind === 'conditionRule') walk(effect.then, id);
      }
    };
    for (const id of LIVE) walk(orderDef(id).effects, id);
  });

  it('carries the four cells the deck’s doc table is written from', () => {
    // Band, rarity and the row's own words, per live row — what
    // `statecraftDocSync.test.ts` mirrors. Stated here so that a row landing
    // without them fails in the deck's own file first.
    for (const id of LIVE) {
      const def = orderDef(id);
      expect(typeof def.band, id).toBe('number');
      expect(RARITIES, id).toContain(def.rarity);
      expect(def.name.trim(), id).toBe(def.name);
      expect(def.text!.trim(), id).toBe(def.text);
    }
  });
});

describe('the deferred rows', () => {
  it('state their sentence, carry no effects, and are dealt to nobody', () => {
    expect(DEFERRED.length).toBeGreaterThan(0);
    for (const id of DEFERRED) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.deferred, id).toBeDefined();
      expect(def.deferred!.length, id).toBeGreaterThan(0);
      for (const sentence of def.deferred!) expect(sentence, id).toBeTruthy();
      // The rule the plan states: in the data, in the Compendium, in no pool.
      expect(orderIsDealt(id), id).toBe(false);
      expect(ordersForDecks(['expansionist']), id).not.toContain(id);
      // A deferred half is player prose: no identifiers, and a `note` beside it
      // saying what is not built.
      expect(def.note, id).toBeTruthy();
    }
  });

  it('says its deferral in plain words, with no identifier in it', () => {
    for (const id of DEFERRED) {
      for (const sentence of [...orderDef(id).deferred!, orderDef(id).note!]) {
        expect(sentence, `${id}: ${sentence}`).not.toMatch(/[a-z][A-Z]/);
        expect(sentence, `${id}: ${sentence}`).not.toContain('`');
      }
    }
  });
});

// --- the draw ---------------------------------------------------------------

/** A duel under Pachacuti — Expansionist and Commerce (the design doc's pools). */
function seated(seed = 11): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: 'pachacuti' },
      { name: 'Bors', color: '#3a7fe8', leader: 'taizong' },
    ],
  });
}

/** Opens every band for this seat: the ladder's last rung and the last age. */
function openEveryBand(player: Player): void {
  player.statecraft.drafts = 29;
  for (const tech of TECH_IDS) {
    if (techDef(tech).age === 4 && !player.techsResearched.includes(tech)) {
      player.techsResearched.push(tech as TechId);
      break;
    }
  }
}

describe('a seeded draft under Pachacuti', () => {
  it('deals only live rows of this seat’s own decks', () => {
    const g = seated();
    const seat = playerById(g.state, 0)!;
    expect(seat.decks).toEqual(['expansionist', 'commerce']);
    openEveryBand(seat);
    const allowed = new Set(ordersForDecks(seat.decks));
    let dealt = 0;
    for (let round = 0; round < 12; round++) {
      const offer = drawOrderOffer(g.state, seat);
      for (const id of offer.options) {
        expect(allowed, `${id} is not in this seat's pool`).toContain(id);
        expect(orderIsDealt(id), id).toBe(true);
        expect(orderDef(id).retired, id).toBeUndefined();
        // Never a deferred row of this deck.
        expect(DEFERRED, id).not.toContain(id);
        dealt++;
      }
      // Hold what was dealt so the next hand deals something else.
      for (const id of offer.options) seat.statecraft.orders.push(id);
    }
    expect(dealt).toBeGreaterThan(0);
  });

  it('offers this deck’s band-0 rows to a seat that has only reached band 0', () => {
    const g = seated(23);
    const seat = playerById(g.state, 0)!;
    const eligible = eligibleFor(g.state, seat);
    const mine = eligible.filter((id) => (DECK_FILE_ORDERS.expansionist as OrderId[]).includes(id));
    // A fresh seat is at rung zero and research age one, so the early band and
    // nothing above it.
    for (const id of mine) expect(orderDef(id).band, id).toBe(0);
    expect(mine.length).toBeGreaterThan(0);
  });

  it('deals the same hand from the same generator state', () => {
    const a = seated(5);
    const b = seated(5);
    openEveryBand(playerById(a.state, 0)!);
    openEveryBand(playerById(b.state, 0)!);
    expect(drawOrderOffer(a.state, playerById(a.state, 0)!).options).toEqual(
      drawOrderOffer(b.state, playerById(b.state, 0)!).options,
    );
  });
});
