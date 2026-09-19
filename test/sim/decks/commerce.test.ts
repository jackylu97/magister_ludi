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
import { foundCityAt, ownedTiles } from '../../../src/sim/cities';
import { getTileAt, neighborTiles, raiseImprovement, tileHex } from '../../../src/sim/map';
import { cityContext, explainTileYield } from '../../../src/sim/yields/hex';
import { purchaseError } from '../../../src/sim/purchase';
import { buildError, gatingTech } from '../../../src/sim/tech';
import { explainRouteYieldBetween, foldRouteYield } from '../../../src/sim/routeYields';
import {
  cardRenownLines,
  cardUnitStamp,
  countOf,
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
  it('carries sixty-six rows, every one of them a Commerce card', () => {
    // Sixty after C1; C2 adds the six the sheet proposed and nobody had written
    // down yet (Ore Caravans, Frontier Investment, Luxury Caravans, Mining
    // Districts, The Capital Arsenal, Foreign Procurement).
    expect(COMMERCE.length).toBe(66);
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
    // C2 adds six more, again by the tier the sheet puts them in: two in Tier I
    // (Ore Caravans, Frontier Investment) and four in Tier II (Luxury Caravans,
    // Mining Districts, The Capital Arsenal, Foreign Procurement).
    expect([count(0), count(1), count(2), count(3)]).toEqual([13, 20, 23, 10]);
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
  it('pays through thirty-nine rows, and every one of them is dealt', () => {
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
    //
    // **And eight more with C2.** Six are the sheet's proposals that had never
    // been written down (Ore Caravans, Frontier Investment, Luxury Caravans,
    // Mining Districts, The Capital Arsenal, Foreign Procurement) and two were
    // deferred rows waiting on one field each — Travellers' Letters on a count
    // of the empires a seat has met, The Customs Houses on a count of the hexes
    // inside its borders.
    expect(live().length).toBe(39);
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
            // **A caravan's count pays the bag** (the (route, count) pair, batch
            // GP2) — every other count says its voice with `to`, because every
            // other count pays into a fold that carries one voice at a time.
            if (effect.where === 'route') {
              const bag =
                (effect.food ?? 0) + (effect.production ?? 0) + (effect.gold ?? 0) +
                (effect.science ?? 0) + (effect.culture ?? 0);
              expect(bag, where).not.toBe(0);
            } else {
              expect(effect.to, where).toBeDefined();
            }
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
    // Fifteen shapes carry the whole live half — six joined with C1's rows
    // (a contentment line, a capacity line, a strength line, a route rider, a
    // percentage on a rule of the realm and an upkeep surcharge) and the renown
    // trickle with C2's Customs Houses — and a sixteenth here would be a shape
    // a later pass added without saying so.
    expect([...kinds].sort()).toEqual([
      'authority',
      'combatLine',
      'happiness',
      'pays',
      'productionBonus',
      'purchaseRider',
      'renown',
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
    // C2 took two off it — Travellers' Letters and The Customs Houses.
    expect(deferred().length).toBe(27);
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

// --- C2, the cheap members ----------------------------------------------------

/**
 * **Batch C2**: six rows the sheet proposed and nobody had written down, plus
 * four that were each waiting on one field.
 *
 * Four things were added to the vocabulary and every one of them is written by a
 * live row here:
 *
 *   · `CountKind`'s `tilesInBorders` — the hexes inside a realm's borders that
 *     answer a `TileCondition`, narrowed to one town by `within: 'city'`. Three
 *     rows count three different facts about a hex through it (a mine, a luxury
 *     seam, a customs house), which is why it takes a condition rather than
 *     being three members;
 *   · `CountKind`'s `empiresMet` — Travellers' Letters, off `Player.metSeats`;
 *   · `CardPaysEffect.per` read at the ring — Mining Districts' two adjacent
 *     mines to a helping;
 *   · two `ActionRuleId`s at the purchase counter — the capital's exemption from
 *     the one-a-turn limit, and a waiver of a unit's strategic resource.
 *
 * Frontier Investment needed nothing new: a route `pays` share already asks both
 * ends (`destination`, `crossing`), which is what "double bonuses from domestic
 * trade routes into small towns" says.
 */
describe('C2 — the counts, the ring and the two counter rules', () => {
  /** A duel with one Commerce seat, the named cards in its chairs. */
  function bench(cards: string[]) {
    const g = createGame({
      seed: 53,
      sizeName: 'duel',
      players: [
        { name: 'Musa', color: '#d4502e', isHuman: true, leader: 'mansaMusa' },
        { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
      ],
    });
    const musa = playerById(g.state, 0)!;
    for (const card of cards) {
      musa.statecraft.orders.push(card as OrderId);
      musa.statecraft.slots.push({ card: card as OrderId, sealedUntil: g.state.turn });
    }
    bumpRevision(g.state);
    return g;
  }

  /** A town of this seat, founded a few hexes along from its opening piece. */
  function town(g: ReturnType<typeof bench>, at = 0) {
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const tile = getTileAt(g.state.map, unit.col + at, unit.row)!;
    return foundCityAt(g.state, 0, tile)!;
  }

  /**
   * Clear the town's own hex. A bought unit has to have somewhere to stand, and
   * the opening scout is parked exactly where the walls went up.
   */
  function empty(g: ReturnType<typeof bench>, city: { col: number; row: number }) {
    g.state.units = g.state.units.filter(
      (unit) => unit.col !== city.col || unit.row !== city.row,
    );
    bumpRevision(g.state);
  }

  /** Every hex a town owns but the one its walls stand on. */
  function around(g: ReturnType<typeof bench>, city: { id: number; col: number; row: number }) {
    return ownedTiles(g.state, city as never).filter(
      (tile) => tile.col !== city.col || tile.row !== city.row,
    );
  }

  /**
   * **The member register.** The kind-level registers in `statecraft.test.ts`
   * only prove a *shape* is named by some row: a new member of a union the
   * evaluator already walks, and a new field on a shape it already reads, sail
   * straight through them. So each pass names what it declared and says which
   * row writes it — a member nothing writes is a member nothing has tested.
   */
  it('registers exactly which rows write the four things C2 declared', () => {
    const writers = (
      match: (effect: CardEffect) => boolean,
    ): string[] => COMMERCE.filter((id) => orderDef(id).effects.some(match));

    expect(
      writers(
        (effect) =>
          (effect.kind === 'pays' && effect.count === 'tilesInBorders') ||
          (effect.kind === 'renown' && effect.count === 'tilesInBorders'),
      ),
    ).toEqual(['oreCaravans', 'luxuryCaravans', 'theCustomsHouses']);
    expect(writers((effect) => effect.kind === 'pays' && effect.count === 'empiresMet')).toEqual([
      'travellersLetters',
    ]);
    expect(
      writers(
        (effect) =>
          effect.kind === 'pays' && effect.perNeighbour !== undefined && effect.per !== undefined,
      ),
    ).toEqual(['miningDistricts']);
    expect(
      writers((effect) => effect.kind === 'rule' && effect.rule === 'capitalBuysWithoutLimit'),
    ).toEqual(['theCapitalArsenal']);
    expect(
      writers((effect) => effect.kind === 'rule' && effect.rule === 'buysWithoutResources'),
    ).toEqual(['foreignProcurement']);
  });

  it('counts the works inside a town’s borders, worked or not', () => {
    const g = bench([]);
    const city = town(g);
    const probe = (within?: 'city') =>
      countOf(
        g.state,
        0,
        'oreCaravans' as OrderId,
        {
          kind: 'pays',
          where: 'route',
          basis: 'count',
          count: 'tilesInBorders',
          tile: { test: 'improvement', improvement: 'mine' },
          ...(within === undefined ? {} : { within }),
          gold: 1,
        },
        city,
      );
    expect(probe('city')).toBe(0);
    // Three mines on ground the town owns, and **nobody standing on any of
    // them**: the count is of what the valley has dug, not of what its citizens
    // are doing today.
    const owned = around(g, city);
    expect(owned.length).toBeGreaterThanOrEqual(3);
    for (const tile of owned.slice(0, 3)) raiseImprovement(tile, 'mine', g.state.turn);
    city.workedTiles = [];
    bumpRevision(g.state);
    expect(probe('city')).toBe(3);
    // The realm's reading is the same sweep over every town, so this realm's
    // one town makes the two figures agree.
    expect(probe()).toBe(3);
  });

  it('pays a caravan once per mine in the town it left', () => {
    const g = bench(['oreCaravans']);
    const from = town(g, 0);
    const to = town(g, 4);
    from.population = 6;
    to.population = 6;
    const named = () =>
      explainRouteYieldBetween(g.state, from, to).filter((line) =>
        line.source.includes('Ore Caravans'),
      );
    // No mines, no line at all — a bag of nothing says nothing.
    expect(named()).toEqual([]);
    for (const tile of around(g, from).slice(0, 2)) {
      raiseImprovement(tile, 'mine', g.state.turn);
    }
    bumpRevision(g.state);
    expect(foldRouteYield(named()).gold).toBe(2);
    // And the count is the **origin's**: mines at the far end buy nothing.
    for (const tile of around(g, to).slice(0, 3)) raiseImprovement(tile, 'mine', g.state.turn);
    bumpRevision(g.state);
    expect(foldRouteYield(named()).gold).toBe(2);
  });

  it('pays the realm a renown a turn for each customs house it holds', () => {
    const g = bench(['theCustomsHouses']);
    const city = town(g);
    const named = () =>
      cardRenownLines(g.state, 0).filter((line) => line.card === 'theCustomsHouses');
    expect(named()).toEqual([]);
    for (const tile of around(g, city).slice(0, 2)) {
      raiseImprovement(tile, 'customsHouse', g.state.turn);
    }
    bumpRevision(g.state);
    const lines = named();
    expect(lines.length).toBe(1);
    expect(lines[0]!.amount).toBe(2);
  });

  it('counts the empires a seat has met, and never the wild or itself', () => {
    const g = bench([]);
    const probe = () =>
      countOf(g.state, 0, 'travellersLetters' as OrderId, {
        kind: 'pays',
        where: 'capital',
        basis: 'count',
        count: 'empiresMet',
        to: 'science',
        amount: 1,
      });
    const musa = playerById(g.state, 0)!;
    musa.metSeats = [];
    expect(probe()).toBe(0);
    musa.metSeats = [1];
    expect(probe()).toBe(1);
    // A seat cannot meet itself, and the wild is nobody's acquaintance.
    musa.metSeats = [0, 1];
    expect(probe()).toBe(1);
    const wild = g.state.players.find((p) => p.barbarian);
    if (wild) {
      musa.metSeats = [1, wild.id];
      expect(probe()).toBe(1);
    }
  });

  it('buys a helping of the ring for every two neighbours that answer', () => {
    const g = bench(['miningDistricts']);
    const city = town(g);
    const centre = around(g, city)[0]!;
    raiseImprovement(centre, 'mine', g.state.turn);
    const ring = neighborTiles(g.state.map, tileHex(centre));
    const paid = (): number => {
      const ctx = cityContext(g.state, city);
      const line = explainTileYield(centre, ctx).find((entry) =>
        entry.source.includes('Mining Districts'),
      );
      return line?.gold ?? 0;
    };
    // One mine beside it is half a helping, which is nothing — the division
    // floors, so an odd neighbour buys the miner nothing at all.
    raiseImprovement(ring[0]!, 'mine', g.state.turn);
    bumpRevision(g.state);
    expect(paid()).toBe(0);
    raiseImprovement(ring[1]!, 'mine', g.state.turn);
    bumpRevision(g.state);
    expect(paid()).toBe(1);
    raiseImprovement(ring[2]!, 'mine', g.state.turn);
    bumpRevision(g.state);
    expect(paid()).toBe(1);
    raiseImprovement(ring[3]!, 'mine', g.state.turn);
    bumpRevision(g.state);
    expect(paid()).toBe(2);
  });

  it('lifts the one-a-turn limit in the capital alone', () => {
    const g = bench([]);
    const capital = town(g, 0);
    const other = town(g, 5);
    empty(g, capital);
    empty(g, other);
    const musa = playerById(g.state, 0)!;
    musa.gold = 9000;
    const item = { kind: 'unit', id: 'warrior' } as const;
    // The limit as it stands: a town that has bought a soldier today is done.
    for (const city of [capital, other]) {
      city.purchasedUnitTurns = { militaryGold: g.state.turn };
    }
    expect(purchaseError(g.state, 0, capital.id, item, 'gold')).toContain('already bought');
    expect(purchaseError(g.state, 0, other.id, item, 'gold')).toContain('already bought');
    musa.statecraft.orders.push('theCapitalArsenal' as OrderId);
    musa.statecraft.slots.push({
      card: 'theCapitalArsenal' as OrderId,
      sealedUntil: g.state.turn,
    });
    bumpRevision(g.state);
    expect(purchaseError(g.state, 0, capital.id, item, 'gold')).toBeNull();
    // And nowhere else: the rule names the one town every empire has one of.
    expect(purchaseError(g.state, 0, other.id, item, 'gold')).toContain('already bought');
  });

  it('waives a unit’s strategic resource at the till and nowhere else', () => {
    const g = bench([]);
    const city = town(g);
    empty(g, city);
    const musa = playerById(g.state, 0)!;
    musa.gold = 9000;
    const gate = gatingTech('unit', 'horseman');
    expect(gate).not.toBeNull();
    musa.techsResearched.push(gate!);
    bumpRevision(g.state);
    const item = { kind: 'unit', id: 'horseman' } as const;
    // The empire has no horses, so both doors are shut.
    expect(buildError(g.state, 0, 'unit', 'horseman', city)).toContain('needs improved');
    expect(purchaseError(g.state, 0, city.id, item, 'gold')).toContain('needs improved');
    musa.statecraft.orders.push('foreignProcurement' as OrderId);
    musa.statecraft.slots.push({
      card: 'foreignProcurement' as OrderId,
      sealedUntil: g.state.turn,
    });
    bumpRevision(g.state);
    expect(purchaseError(g.state, 0, city.id, item, 'gold')).toBeNull();
    // **Production goes on asking.** The card says "when purchasing units", and
    // the queue is not the counter.
    expect(buildError(g.state, 0, 'unit', 'horseman', city)).toContain('needs improved');
  });

  it('doubles a domestic road into a small town, and leaves a big one alone', () => {
    const g = bench(['frontierInvestment']);
    const from = town(g, 0);
    const to = town(g, 4);
    from.population = 40;
    for (const id of ['granary', 'library', 'market', 'monument'] as const) {
      addBuilding(g.state, from, id);
    }
    to.population = 5;
    bumpRevision(g.state);
    const named = () =>
      explainRouteYieldBetween(g.state, from, to).filter((line) =>
        line.source.includes('Frontier Investment'),
      );
    const base = () =>
      foldRouteYield(
        explainRouteYieldBetween(g.state, from, to).filter(
          (line) => !line.source.includes('Frontier Investment'),
        ),
      );
    expect(foldRouteYield(named()).gold).toBe(base().gold);
    // One citizen more and the town has outgrown the subsidy.
    to.population = 6;
    bumpRevision(g.state);
    expect(named()).toEqual([]);
  });
});
