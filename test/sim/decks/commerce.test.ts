/**
 * **The Commerce deck, entered** (`docs/plans/decks-rework.md` D1b; the design
 * of record is the "Rebuilt card pool — partnerships, reach, goods and
 * investment" section of `docs/six-decks-first-cut.md`, its four tier tables,
 * its "Rules for these forty-four cards" and its three building payloads).
 *
 * Sixty rows. Forty-nine were entered by D1b; **batch C1 added eleven** off the
 * user's hand-edited sheet (`docs/decks/commerce.md`, which is the design of
 * record now — the six-decks cut is the history behind it) and brought twenty of
 * the existing rows live, so the deck stands at thirty-one **live** rows — a row
 * whose sentence fits a shape the evaluator already switches on — and twenty-nine
 * **deferred**: the row is in the data and in the Compendium, carries its
 * ratified words and the plain sentence it is waiting to be able to say, and is
 * in no pool. The house rule is the deck's (`CardUpkeepSurchargeEffect`'s
 * docblock says it out loud): a card whose text needs a shape defers or gets the
 * shape, never a near-fit, and a card that is only half expressible defers whole.
 *
 * What moved in C1 was mostly the **re-triage** rather than the vocabulary: most
 * of D1b's deferral notes were written before D2a–D2d and R1–R3 landed and were
 * simply out of date. One shape was added, and it is the one the user's own
 * revision asked for — a card may now write a **movement** mark on a piece at its
 * birth (`CardUnitStampEffect.movement`), which `UnitStamp` has carried since the
 * Levée's conscripts and only `periodicMuster` could write.
 *
 * What is pinned here, in the order the batch asked for it:
 *
 *   1. **the file is one deck** — every row names `commerce` and nothing else,
 *      with a band and a rarity the unions know, and an id nothing else in the
 *      eight files uses;
 *   2. **a live row is a real card** — its effects are shapes the evaluator
 *      reads, it prints through the describers, and every mark those words
 *      carry is resolved (a raw `[[` on any surface fails the sweep);
 *   3. **a deferred row pays nothing** — no effects, a sentence saying what it
 *      would have said, and out of every pool;
 *   4. **the three building Charters carry their grant and are dealt by
 *      nobody** — their buildings are D2's and do not exist as rows yet;
 *   5. **the age-2 gate** — nothing on the opening shelf names a route, a
 *      trader, a commercial post or a Market, which is the doc's own first
 *      timing rule for this deck;
 *   6. **a seeded draft for a Commerce figure deals this deck and nothing
 *      else** — Mansa Musa, over thirty hands.
 */

import { describe, expect, it } from 'vitest';

import { createGame } from '../../../src/sim/game';
import { addBuilding, bumpRevision, playerById } from '../../../src/sim/state';
import { foundCityAt } from '../../../src/sim/cities';
import { getTileAt } from '../../../src/sim/map';
import { explainRouteYieldBetween, foldRouteYield } from '../../../src/sim/routeYields';
import {
  cardUnitStamp,
  describeCard,
  describeEffects,
  drawOrderOffer,
  eligibleFor,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  type CardEffect,
  type OrderId,
  BANDS,
  DECK_FILES,
  DECK_FILE_ORDERS,
  ORDER_IDS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { BUILDING_IDS } from '../../../src/sim/buildingData';
import type { UnitTypeId } from '../../../src/sim/unitData';
import { TECH_IDS, type TechId, techDef } from '../../../src/sim/techData';

/** Every id `data/decks/commerce.json` carries, in file order. */
const COMMERCE: readonly OrderId[] = DECK_FILE_ORDERS.commerce;

/** The three rarities, in the order the deck holds them back. */
const RARITIES = ['common', 'uncommon', 'rare'] as const;

/** The rows that pay something — the live half of the deck. */
const live = (): OrderId[] => COMMERCE.filter((id) => orderDef(id).effects.length > 0);

/** The rows that only say what they would have said. */
const deferred = (): OrderId[] => COMMERCE.filter((id) => orderDef(id).effects.length === 0);

describe('the Commerce deck is one deck', () => {
  it('carries sixty rows, every one of them a Commerce card', () => {
    expect(COMMERCE.length).toBe(60);
    for (const id of COMMERCE) {
      expect(orderDef(id).decks, id).toEqual(['commerce']);
    }
  });

  it('gives every row a band the ladder knows and a rarity the draw knows', () => {
    for (const id of COMMERCE) {
      const def = orderDef(id);
      expect(BANDS, id).toContain(def.band);
      expect(RARITIES, id).toContain(def.rarity);
      // A card's home is a decision, not a default: the words are on every row.
      expect(typeof def.name, id).toBe('string');
      expect(def.name.length, id).toBeGreaterThan(0);
      expect(typeof def.flavor, id).toBe('string');
      expect(def.flavor.length, id).toBeGreaterThan(0);
      expect(typeof def.text, id).toBe('string');
    }
  });

  it('spreads the four tiers as the doc’s tables do, with Civic Receipts moved on', () => {
    const bands = COMMERCE.map((id) => orderDef(id).band);
    const count = (band: number): number => bands.filter((b) => b === band).length;
    // D1b's nine / fourteen / sixteen / ten, plus C1's eleven new rows placed
    // by the tier the user's sheet puts them in: four in Tier 0 (The Mineral
    // Trade, Coastal Estates, Land Speculation, Founding Capital), four in
    // Tier I (Commercial Education, Strategic Reserves, Market Foundations,
    // Financed Industry) and three in Tier II (Civic Markets, Maritime
    // Authority, Professional Retainers).
    expect([count(0), count(1), count(2), count(3)]).toEqual([13, 18, 19, 10]);
    expect(orderDef('civicReceipts' as OrderId).band).toBe(1);
  });

  it('writes an id nothing else in the eight files uses', () => {
    const mine = new Set<string>(COMMERCE);
    expect(mine.size).toBe(COMMERCE.length);
    for (const file of DECK_FILES) {
      if (file === 'commerce') continue;
      for (const id of DECK_FILE_ORDERS[file]) {
        expect(mine.has(id), `${file}.json: ${id}`).toBe(false);
      }
    }
    // The retired shelf is the other half of the register: the fold throws on a
    // collision at load, and this says so before the stack trace does.
    const elsewhere = new Set<string>(ORDER_IDS);
    for (const file of DECK_FILES) {
      for (const id of DECK_FILE_ORDERS[file]) elsewhere.delete(id);
    }
    for (const id of COMMERCE) expect(elsewhere.has(id), id).toBe(false);
  });
});

describe('a live Commerce row is a card', () => {
  it('pays through thirty-one rows, and every one of them is dealt', () => {
    // The World's Exchange joined them with D2b: hammers behind a thing may be
    // counted off a thing the realm holds now, and the courts its roads reach
    // are one such thing. **Civic Receipts joined with D2c**: a purchase now
    // says what it cost and whether it was that town's first, which is the
    // whole of what the receipt reads.
    //
    // **And seventeen more with C1.** Eleven are the user's new proposals, which
    // were written against today's vocabulary and fit it. Six were D1b rows whose
    // deferral notes had gone stale: The Market Writ and The Money Lenders wanted
    // counts that exist, The Caravanserai Network and The Scholars' Roads wanted
    // route lines and a route rider that exist, The Convoy wanted a strength line
    // beside a cart that a shared card had already been paying for months, and
    // The Charter Fleet wanted a mark on a hull that the user's own revision
    // changed from sight, which nothing can write, to movement, which `UnitStamp`
    // always could.
    expect(live().length).toBe(31);
    for (const id of live()) {
      expect(orderIsDealt(id), id).toBe(true);
      expect(orderDef(id).deferred, id).toBeUndefined();
      expect(orderDef(id).retired, id).toBeUndefined();
    }
  });

  it('names only shapes the evaluator switches on, with the arguments they need', () => {
    // The per-row idiom `statecraft.test.ts` uses: walk the rows, walk the
    // effects, and put each shape's own required field to it. A row naming a
    // building, an improvement or a technology that has no row of its own is a
    // card pointing at nothing, which is the one way a JSON card can be wrong
    // without a type error.
    const buildings = new Set<string>(BUILDING_IDS);
    const check = (id: OrderId, effect: CardEffect): void => {
      const where = `${id} · ${effect.kind}`;
      switch (effect.kind) {
        case 'pays':
          expect(['city', 'capital', 'hex', 'empire', 'route'], where).toContain(effect.where);
          if (effect.where === 'hex') expect(effect.on, where).toBeDefined();
          if ((effect.basis ?? 'flat') === 'count') {
            expect(effect.count, where).toBeDefined();
            expect(effect.to, where).toBeDefined();
          }
          break;
        case 'productionBonus':
          expect(['unit', 'building', 'wonder'], where).toContain(effect.category);
          if (effect.building !== undefined) {
            expect(buildings.has(effect.building), `${where} → ${effect.building}`).toBe(true);
          }
          break;
        case 'unitStat':
          expect(effect.amount, where).not.toBe(0);
          break;
        case 'unitStamp':
          // Three marks a birth can carry now — the league joined the pair with
          // C1's Charter Fleet. A stamp naming none of them writes nothing.
          expect(
            effect.hp !== undefined ||
              effect.strength !== undefined ||
              effect.movement !== undefined,
            where,
          ).toBe(true);
          break;
        case 'purchaseRider':
          expect(effect.class, where).toBeDefined();
          expect(effect.percent, where).not.toBe(0);
          break;
        case 'upkeepRebate':
          expect(effect.amount !== undefined || effect.free === true, where).toBe(true);
          break;
        case 'rule':
          expect(typeof effect.rule, where).toBe('string');
          break;
        default:
          break;
      }
    };
    const kinds = new Set<string>();
    for (const id of live()) {
      const effects = orderDef(id).effects;
      expect(effects.length, id).toBeGreaterThan(0);
      for (const effect of effects) {
        kinds.add(effect.kind);
        check(id, effect);
      }
    }
    // Fourteen shapes carry the whole live half — six joined with C1's rows
    // (a contentment line, a capacity line, a strength line, a route rider, a
    // percentage on a rule of the realm and an upkeep surcharge) — and a
    // fifteenth here would be a shape a later pass added without saying so.
    expect([...kinds].sort()).toEqual([
      'authority',
      'combatLine',
      'happiness',
      'pays',
      'productionBonus',
      'purchaseRider',
      'routeRider',
      'rule',
      'rulePercent',
      'unitStamp',
      'unitStat',
      'upkeepRebate',
      'upkeepSurcharge',
      'windfallRider',
    ]);
  });

  it('prints every live row through the describers, with no mark left raw', () => {
    for (const id of live()) {
      const said = describeCard(id);
      expect(said.length, id).toBeGreaterThan(0);
      const printed = describeEffects(orderDef(id).effects);
      expect(said.slice(0, printed.length), id).toEqual(printed);
      for (const clause of said) {
        expect(clause.text.length, `${id}: "${clause.text}"`).toBeGreaterThan(0);
        // Every printed clause goes through `stripRefs` on its way to a
        // surface; a raw `[[` is a keyword ref nobody resolved.
        expect(stripRefs(clause.text), `${id}: "${clause.text}"`).not.toContain('[[');
        expect(stripRefs(clause.text), `${id}: "${clause.text}"`).not.toContain(']]');
        expect(stripRefs(clause.text), id).not.toContain('undefined');
      }
    }
  });
});

describe('a deferred Commerce row is a promise, not a card', () => {
  it('pays nothing, says what it would have said, and sits in no pool', () => {
    expect(deferred().length).toBe(29);
    for (const id of deferred()) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.deferred, id).toBeDefined();
      expect(def.deferred!.length, id).toBeGreaterThan(0);
      for (const sentence of def.deferred!) {
        expect(sentence.length, id).toBeGreaterThan(0);
        // Player prose: the sentence the card would have said, in plain words
        // with no identifier and no figure in it (rule 7).
        expect(sentence, id).not.toMatch(/[0-9]/);
        expect(sentence, id).not.toMatch(/\[\[/);
      }
      // The reason is on the row too, in the same voice.
      expect(def.note, id).toBeDefined();
      expect(orderIsDealt(id), id).toBe(false);
    }
  });
});

describe('the three building Charters', () => {
  const CHARTERS: Record<string, string> = {
    thePlantersCharter: 'plantationHouse',
    thePurpleWorks: 'purpleWorks',
    theDyeVats: 'dyeVats',
  };

  it('carries the grant it would make, and is dealt by nobody until its building exists', () => {
    const buildings = new Set<string>(BUILDING_IDS);
    for (const [id, building] of Object.entries(CHARTERS)) {
      const def = orderDef(id as OrderId);
      expect(def.charter, id).toEqual({ unlocks: { building } });
      // D2's, and the whole reason the row is deferred: the building it would
      // open has no row yet.
      expect(buildings.has(building), `${id} → ${building}`).toBe(false);
      expect(def.effects, id).toEqual([]);
      expect(def.deferred, id).toBeDefined();
      // **Deferred, not withdrawn.** `orderIsDealt` used to deal a charter with
      // no effects — its grant is the whole of the card — so this file marked
      // the three `retired` to keep them off the shelf, which said the design
      // had withdrawn them when it is waiting on them. The clause the D1b audit
      // asked for reads the deferral instead, so the flag is gone and the row
      // is off the shelf for the true reason. D2 drops the `deferred` sentence
      // in the pass that draws the building, and the charter deals itself.
      expect(def.retired, id).toBeUndefined();
      expect(orderIsDealt(id as OrderId), id).toBe(false);
    }
    // And no other row in the deck claims to grant anything.
    for (const id of COMMERCE) {
      if (id in CHARTERS) continue;
      expect(orderDef(id).charter, id).toBeUndefined();
    }
  });
});

describe('the age-2 gate', () => {
  it('keeps routes, traders, posts and Markets off the opening shelf', () => {
    // The doc's own first timing rule for this deck: *"Markets, caravans and
    // route cards begin in age 2. Tier 0 uses actual resources, exploration,
    // purchases, faith and the age-1 Lighthouse."*
    const forbidden = /\b(route|routes|trader|traders|caravan|caravans|commercial post|posts?|Market|Markets)\b/;
    for (const id of COMMERCE) {
      const def = orderDef(id);
      if (def.band !== 0) continue;
      expect(def.text ?? '', `${id}: ${def.text}`).not.toMatch(forbidden);
      for (const effect of def.effects) {
        expect(effect.kind, id).not.toBe('routeRider');
        if (effect.kind === 'pays') expect(effect.where, id).not.toBe('route');
      }
    }
  });
});

describe('a seeded draft for a Commerce figure', () => {
  /** A technology of this age, for the research-age half of the band gate. */
  function techOfAge(age: 1 | 2 | 3 | 4): TechId {
    const id = TECH_IDS.find((tech) => techDef(tech).age === age);
    expect(id, `a technology of age ${age}`).toBeDefined();
    return id!;
  }

  it('deals Mansa Musa live Commerce rows, commons and crosses, and nothing else', () => {
    const g = createGame({
      seed: 17,
      sizeName: 'duel',
      players: [
        { name: 'Musa', color: '#d4502e', isHuman: true, leader: 'mansaMusa' },
        { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
      ],
    });
    const musa = playerById(g.state, 0)!;
    expect(musa.decks).toEqual(['commerce', 'devotion']);
    // Open every band: the ladder's last rung and a node of the last age.
    for (const age of [2, 3, 4] as const) musa.techsResearched.push(techOfAge(age));

    const dealt = new Set<OrderId>();
    for (let n = 1; n <= 30; n++) {
      musa.statecraft.drafts = n === 1 ? 0 : 29;
      delete musa.statecraft.pendingOrder;
      const offer = drawOrderOffer(g.state, musa);
      for (const id of offer.options ?? []) {
        dealt.add(id);
        const def = orderDef(id);
        // Its deck, a common or a cross that names one of the seat's two — and
        // with Devotion's file still empty, in practice this deck alone.
        expect(
          def.decks.length === 0 || def.decks.some((deck) => musa.decks.includes(deck)),
          `${id}: ${def.decks.join(' · ')}`,
        ).toBe(true);
        expect(orderIsDealt(id), id).toBe(true);
        // Never a deferred row, never a charter waiting on its building.
        expect(def.effects.length > 0 || def.charter !== undefined, id).toBe(true);
      }
    }
    // Every live row of the deck is reachable, and nothing outside the seat's
    // pool was dealt. **Re-cut for the finished D1b**: this asked that every
    // dealt row be a *Commerce* row, which was true only while Devotion's file
    // and the commons were empty of live rows. Musa holds both decks, so what
    // is claimed is the pool — and this deck's own share of it is still reached.
    const eligible = new Set(eligibleFor(g.state, musa));
    for (const id of live()) expect(eligible.has(id), id).toBe(true);
    for (const id of deferred()) expect(eligible.has(id), id).toBe(false);
    const pool = new Set(ordersForDecks(musa.decks));
    for (const id of dealt) expect(pool.has(id), id).toBe(true);
    expect([...dealt].some((id) => live().includes(id))).toBe(true);
    expect(dealt.size).toBeGreaterThan(1);
  });

  it('opens the seat with band 0 alone, and nothing there names a caravan', () => {
    const g = createGame({
      seed: 23,
      sizeName: 'duel',
      players: [
        { name: 'Musa', color: '#d4502e', isHuman: true, leader: 'mansaMusa' },
        { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
      ],
    });
    const musa = playerById(g.state, 0)!;
    const opening = eligibleFor(g.state, musa);
    expect(opening.length).toBeGreaterThan(0);
    for (const id of opening) expect(orderDef(id).band, id).toBe(0);
  });
});

// --- D2d, the age stamp -------------------------------------------------------

/**
 * **Established Routes** came live with `TradeRoute.startedTurn` (batch D2d).
 *
 * What the card buys is a share of what the road already carries, gated on the
 * one narrowing a player cannot check by looking at either town: how long they
 * have kept the road. The stamp is written once when the route opens and never
 * rewritten by a renewal, so this is a subtraction and **nothing ticks**.
 *
 * Two of the design doc's continuity rules are deliberately not implemented and
 * are stated on the field rather than hidden — a manual re-hire inherits no
 * progress, and a blockade does not pause the count (there is no blockade rule
 * in the game). Everything that really ends a route destroys `Unit.trade`, so
 * the four resets the doc does name fall out of the shape.
 */
describe('Established Routes — a road kept up', () => {
  const bench = () => {
    const g = createGame({
      seed: 31,
      sizeName: 'duel',
      players: [
        { name: 'Musa', color: '#d4502e', isHuman: true, leader: 'mansaMusa' },
        { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
      ],
    });
    return g;
  };

  it('pays nothing on a young road and half again on an old one', () => {
    const g = bench();
    const musa = playerById(g.state, 0)!;
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const from = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!)!;
    const to = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col + 4, unit.row)!)!;
    // A road worth something to take a share of: the origin's shelves set the
    // flats and the two populations set the coin.
    from.population = 60;
    to.population = 60;
    for (const id of ['granary', 'library', 'market', 'monument'] as const) {
      addBuilding(g.state, from, id);
    }
    bumpRevision(g.state);

    const sc = musa.statecraft;
    sc.orders.push('establishedRoutes');
    sc.slots.push({ card: 'establishedRoutes', sealedUntil: g.state.turn });
    bumpRevision(g.state);

    const named = (age?: number) =>
      explainRouteYieldBetween(g.state, from, to, 'land', age).filter((line) =>
        line.source.includes('Established Routes'),
      );
    // A preview holds no caravan and is promised nothing — the crossing's own
    // bargain, read on a date.
    expect(named()).toEqual([]);
    expect(named(29), 'twenty-nine turns is not thirty').toEqual([]);
    const kept = named(30);
    expect(kept.length).toBeGreaterThan(0);
    // A share of what the road already carries, so the figure is half again of
    // the flats above it rather than a number of its own.
    const base = foldRouteYield(
      explainRouteYieldBetween(g.state, from, to, 'land').filter(
        (line) => !line.source.includes('Established Routes'),
      ),
    );
    const extra = foldRouteYield(kept);
    expect(extra.gold).toBe(Math.floor((base.gold * 50) / 100));
  });
});

// --- C1, the movement mark ----------------------------------------------------

/**
 * **The Charter Fleet** came live with `CardUnitStampEffect.movement` (batch C1).
 *
 * The one shape this batch added, and it was the user's own revision that asked
 * for it: the card used to promise its hulls a keener lookout, which is the one
 * mark nothing can write on a piece, and the sheet now promises them a longer
 * league instead — which `UnitStamp` has carried since the Levée's conscripts
 * and which only a periodic muster could write until now.
 *
 * What is pinned is the whole of the card's narrowing: the mark is written on a
 * **ship**, **bought with gold**, and on nothing else. A hull raised in the yard
 * the slow way, a soldier bought at the same till and a ship bought with faith
 * all leave the mark unwritten, which is what "naval combat units you purchase
 * with gold" says.
 */
describe('The Charter Fleet — a hull bought with coin', () => {
  const bench = () => {
    const g = createGame({
      seed: 41,
      sizeName: 'duel',
      players: [
        { name: 'Musa', color: '#d4502e', isHuman: true, leader: 'mansaMusa' },
        { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
      ],
    });
    const musa = playerById(g.state, 0)!;
    musa.statecraft.orders.push('theCharterFleet' as OrderId);
    musa.statecraft.slots.push({ card: 'theCharterFleet' as OrderId, sealedUntil: g.state.turn });
    bumpRevision(g.state);
    return g;
  };

  it('marks a ship bought with gold, and nothing else on the roster or at the till', () => {
    const g = bench();
    const stamp = (type: UnitTypeId, bought?: 'gold' | 'faith') =>
      cardUnitStamp(g.state, 0, undefined, type, bought);
    expect(stamp('trireme', 'gold')).toEqual({ movement: 1 });
    // The same hull raised in the yard, and the same hull bought out of the
    // other bank: a stamp naming a till is silent at every other birth.
    expect(stamp('trireme')).toEqual({});
    expect(stamp('trireme', 'faith')).toEqual({});
    // And a soldier bought at the same counter is not a ship.
    expect(stamp('warrior', 'gold')).toEqual({});
  });
});
