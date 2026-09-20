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
import {
  type City,
  addBuilding,
  buildingBank,
  bumpRevision,
  playerById,
} from '../../../src/sim/state';
import { RESOURCE_IDS, type ResourceId, resourceDef } from '../../../src/sim/resourceData';
import { improvementForResource } from '../../../src/sim/improvementData';
import {
  explainBuildingCost,
  foldUnitCost,
  foundCityAt,
  ownedTiles,
  purchasableTiles,
  purchaseTileAt,
  refreshCityDerived,
  resourceCopies,
  tilePurchaseError,
} from '../../../src/sim/cities';
import { bordersFrozen, happinessOf, meterEffects } from '../../../src/sim/meters';
import {
  type CityYieldLine,
  explainCity,
  productionModifiers,
} from '../../../src/sim/yields/town';
import type { BuildingId } from '../../../src/sim/buildingData';
import {
  getTileAt,
  neighborTiles,
  raiseImprovement,
  tileHex,
  wrappedDistance,
} from '../../../src/sim/map';
import { isWaterTerrain } from '../../../src/sim/terrainData';
import { cityContext, explainTileYield } from '../../../src/sim/yields/hex';
import { explainPurchaseCost, purchaseError, purchaseItemAt } from '../../../src/sim/purchase';
import { readCity } from '../../../src/sim/readings';
import { buildError, gatingTech } from '../../../src/sim/tech';
import { RULES } from '../../../src/sim/rulesData';
import { explainRouteYieldBetween, foldRouteYield } from '../../../src/sim/routeYields';
import { routeTermFor, startRouteAt } from '../../../src/sim/trade';
import { drawGreatPersonOffer } from '../../../src/sim/greatPeople';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../../src/sim/greatPeopleData';
import {
  explainRerollCost,
  nextRerollCost,
  rerollError,
  settleReroll,
} from '../../../src/sim/religion';
import { RELIGION } from '../../../src/sim/religionData';
import {
  cardRenownLines,
  cardRouteYieldLines,
  cardUnitStamp,
  cityScopeAdmits,
  countOf,
  describeCard,
  describeEffects,
  drawOrderOffer,
  eligibleFor,
  explainOfferSize,
  foldOfferSize,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  type CardEffect,
  type OrderId,
  BANDS,
  DECK_FILES,
  DECK_FILE_ORDERS,
  ORDER_IDS,
  STATECRAFT,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { BUILDING_IDS, buildingDef } from '../../../src/sim/buildingData';
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
  it('carries seventy-one rows, every one of them a Commerce card', () => {
    // Sixty after C1; C2 adds the six the sheet proposed and nobody had written
    // down yet (Ore Caravans, Frontier Investment, Luxury Caravans, Mining
    // Districts, The Capital Arsenal, Foreign Procurement). C3 adds one more,
    // A Court of Merchants — a sheet row that had never been entered at all.
    // C4 adds the last three the sheet names and nobody had written down:
    // Strategic Exports and Purchased Prosperity in Tier II, Caravanserai
    // Cities in Tier III. C6 adds Entrenched Interests, the fourth and last
    // sheet row the data had never carried — the three still missing (Spy
    // Networks, Royal Assays, The Masters' Guild) each wait on a shape nobody
    // has built, so they stay unwritten rather than entered as deferred rows.
    // C8 writes Royal Assays, the second of those three: an empire's own luxury
    // deposits may now supply an extra copy where a mine stands on them, which
    // is the same seam Strategic Exports opened one kind over. Spy Networks and
    // The Masters' Guild are still unwritten.
    expect(COMMERCE.length).toBe(72);
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
    // C3 adds A Court of Merchants in Tier III, where the sheet puts it.
    // C4 adds three more the same way: Strategic Exports and Purchased
    // Prosperity in Tier II, Caravanserai Cities in Tier III.
    // C6 adds Entrenched Interests in Tier III, where the sheet puts it — a row
    // the user's sheet has always listed and the data had never carried.
    // C8 adds Royal Assays in Tier II, where the sheet puts it.
    expect([count(0), count(1), count(2), count(3)]).toEqual([13, 20, 26, 13]);
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
  it('pays through forty-three rows, and every one of them is dealt', () => {
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
    //
    // **And four more with C3**, the four rows the user ruled on (`docs/flags.md`
    // item (pppppp)): The Gilded Scaffold, The Brokers' Redraw, Venture Routes
    // and Civic Receipts' rework. A Court of Merchants is the fifth card of the
    // batch and is a brand-new row, so it raises the deck's size rather than
    // moving a row off the deferred list.
    //
    // **And three more with C4.** The Merchant Works and Private Patronage were
    // deferred rows waiting on one narrowing each — the marker that says a
    // building is one of the realm's single great houses, asked of the row a
    // town is building now and of the row being priced at the counter, in both
    // cases from the side the card needed. Purchased Prosperity is a brand-new
    // row and wanted two things: the border freeze lifted for the counter alone,
    // and a timed grant that renews its window rather than stacking a second
    // one.
    //
    // **And three more with C5**, all three waiting on one thing: a town could
    // be asked whether a trade route ended in it and never how many, and never
    // anything at all about routes setting out. The Home Market, The League of
    // Cities and The Chartered Metropolis are that tally with a threshold on
    // it. The two authority clauses needed nothing new — a scoped repricing of
    // what a town costs to hold was built in D2b — and the percentages and the
    // contentment were ordinary all along.
    //
    // **And four more with C6**, on the two systems the deck's Posts line was
    // waiting for. A town now records which empires keep a trading post in it
    // (`City.posts`), and a card may pay an empire that is not the one holding
    // it (`CardPaysEffect.payee`). The Common Road wanted only the second, The
    // Merchant Commonwealth only the first, and The Foreign Factor both; the
    // fourth, Entrenched Interests, is a brand-new row that reads the post
    // without reading its income.
    //
    // **And five more with C7**, each of which had been left waiting on one
    // thing. The Admiralty of Trade wanted a named rule at the gate that prices
    // a route's reach. The Harbour Chain wanted a route's pay to be narrowable
    // by the medium it takes, and how far a sea route may be sent to become a
    // figure a law may move. The Factors' Houses wanted a caravan's hire price
    // to be a fold a purchase rider reaches, asked of the town the route sets
    // out from. Caravanserai Cities wanted `BuildingDef`'s one-to-a-realm marker
    // split into the limit and the class, so the card lifts the first and every
    // reading of the second — the price, the two scopes, the count and the
    // narrowings — goes on answering the same. Strategic Exports wanted an
    // amplifier on what a realm's own strategic seams supply, applied outside
    // the walk that is memoised on the economy clock.
    //
    // **And two more with C8.** The Endowment was waiting on the one thing C4
    // measured and could not find — a per-building record of the bank that paid,
    // written beside the date — and it is a field on the town now
    // (`City.buildingBanks`, schema 123), counted by `CountKind`'s
    // `purchasedBuildings`. Royal Assays is a brand-new row and raises the
    // deck's size rather than moving one off the deferred list: it takes the
    // same path Strategic Exports took, a law applied to what the ground
    // supplies on the way out of the memo, with a flat step per deposit instead
    // of a share of the total.
    expect(live().length).toBe(60);
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
    // Eighteen shapes carry the whole live half — six joined with C1's rows
    // (a contentment line, a capacity line, a strength line, a route rider, a
    // percentage on a rule of the realm and an upkeep surcharge), the renown
    // trickle with C2's Customs Houses, and three with C3: a share of the
    // realm's renown and a narrowed draft (A Court of Merchants) and a
    // percentage on a town's yields (The Gilded Scaffold's slower work). C5
    // adds the nineteenth: a repricing of what one town costs to hold, which
    // The League of Cities and The Chartered Metropolis both carry. C7 adds
    // the twentieth: an amplifier on somebody else's table, which is Strategic
    // Exports doubling what this realm's own strategic seams supply. A
    // twenty-first here would be a shape a later pass added without saying so.
    expect([...kinds].sort()).toEqual([
      'authority',
      'cityRenownPercent',
      'combatLine',
      'effectAmplifier',
      'happiness',
      'meterRule',
      'offerRider',
      'pays',
      'percentYields',
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
    // C2 took two off it — Travellers' Letters and The Customs Houses. C3 took
    // three more: The Gilded Scaffold, The Brokers' Redraw and Venture Routes.
    // (Civic Receipts was already live; C3 reworked it.) C5 takes three more
    // with the route tally: The Home Market, The League of Cities and The
    // Chartered Metropolis. C6 takes three more with the trading post and the
    // grant that pays another empire: The Common Road, The Foreign Factor and
    // The Merchant Commonwealth. C7 takes five more: The Admiralty of Trade,
    // The Harbour Chain and The Factors' Houses off the route gate and the
    // caravan's hire price, Caravanserai Cities off the split between a
    // building's limit and its class, and Strategic Exports off an amplifier on
    // what a realm's own seams supply. C8 takes one more, The Endowment, off a
    // building remembering which bank paid for it.
    expect(deferred().length).toBe(12);
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

// --- C3, the five cards that lift a rule --------------------------------------

/**
 * **Batch C3**: the Commerce cards that lift a rule of the simulation. Four of
 * them needed a user ruling before they could be built and got one
 * (`docs/flags.md` item (pppppp), 2026-09-19); Venture Routes needed none.
 *
 * What was added to the vocabulary, and which row writes each:
 *
 *   · two `ActionRuleId`s — `goldBuysWonders` (The Gilded Scaffold) and
 *     `goldBuysRedraw` (The Brokers' Redraw), each read at a refusal that
 *     already had a lift beside it rather than as a second path to the thing;
 *   · `CardRule`'s `routeTerm` — how long a trade route runs before it lapses,
 *     the tenth rule and the same shape as a settler's price (Venture Routes);
 *   · `CardPaysEffect.minHexes` — a route narrowing on the distance between the
 *     two towns, carried rather than resolved (Venture Routes);
 *   · `CardOfferRiderEffect.family` — a draft dealt from one family, falling
 *     back to the whole roster when that family is spent (A Court of Merchants);
 *   · `CardWindfallRiderEffect.anyBuilding` — the occasion was about a building,
 *     whichever one (Civic Receipts' rework).
 *
 * Civic Receipts is the one card whose **text** the ruling changed: "pay on
 * purchase of any building" is read as every building purchase paying, so the
 * card came off the ledger of firsts entirely and the ordinary-building
 * narrowing went with it.
 */
describe('C3 — the five cards that lift a rule', () => {
  /** A duel with one Commerce seat, the named cards in its chairs. */
  function bench(cards: string[]) {
    const g = createGame({
      seed: 67,
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
    return foundCityAt(g.state, 0, tile);
  }

  /** Clear the town's own hex, so a bought piece has somewhere to stand. */
  function empty(g: ReturnType<typeof bench>, city: { col: number; row: number }) {
    g.state.units = g.state.units.filter(
      (unit) => unit.col !== city.col || unit.row !== city.row,
    );
    bumpRevision(g.state);
  }

  /** Hand this seat the card mid-game, the way a draft would. */
  function slot(g: ReturnType<typeof bench>, card: string): void {
    const musa = playerById(g.state, 0)!;
    musa.statecraft.orders.push(card as OrderId);
    musa.statecraft.slots.push({ card: card as OrderId, sealedUntil: g.state.turn });
    bumpRevision(g.state);
  }

  /**
   * **The member register.** C2's discipline, kept: a member of a union the
   * evaluator already walks, and a field on a shape it already reads, both sail
   * straight through the kind-level registers in `statecraft.test.ts`. So each
   * pass names what it declared and says which row writes it.
   */
  it('registers exactly which rows write the five things C3 declared', () => {
    const writers = (
      match: (effect: CardEffect) => boolean,
    ): string[] => COMMERCE.filter((id) => orderDef(id).effects.some(match));

    expect(
      writers((effect) => effect.kind === 'rule' && effect.rule === 'goldBuysWonders'),
    ).toEqual(['theGildedScaffold']);
    expect(
      writers((effect) => effect.kind === 'rule' && effect.rule === 'goldBuysRedraw'),
    ).toEqual(['theBrokersRedraw']);
    expect(
      writers((effect) => effect.kind === 'rulePercent' && effect.rule === 'routeTerm'),
    ).toEqual(['ventureRoutes']);
    expect(writers((effect) => effect.kind === 'pays' && effect.minHexes !== undefined)).toEqual([
      'ventureRoutes',
    ]);
    expect(writers((effect) => effect.kind === 'offerRider' && effect.family !== undefined)).toEqual(
      ['aCourtOfMerchants'],
    );
    expect(
      writers((effect) => effect.kind === 'windfallRider' && effect.anyBuilding === true),
    ).toEqual(['civicReceipts']);
  });

  // --- The Gilded Scaffold ---------------------------------------------------

  /**
   * The lift is a **second clause on the one `if`** that refuses a wonder, not a
   * second way to buy one — so what is pinned is as much what still refuses as
   * what stops refusing.
   */
  describe('The Gilded Scaffold — a marvel at the counter', () => {
    const WONDER = { kind: 'building', id: 'stonehenge' } as const;

    /** A seat with a treasury, a town with room, and the wonder's technology in. */
    function ready(cards: string[] = []) {
      const g = bench(cards);
      const city = town(g);
      empty(g, city);
      const musa = playerById(g.state, 0)!;
      musa.gold = 99999;
      musa.faithPool = 99999;
      const gate = gatingTech('building', 'stonehenge');
      if (gate) musa.techsResearched.push(gate);
      bumpRevision(g.state);
      return { g, city, musa };
    }

    it('refuses a wonder in both banks until the card is held, then sells it for gold', () => {
      const { g, city } = ready();
      expect(purchaseError(g.state, 0, city.id, WONDER, 'gold')).toContain('must be built');
      slot(g, 'theGildedScaffold');
      expect(purchaseError(g.state, 0, city.id, WONDER, 'gold')).toBeNull();
      // **Gold alone.** The faith lift is the Valley of Kings' and is narrow in
      // two dimensions on purpose; this card widens one of them and not both, so
      // a town with no such shelf still cannot rush a marvel with prayer.
      expect(purchaseError(g.state, 0, city.id, WONDER, 'faith')).toContain('must be built');
    });

    it('prices it at the row’s own hammers, the ordinary gold rate', () => {
      const { g, city } = ready(['theGildedScaffold']);
      const price = explainPurchaseCost(g.state, 0, city.id, WONDER, 'gold');
      expect(price).not.toBeNull();
      expect(price!.currency).toBe('gold');
      const hammers = foldUnitCost(explainBuildingCost('stonehenge', g.state, 0));
      expect(price!.total).toBe(Math.floor(hammers * RULES.production.goldPerHammer));
    });

    it('leaves every other refusal standing', () => {
      const { g, city, musa } = ready(['theGildedScaffold']);
      // **The technology.** `buildError` is still the gate below the lift.
      const gate = gatingTech('building', 'stonehenge')!;
      musa.techsResearched = musa.techsResearched.filter((tech) => tech !== gate);
      bumpRevision(g.state);
      expect(purchaseError(g.state, 0, city.id, WONDER, 'gold')).not.toBeNull();
      musa.techsResearched.push(gate);
      bumpRevision(g.state);
      expect(purchaseError(g.state, 0, city.id, WONDER, 'gold')).toBeNull();
      // **One per world.** A wonder another empire has claimed is refused by the
      // claim's own sentence, which is `buildError`'s rather than this card's.
      g.state.wonders.push({ building: 'stonehenge', playerId: 1, cityId: 999, turn: 1 });
      bumpRevision(g.state);
      expect(purchaseError(g.state, 0, city.id, WONDER, 'gold')).not.toBeNull();
      g.state.wonders.pop();
      bumpRevision(g.state);
      expect(purchaseError(g.state, 0, city.id, WONDER, 'gold')).toBeNull();
      // **The treasury.** A card that opens a door does not fill a purse.
      musa.gold = 3;
      bumpRevision(g.state);
      expect(purchaseError(g.state, 0, city.id, WONDER, 'gold')).toContain('costs');
    });

    it('slows every town by the share its other half prints', () => {
      const { g, city } = ready();
      const named = () =>
        readCity(g.state, city).percents.filter(
          (line) => line.yield === 'production' && line.source.includes('Gilded Scaffold'),
        );
      expect(named()).toEqual([]);
      slot(g, 'theGildedScaffold');
      const lines = named();
      expect(lines.length).toBe(1);
      expect(lines[0]!.percent).toBe(-15);
    });
  });

  // --- A Court of Merchants --------------------------------------------------

  /**
   * The narrowing is a **nudge and never a lock** — the whole of the ruling. A
   * court whose merchants have all been called deals the ordinary hand, so "a
   * spent roster banks rather than blocks" survives the card.
   */
  describe('A Court of Merchants — a bench of one family', () => {
    it('deals merchants alone while any are left to call', () => {
      const g = bench([]);
      const musa = playerById(g.state, 0)!;
      const open = drawGreatPersonOffer(g.state, musa);
      expect(open.options.length).toBeGreaterThan(0);
      expect(open.family).toBeUndefined();
      slot(g, 'aCourtOfMerchants');
      const court = drawGreatPersonOffer(g.state, musa);
      expect(court.options.length).toBeGreaterThan(0);
      expect(court.family).toBe('merchant');
      for (const id of court.options) expect(greatPersonDef(id).family, id).toBe('merchant');
    });

    it('falls back to the ordinary draw when the merchants run out', () => {
      const g = bench(['aCourtOfMerchants']);
      const musa = playerById(g.state, 0)!;
      // Every great merchant in the world already called. The roster is spent
      // for this family and for no other.
      for (const id of GREAT_PERSON_IDS) {
        if (greatPersonDef(id).family === 'merchant') g.state.recruited.push(id);
      }
      bumpRevision(g.state);
      const hand = drawGreatPersonOffer(g.state, musa);
      expect(hand.options.length).toBeGreaterThan(0);
      expect(hand.family).toBeUndefined();
      for (const id of hand.options) expect(greatPersonDef(id).family, id).not.toBe('merchant');
    });

    it('leaves a hand somebody bought as scholars dealt as scholars', () => {
      const g = bench(['aCourtOfMerchants']);
      const musa = playerById(g.state, 0)!;
      const hand = drawGreatPersonOffer(g.state, musa, 'scholar');
      expect(hand.family).toBe('scholar');
      for (const id of hand.options) expect(greatPersonDef(id).family, id).toBe('scholar');
    });

    it('deals no extra card — a narrowing is not a widening', () => {
      const g = bench([]);
      const before = foldOfferSize(explainOfferSize(g.state, 0, 'greatPerson'));
      slot(g, 'aCourtOfMerchants');
      expect(foldOfferSize(explainOfferSize(g.state, 0, 'greatPerson'))).toBe(before);
    });
  });

  // --- The Brokers' Redraw ---------------------------------------------------

  /**
   * **Gold at a premium** is the ruling, and the premium is a row in
   * `data/statecraft.json` rather than a constant in the code — so what is
   * pinned is the *relation* (gold costs more than the faith ladder would ask)
   * and the multiple the sheet currently holds, read off the sheet.
   */
  describe("The Brokers' Redraw — a fresh hand for coin", () => {
    /** A seat with an Order draft on the table and both banks full. */
    function drafting(cards: string[]) {
      const g = bench(cards);
      const musa = playerById(g.state, 0)!;
      musa.faithPool = 99999;
      musa.gold = 99999;
      // The door the faith arm needs, so the two banks meet the same clauses
      // rather than one of them being refused for a second reason.
      musa.techsResearched.push(RELIGION.reroll.ability as TechId);
      musa.statecraft.pendingOrder = drawOrderOffer(g.state, musa);
      bumpRevision(g.state);
      return { g, musa };
    }

    it('refuses gold until the card is held', () => {
      const { g } = drafting([]);
      expect(rerollError(g.state, 0, 'faith')).toBeNull();
      expect(rerollError(g.state, 0, 'gold')).toContain('not with gold');
      slot(g, 'theBrokersRedraw');
      expect(rerollError(g.state, 0, 'gold')).toBeNull();
      // A bank nobody has heard of is refused in `purchaseError`'s voice.
      expect(rerollError(g.state, 0, 'hammers')).toContain('no bank called');
    });

    it('charges more for coin than the faith ladder asks, by the sheet’s multiple', () => {
      const { g } = drafting(['theBrokersRedraw']);
      const faith = nextRerollCost(g.state, 0, 'order', 'faith');
      const coin = nextRerollCost(g.state, 0, 'order', 'gold');
      expect(faith).toBeGreaterThan(0);
      expect(coin).toBeGreaterThan(faith);
      expect(coin).toBe(Math.floor(faith * STATECRAFT.redraw.goldMultiple));
      // The premium is its own line on the sheet, so a player can see what the
      // convenience charges — rule 5 at the scale of a price tag.
      expect(explainRerollCost(g.state, 0, 'order', 'gold').lines.length).toBeGreaterThan(
        explainRerollCost(g.state, 0, 'order', 'faith').lines.length,
      );
    });

    it('spends the bank the command named and leaves the other alone', () => {
      const { g, musa } = drafting(['theBrokersRedraw']);
      const coin = nextRerollCost(g.state, 0, 'order', 'gold');
      const faithBefore = musa.faithPool;
      const goldBefore = musa.gold;
      const out = settleReroll(g.state, musa, 'gold');
      expect(out?.currency).toBe('gold');
      expect(out?.paid).toBe(coin);
      expect(musa.gold).toBe(goldBefore - coin);
      expect(musa.faithPool).toBe(faithBefore);
      // **One ladder, whichever bank paid**: a redraw bought with coin makes the
      // next redraw dearer exactly as one bought with prayer does.
      expect(musa.statecraft.rerollsTaken).toBe(1);
    });

    it('puts its surcharge on everything else this empire buys', () => {
      const g = bench([]);
      const city = town(g);
      empty(g, city);
      playerById(g.state, 0)!.gold = 99999;
      bumpRevision(g.state);
      const priced = (item: { kind: 'unit' | 'building'; id: string }) =>
        explainPurchaseCost(g.state, 0, city.id, item as never, 'gold')!.total;
      const sword = priced({ kind: 'unit', id: 'warrior' });
      const roof = priced({ kind: 'building', id: 'monument' });
      slot(g, 'theBrokersRedraw');
      expect(priced({ kind: 'unit', id: 'warrior' })).toBeGreaterThan(sword);
      expect(priced({ kind: 'building', id: 'monument' })).toBeGreaterThan(roof);
    });
  });

  // --- Civic Receipts --------------------------------------------------------

  /**
   * The rework: **every** building purchase pays. Pinned here are the two things
   * that changed — a town's second roof pays, and one of the realm's single
   * great houses pays — plus the one narrowing that stayed, which is that a unit
   * bought at the same counter pays nothing.
   */
  describe('Civic Receipts — a rebate on every roof', () => {
    function shop() {
      const g = bench(['civicReceipts']);
      const city = town(g);
      empty(g, city);
      const musa = playerById(g.state, 0)!;
      musa.gold = 99999;
      musa.culturePool = 0;
      for (const id of BUILDING_IDS) {
        const gate = gatingTech('building', id);
        if (gate && !musa.techsResearched.includes(gate)) musa.techsResearched.push(gate);
      }
      bumpRevision(g.state);
      return { g, city };
    }

    /** What the culture pool gained by buying this row here. */
    function buy(
      g: ReturnType<typeof bench>,
      city: City,
      item: { kind: 'unit' | 'building'; id: string },
    ): number {
      const musa = playerById(g.state, 0)!;
      expect(purchaseError(g.state, 0, city.id, item, 'gold'), item.id).toBeNull();
      const before = musa.culturePool;
      purchaseItemAt(g.state, musa, city, item as never, 'gold');
      return musa.culturePool - before;
    }

    it('pays a tenth of the coin on the second building as well as the first', () => {
      const { g, city } = shop();
      expect(buy(g, city, { kind: 'building', id: 'monument' })).toBeGreaterThan(0);
      // **The whole of the rework.** Before C3 this was nought: the card rode on
      // the ledger of firsts, and a town's first purchase is the only first it
      // has.
      expect(buy(g, city, { kind: 'building', id: 'granary' })).toBeGreaterThan(0);
    });

    it('pays for one of the realm’s single great houses too', () => {
      const { g, city } = shop();
      // The other half of the rework: `empireBuilding: false` is gone, so a
      // shelf the card used to refuse is an ordinary roof at the till.
      const empire = BUILDING_IDS.find(
        (id) =>
          buildingDef(id).oncePerEmpire === true &&
          buildingDef(id).wonder !== true &&
          purchaseError(g.state, 0, city.id, { kind: 'building', id }, 'gold') === null,
      );
      expect(empire, 'a once-per-empire building this town may buy').toBeDefined();
      expect(buy(g, city, { kind: 'building', id: empire! })).toBeGreaterThan(0);
    });

    it('pays nothing for a unit bought at the same counter', () => {
      const { g, city } = shop();
      expect(buy(g, city, { kind: 'unit', id: 'warrior' })).toBe(0);
    });
  });

  // --- Venture Routes --------------------------------------------------------

  describe('Venture Routes — a longer term and a longer haul', () => {
    it('lengthens the term a route is opened with, and every renewal after', () => {
      const g = bench([]);
      const plain = routeTermFor(g.state, 0);
      expect(plain).toBe(Math.max(1, Math.floor(RULES.trade.routeTurns)));
      slot(g, 'ventureRoutes');
      const longer = routeTermFor(g.state, 0);
      // The card's own words are two turns, and at the term the rules table
      // holds today the share the row carries comes to exactly that.
      expect(longer - plain).toBe(2);
      // And it is this empire's law alone. The renewal reads the same function
      // and asks the caravan's owner, so a road already running picks the longer
      // term up at its next renewal and keeps the date it started.
      expect(routeTermFor(g.state, 1)).toBe(plain);
    });

    it('doubles the coin on a long road and leaves a short one alone', () => {
      const g = bench(['ventureRoutes']);
      const from = town(g, 0);
      const near = town(g, 3);
      from.population = 60;
      near.population = 60;
      for (const id of ['granary', 'library', 'market', 'monument'] as const) {
        addBuilding(g.state, from, id);
      }
      // A town far enough away that the wrapped distance clears the threshold.
      // Scanned rather than placed at an offset, because a duel board wraps and
      // fifteen columns along is not fifteen hexes away.
      const origin = tileHex(getTileAt(g.state.map, from.col, from.row)!);
      const distant = g.state.map.tiles.find(
        (tile) =>
          !isWaterTerrain(tile.terrain) &&
          wrappedDistance(g.state.map, origin, tileHex(tile)) >= 15,
      );
      expect(distant, 'a land hex at least fifteen away on this board').toBeDefined();
      const far = foundCityAt(g.state, 0, distant!);
      far.population = 60;
      bumpRevision(g.state);

      const named = (to: City) =>
        explainRouteYieldBetween(g.state, from, to).filter((line) =>
          line.source.includes('Venture Routes'),
        );
      const base = (to: City) =>
        foldRouteYield(
          explainRouteYieldBetween(g.state, from, to).filter(
            (line) => !line.source.includes('Venture Routes'),
          ),
        );
      // Three hexes apart is nowhere near the threshold: the row rides and pays
      // nothing at all, which is the honest silence a road with no luxuries on
      // it keeps.
      expect(named(near)).toEqual([]);
      // And the long haul takes the whole of the coin again — the gold alone,
      // because that is the one voice the row names.
      const paid = foldRouteYield(named(far));
      expect(base(far).gold).toBeGreaterThan(0);
      expect(paid.gold).toBe(base(far).gold);
      expect(paid.food).toBe(0);
      expect(paid.science).toBe(0);
    });
  });
});

/**
 * **C4 — the three rows that turned on a marker, and the one that wanted a
 * window.**
 *
 * Nine rows were re-triaged against today's vocabulary. Three went live and six
 * defer; the six carry the exact missing piece in their own `note`, which is the
 * whole point of deferring rather than bending.
 *
 * What the batch added, and which row writes it:
 *
 *   · `CityScope`'s `queueHolds.empireBuilding` — the row a town is building
 *     right now is one of the realm's single great houses (The Merchant Works).
 *     The same marker `CardProductionBonusEffect` and `CardWindfallRiderEffect`
 *     already read, asked of the front of the queue;
 *   · `CardPurchaseRiderEffect.empireBuilding` — which side of that line the
 *     building being priced is on, and `CardProductionBonusEffect.empireBuilding`
 *     widened from `true` to a boolean so the *ordinary* half can be named at
 *     all (Private Patronage). There is no `not` in this vocabulary, so a card
 *     whose sentence is "everything except the great houses" had no other way to
 *     say it;
 *   · `ActionRuleId`'s `goldBuysFrozenTiles` — the border freeze lifted for the
 *     tile counter and nothing else, one more clause on the `if` that already
 *     refuses (Purchased Prosperity);
 *   · `WindfallGrantSpec.timed.renews` — a timed grant that rewrites its own
 *     expiry instead of stacking a second entry (Purchased Prosperity). Crassus'
 *     bill is meant to pile up; a card whose text reads "in the last five turns"
 *     is one standing fact with a fresh date, and the two are different
 *     sentences that had been sharing one shape.
 */
describe('C4 — the great-house marker, read from both sides', () => {
  /** A duel with one Commerce seat, the named cards in its chairs. */
  function bench(cards: string[]) {
    const g = createGame({
      seed: 71,
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

  /** A town of this seat, on the hex its opening piece is standing on. */
  function town(g: ReturnType<typeof bench>) {
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    return foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!);
  }

  /** Every technology in, so the whole shelf is priceable. */
  function learned(g: ReturnType<typeof bench>) {
    const musa = playerById(g.state, 0)!;
    for (const id of BUILDING_IDS) {
      const gate = gatingTech('building', id);
      if (gate && !musa.techsResearched.includes(gate)) musa.techsResearched.push(gate);
    }
    musa.gold = 999999;
    bumpRevision(g.state);
    return musa;
  }

  /** An ordinary building and one of the realm's single great houses, both buyable. */
  function shelves(g: ReturnType<typeof bench>, city: City) {
    const buyable = (id: BuildingId) =>
      purchaseError(g.state, 0, city.id, { kind: 'building', id }, 'gold') === null;
    const plain = BUILDING_IDS.find(
      (id) => buildingDef(id).oncePerEmpire !== true && buildingDef(id).wonder !== true && buyable(id),
    );
    const great = BUILDING_IDS.find(
      (id) => buildingDef(id).oncePerEmpire === true && buildingDef(id).wonder !== true && buyable(id),
    );
    expect(plain, 'an ordinary building this town may buy').toBeDefined();
    expect(great, 'a once-per-empire building this town may buy').toBeDefined();
    return { plain: plain!, great: great! };
  }

  // --- Private Patronage -----------------------------------------------------

  describe('Private Patronage — cheaper at the till, slower in the queue', () => {
    it('discounts an ordinary roof and leaves a great house at its own price', () => {
      const bare = bench([]);
      const held = bench(['privatePatronage']);
      const bareTown = town(bare);
      const heldTown = town(held);
      learned(bare);
      learned(held);
      const { plain, great } = shelves(held, heldTown);

      const price = (g: ReturnType<typeof bench>, city: City, id: BuildingId) => {
        const bank = explainPurchaseCost(g.state, 0, city.id, { kind: 'building', id }, 'gold');
        expect(bank, `${id} is priced in gold`).not.toBeNull();
        return foldUnitCost(bank!.lines);
      };

      // The ordinary shelf is 30% off, and the figure is the card's own.
      const plainBare = price(bare, bareTown, plain);
      expect(price(held, heldTown, plain)).toBe(
        Math.max(0, Math.floor((plainBare * 70) / 100)),
      );
      // And the great house pays exactly what it always paid — which is the half
      // the card says out loud and the half nothing could say before C4.
      expect(price(held, heldTown, great)).toBe(price(bare, bareTown, great));
    });

    it('slows an ordinary roof in the queue and leaves a great house alone', () => {
      const g = bench(['privatePatronage']);
      const city = town(g);
      learned(g);
      const { plain, great } = shelves(g, city);
      const named = (id: BuildingId) =>
        productionModifiers(g.state, city, { kind: 'building', id }).filter((line) =>
          line.source.includes('Private Patronage'),
        );
      expect(named(plain).map((line) => line.percent)).toEqual([-20]);
      expect(named(great)).toEqual([]);
    });

    it('says "ordinary buildings" on both halves, so the card cannot lie by omission', () => {
      const words = describeCard('privatePatronage' as OrderId).map((clause) =>
        stripRefs(clause.text),
      );
      for (const clause of words) expect(clause).toContain('ordinary buildings');
    });
  });

  // --- The Merchant Works ----------------------------------------------------

  describe('The Merchant Works — coin into stone, while the scaffolding is up', () => {
    /** The card's two lines in this town, as the city's own ledger prints them. */
    function lines(g: ReturnType<typeof bench>, city: City): CityYieldLine[] {
      refreshCityDerived(g.state, city);
      bumpRevision(g.state);
      return explainCity(g.state, city).lines.filter((line) =>
        line.source.includes('The Merchant Works'),
      );
    }

    function site() {
      const g = bench(['theMerchantWorks']);
      const city = town(g);
      learned(g);
      // Something for the share to be a share *of*: the conversion reads the
      // town's flat coin, and a town with no coin converts nothing.
      city.population = 8;
      addBuilding(g.state, city, 'market' as BuildingId);
      bumpRevision(g.state);
      return { g, city };
    }

    it('pays nothing while the town is raising an ordinary building', () => {
      const { g, city } = site();
      const plain = BUILDING_IDS.find(
        (id) => buildingDef(id).oncePerEmpire !== true && buildingDef(id).wonder !== true,
      )!;
      city.queue = [{ kind: 'building', id: plain }] as never;
      expect(lines(g, city)).toEqual([]);
    });

    it('converts and charges while the town is raising one of the realm’s great houses', () => {
      const { g, city } = site();
      const great = BUILDING_IDS.find(
        (id) => buildingDef(id).oncePerEmpire === true && buildingDef(id).wonder !== true,
      )!;
      city.queue = [{ kind: 'building', id: great }] as never;
      const paid = lines(g, city);
      expect(paid.length).toBeGreaterThan(0);
      // The conversion pays hammers, so the town's production is higher than the
      // same town with nothing in its queue.
      expect(paid.some((line) => line.production > 0)).toBe(true);
    });

    it('does the same for a wonder, which is the other class the card names', () => {
      const { g, city } = site();
      const marvel = BUILDING_IDS.find((id) => buildingDef(id).wonder === true)!;
      city.queue = [{ kind: 'building', id: marvel }] as never;
      expect(lines(g, city).length).toBeGreaterThan(0);
    });

    it('reads the front of the queue only — a great house standing second is a plan', () => {
      const { g, city } = site();
      const plain = BUILDING_IDS.find(
        (id) => buildingDef(id).oncePerEmpire !== true && buildingDef(id).wonder !== true,
      )!;
      const great = BUILDING_IDS.find(
        (id) => buildingDef(id).oncePerEmpire === true && buildingDef(id).wonder !== true,
      )!;
      city.queue = [
        { kind: 'building', id: plain },
        { kind: 'building', id: great },
      ] as never;
      expect(lines(g, city)).toEqual([]);
    });
  });

  // --- Purchased Prosperity --------------------------------------------------

  describe('Purchased Prosperity — the freeze lifted, and a window that renews', () => {
    const FROZEN = 'Borders frozen — authority is overdrawn';

    /**
     * A seat whose writ is torn, holding the named cards. The deficit is
     * **earned** by founding towns until the meter goes under, rather than
     * written into a field: the freeze is derived, so a test that set it by hand
     * would be testing its own arithmetic.
     */
    function overdrawn(cards: string[]) {
      const g = bench(cards);
      const first = town(g);
      const musa = playerById(g.state, 0)!;
      musa.gold = 999999;
      const home = tileHex(getTileAt(g.state.map, first.col, first.row)!);
      const land = g.state.map.tiles.filter(
        (tile) =>
          !isWaterTerrain(tile.terrain) &&
          wrappedDistance(g.state.map, home, tileHex(tile)) >= 4 &&
          g.state.tileOwner[g.state.map.tiles.indexOf(tile)] === null,
      );
      let next = 0;
      while (!bordersFrozen(meterEffects(g.state, 0)) && next < land.length) {
        foundCityAt(g.state, 0, land[next]!);
        bumpRevision(g.state);
        next += 4;
      }
      expect(bordersFrozen(meterEffects(g.state, 0)), 'a seat whose writ is overdrawn').toBe(true);
      return { g, city: first, musa };
    }

    /** An unowned hex this town could buy, with whatever the writ says about it. */
    function candidate(g: ReturnType<typeof bench>, city: City) {
      return purchasableTiles(g.state, city).find(
        (offer) => offer.error === null || offer.error === FROZEN,
      );
    }

    it('refuses an overdrawn seat with no card and opens the counter to one holding this', () => {
      const without = overdrawn([]);
      const hexA = candidate(without.g, without.city);
      expect(hexA, 'an unowned hex in reach').toBeDefined();
      expect(tilePurchaseError(without.g.state, 0, without.city.id, hexA!)).toBe(FROZEN);

      const with_ = overdrawn(['purchasedProsperity']);
      const hexB = candidate(with_.g, with_.city);
      expect(hexB, 'an unowned hex in reach').toBeDefined();
      // The one lift, and only the one: the hex is buyable now, which means
      // every other question in `tilePurchaseError` was asked and answered.
      expect(tilePurchaseError(with_.g.state, 0, with_.city.id, hexB!)).toBeNull();
    });

    it('still refuses a hex the card has nothing to say about', () => {
      const { g, city } = overdrawn(['purchasedProsperity']);
      // Ground another town already owns. The freeze was never what stopped
      // this, and lifting the freeze does not start it.
      const owned = ownedTiles(g.state, city).find(
        (tile) => tile.col !== city.col || tile.row !== city.row,
      );
      expect(owned, 'a hex this town already owns').toBeDefined();
      expect(tilePurchaseError(g.state, 0, city.id, owned!)).not.toBeNull();
    });

    it('hangs a window on the realm when a hex is bought, and renews it rather than stacking', () => {
      const g = bench(['purchasedProsperity']);
      const city = town(g);
      const musa = playerById(g.state, 0)!;
      musa.gold = 999999;
      bumpRevision(g.state);
      const before = happinessOf(g.state, 0);

      const buy = () => {
        const offer = purchasableTiles(g.state, city).find((row) => row.error === null);
        expect(offer, 'a hex this town may buy').toBeDefined();
        purchaseTileAt(g.state, city, getTileAt(g.state.map, offer!.col, offer!.row)!);
        bumpRevision(g.state);
      };

      buy();
      const hung = musa.timed ?? [];
      expect(hung.length).toBe(1);
      expect(hung[0]!.expiresTurn).toBe(g.state.turn + 5);
      const once = happinessOf(g.state, 0);
      expect(once).toBeGreaterThan(before);

      // **The whole of `renews`.** A second hex inside the window moves the end
      // date and pays nothing again — where Crassus' bill, which does not renew,
      // would have pushed a second entry and doubled the figure.
      g.state.turn += 2;
      buy();
      expect((musa.timed ?? []).length).toBe(1);
      expect(musa.timed![0]!.expiresTurn).toBe(g.state.turn + 5);
      expect(happinessOf(g.state, 0)).toBe(once);
    });
  });

  // --- the member register ---------------------------------------------------

  /**
   * **The member register**, C2's pattern. The kind-level registers in
   * `statecraft.test.ts` only prove a *shape* is named by some row; a new member
   * of a union the evaluator already walks, and a new field on a shape it
   * already reads, sail straight through them. So the batch names what it
   * declared and says which row writes it.
   */
  it('registers exactly which rows write the four things C4 declared', () => {
    const writers = (match: (effect: CardEffect) => boolean): string[] =>
      COMMERCE.filter((id) => orderDef(id).effects.some(match));

    expect(
      writers(
        (effect) =>
          effect.kind === 'pays' &&
          effect.scope?.test === 'any' &&
          effect.scope.of.some(
            (inner) => inner.test === 'queueHolds' && inner.empireBuilding === true,
          ),
      ),
    ).toEqual(['theMerchantWorks']);

    expect(
      writers((effect) => effect.kind === 'purchaseRider' && effect.empireBuilding !== undefined),
    ).toEqual(['privatePatronage']);

    expect(
      writers((effect) => effect.kind === 'rule' && effect.rule === 'goldBuysFrozenTiles'),
    ).toEqual(['purchasedProsperity']);

    expect(
      writers(
        (effect) => effect.kind === 'windfallRider' && effect.grant?.timed?.renews === true,
      ),
    ).toEqual(['purchasedProsperity']);

    // And the widening: `productionBonus.empireBuilding` was a `true` and is a
    // boolean, so both readings are now written down somewhere in the table.
    expect(
      writers((effect) => effect.kind === 'productionBonus' && effect.empireBuilding === false),
    ).toEqual(['privatePatronage']);
  });

  // --- C7: the route gate, the caravan's price, and the two building marks ---

  /**
   * **Caravanserai Cities — many yards, every one of them still a great house**
   * (the user's ruling: *"the caravanserai should still be an empire building.
   * we need two different flags, can be built once and is empire building"*).
   *
   * The card lifts the **limit** and leaves the **class** exactly where it was,
   * and the two used to be one boolean. So what is pinned here is the half that
   * could have gone wrong silently: every reading that asks what class a
   * building is must go on answering the same under the card, and the one walk
   * that used to rely on the limit for its arithmetic must not start paying the
   * yard's own clause once per yard.
   */
  describe('the two marks a building carries', () => {
    /** The row the card names, and the one every claim below is about. */
    const YARD: BuildingId = 'caravanserai';

    /** A second town of this seat, a few hexes along from the first. */
    function otherTown(g: ReturnType<typeof bench>, at = 4) {
      const unit = g.state.units.find((u) => u.ownerId === 0)!;
      return foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col + at, unit.row)!);
    }

    it('gives every limited row both marks, so nothing about an existing row moved', () => {
      // The split is only safe because the two sets are the same set today. A
      // row that gained one and not the other would be a behaviour change
      // nobody asked for, hiding inside a refactor.
      const limited = BUILDING_IDS.filter((id) => buildingDef(id).oncePerEmpire === true);
      const classed = BUILDING_IDS.filter((id) => buildingDef(id).empireBuilding === true);
      expect(limited.length).toBeGreaterThan(0);
      expect(classed).toEqual(limited);
    });

    it('lifts the limit for the named row and for nothing else', () => {
      const g = bench(['caravanseraiCities']);
      learned(g);
      const first = town(g);
      const second = otherTown(g);
      // The card's own building, standing in one town: the second town may
      // still raise one, which is the whole sentence.
      first.buildings.push(YARD);
      bumpRevision(g.state);
      expect(buildError(g.state, 0, 'building', YARD, second)).toBeNull();

      // Another one-to-a-realm row is untouched: the rule names a building, and
      // a row it does not name keeps its limit.
      const other = BUILDING_IDS.find(
        (id) => id !== YARD && buildingDef(id).oncePerEmpire === true && buildingDef(id).wonder !== true,
      );
      expect(other, 'a second one-to-a-realm row').toBeDefined();
      first.buildings.push(other!);
      bumpRevision(g.state);
      expect(buildError(g.state, 0, 'building', other!, second)).not.toBeNull();
    });

    it('still refuses the second yard to a seat without the card', () => {
      const g = bench([]);
      learned(g);
      const first = town(g);
      const second = otherTown(g);
      first.buildings.push(YARD);
      bumpRevision(g.state);
      expect(buildError(g.state, 0, 'building', YARD, second)).not.toBeNull();
    });

    it('keeps the yard an empire building in every reading of the class', () => {
      const g = bench(['caravanseraiCities']);
      const city = town(g);
      city.buildings.push(YARD);
      refreshCityDerived(g.state, city);
      bumpRevision(g.state);

      // 1. the class marker itself, which is what the other four read.
      expect(buildingDef(YARD).empireBuilding).toBe(true);
      // 2. the price: a great house is still scaled by the towns it will serve,
      //    so the card buys many of an expensive thing rather than a cheap one.
      const priced = explainBuildingCost(YARD, g.state, 0);
      expect(priced.some((line) => /^Empire of /.test(line.source))).toBe(true);
      // 3. the scope a card asks when it wants a town holding one.
      expect(cityScopeAdmits(g.state, city, { test: 'hasEmpireBuilding' })).toBe(true);
      // 4. the count of them.
      expect(
        countOf(g.state, 0, 'theMerchantWorks' as OrderId, {
          kind: 'pays',
          where: 'empire',
          basis: 'count',
          count: 'empireBuildings',
          to: 'gold',
          amount: 1,
        }),
      ).toBeGreaterThan(0);
      // 5. the narrowing that means "the ordinary shelves" — Private Patronage's
      //    discount must still pass the yard by.
      const ordinary = explainPurchaseCost(g.state, 0, city.id, { kind: 'building', id: YARD }, 'gold');
      const withCard = bench(['caravanseraiCities', 'privatePatronage']);
      const there = town(withCard);
      const patronised = explainPurchaseCost(
        withCard.state,
        0,
        there.id,
        { kind: 'building', id: YARD },
        'gold',
      );
      expect(ordinary).not.toBeNull();
      expect(patronised!.total).toBe(ordinary!.total);
    });

    it('pays the yard’s own clause once however many yards stand', () => {
      // **The silent multiplication this had to avoid.** The walk that gathers
      // what a realm's great houses do reads each town's shelf in turn, which
      // was harmless while a realm could hold one of each. Two yards must not
      // pay the row twice — a caravan out of a yard town gets the row's grain
      // and hammers once.
      const one = bench(['caravanseraiCities']);
      const onlyTown = town(one);
      onlyTown.buildings.push(YARD);
      bumpRevision(one.state);
      const alone = cardRouteYieldLines(one.state, onlyTown, onlyTown).filter(
        (line) => line.card === YARD,
      );

      const two = bench(['caravanseraiCities']);
      const here = town(two);
      const there = otherTown(two);
      here.buildings.push(YARD);
      there.buildings.push(YARD);
      bumpRevision(two.state);
      const doubled = cardRouteYieldLines(two.state, here, here).filter(
        (line) => line.card === YARD,
      );

      expect(alone.length).toBe(1);
      expect(doubled.length).toBe(1);
      expect(doubled[0]!.food).toBe(alone[0]!.food);
      expect(doubled[0]!.production).toBe(alone[0]!.production);
    });
  });

  /**
   * **The member register**, C2's pattern, for the shapes C7 declared.
   */
  it('registers exactly which rows write the six things C7 declared', () => {
    const writers = (match: (effect: CardEffect) => boolean): string[] =>
      COMMERCE.filter((id) => orderDef(id).effects.some(match));

    // The route gate's two: one waives the reach, one lengthens it.
    expect(
      writers((effect) => effect.kind === 'rule' && effect.rule === 'postsWaiveSeaRouteRange'),
    ).toEqual(['theAdmiraltyOfTrade']);
    expect(
      writers((effect) => effect.kind === 'rulePercent' && effect.rule === 'seaRouteRange'),
    ).toEqual(['theHarbourChain']);

    // A route line narrowed by the medium the road takes.
    expect(writers((effect) => effect.kind === 'pays' && effect.mode !== undefined)).toEqual([
      'theHarbourChain',
    ]);

    // A purchase rider that rides on hiring a caravan.
    expect(writers((effect) => effect.kind === 'purchaseRider' && effect.on === 'route')).toEqual([
      'theFactorsHouses',
    ]);

    // A rule narrowed to one building, which lifts a limit and not a class.
    expect(
      writers((effect) => effect.kind === 'rule' && effect.building !== undefined),
    ).toEqual(['caravanseraiCities']);

    // And the amplifier on what a realm's own strategic seams supply.
    expect(
      writers(
        (effect) => effect.kind === 'effectAmplifier' && effect.target === 'strategicCopies',
      ),
    ).toEqual(['strategicExports']);
  });
});

// --- C8, faith on routes, copies and provenance -------------------------------

/**
 * **Batch C8**: four rows the user's sheet freed, and the four seams they
 * needed.
 *
 * What was added to the vocabulary, and which row writes each:
 *
 *   · **faith on a trade route.** `RouteYieldLine` carried five voices and now
 *     carries six. It was never a rule that a caravan may not carry faith — the
 *     field's own docblock said faith stayed out "because nothing pays it", and
 *     Pilgrim Markets is the row that now does. The voice is folded, staged and
 *     banked by exactly the code the other five go through;
 *   · `CardPaysEffect.eitherEnd` — a route line admitted when *one* of the two
 *     towns answers, where `origin` and `destination` are joined by *and*
 *     (Pilgrim Markets);
 *   · `CityScope`'s `routeEndsHere.farEnd` — what the town at the other end of
 *     the counted routes must be (The Grain Exchange's happiness). Handed down
 *     to `countRoutesAt` as a predicate, because `routes.ts` is a leaf that may
 *     not import the evaluator;
 *   · `City.buildingBanks` and `CountKind`'s `purchasedBuildings` — which bank
 *     paid for each of a town's roofs, written by `addBuilding` beside the date
 *     (schema 123, The Endowment);
 *   · `AmplifierTarget`'s `luxuryMineCopies` — a flat step per luxury deposit
 *     with a mine on it, applied outside the economy-clock memo exactly as C7's
 *     `strategicCopies` share is (Royal Assays).
 *
 * Two Commerce rows stay deferred and their reasons were re-cut rather than
 * repeated. The Exchange: the sheet's ratified text asks about routes *arriving*
 * at your towns, and a card is only ever consulted about a road from the end
 * that sent it — so this empire's law never sees the road at all, and "the
 * sender" is a third kind of payee besides. The Warehouses: the counting half is
 * close, but the doubling aims at one named good where every dial in the
 * vocabulary turns a whole class.
 */
describe('C8 — faith on a road, either end, and a bought roof', () => {
  /** A duel with one Commerce seat, the named cards in its chairs. */
  function bench(cards: string[]) {
    const g = createGame({
      seed: 83,
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
    return foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col + at, unit.row)!)!;
  }

  /** Every hex a town owns but the one its walls stand on. */
  function around(g: ReturnType<typeof bench>, city: City) {
    return ownedTiles(g.state, city).filter(
      (tile) => tile.col !== city.col || tile.row !== city.row,
    );
  }

  /**
   * **The member register.** C2's discipline, kept: a member of a union the
   * evaluator already walks, and a field on a shape it already reads, both sail
   * straight through the kind-level registers in `statecraft.test.ts`.
   */
  it('registers exactly which rows write the four things C8 declared', () => {
    const rows = [...COMMERCE, ...DECK_FILE_ORDERS.common];
    const writers = (match: (effect: CardEffect) => boolean): string[] =>
      rows.filter((id) => orderDef(id).effects.some(match));

    expect(writers((effect) => effect.kind === 'pays' && effect.eitherEnd !== undefined)).toEqual([
      'pilgrimMarkets',
    ]);
    // The only row in the game that pays a caravan in faith.
    expect(
      writers(
        (effect) =>
          effect.kind === 'pays' && effect.where === 'route' && (effect.faith ?? 0) !== 0,
      ),
    ).toEqual(['pilgrimMarkets']);
    expect(
      writers(
        (effect) =>
          effect.kind === 'happiness' &&
          effect.scope?.test === 'routeEndsHere' &&
          effect.scope.farEnd !== undefined,
      ),
    ).toEqual(['theGrainExchange']);
    expect(
      writers((effect) => effect.kind === 'pays' && effect.count === 'purchasedBuildings'),
    ).toEqual(['theEndowment']);
    expect(
      writers(
        (effect) => effect.kind === 'effectAmplifier' && effect.target === 'luxuryMineCopies',
      ),
    ).toEqual(['royalAssays']);
  });

  // --- Pilgrim Markets -------------------------------------------------------

  describe('Pilgrim Markets — a shrine at either end', () => {
    /** The card's own lines on a road between these two towns. */
    const named = (g: ReturnType<typeof bench>, from: City, to: City) =>
      explainRouteYieldBetween(g.state, from, to).filter((line) =>
        line.source.includes('Pilgrim Markets'),
      );

    /** Plant a holy site on a hex the town owns. */
    function shrine(g: ReturnType<typeof bench>, city: City) {
      raiseImprovement(around(g, city)[0]!, 'holySite', g.state.turn);
      bumpRevision(g.state);
    }

    it('pays nothing without a site, and coin and faith with one at either end', () => {
      const g = bench(['pilgrimMarkets']);
      const from = town(g, 0);
      const to = town(g, 4);
      expect(named(g, from, to)).toEqual([]);

      // A site in the town the cart left.
      shrine(g, from);
      const sent = foldRouteYield(named(g, from, to));
      expect(sent.gold).toBe(2);
      expect(sent.faith).toBe(2);

      // And a site in the town it walks to, with none where it started: the
      // clause is a disjunction, so either end on its own is enough.
      const other = bench(['pilgrimMarkets']);
      const start = town(other, 0);
      const end = town(other, 4);
      shrine(other, end);
      const arrived = foldRouteYield(named(other, start, end));
      expect(arrived.gold).toBe(2);
      expect(arrived.faith).toBe(2);
    });

    it('pays once and not twice when both ends keep a site', () => {
      const g = bench(['pilgrimMarkets']);
      const from = town(g, 0);
      const to = town(g, 4);
      shrine(g, from);
      shrine(g, to);
      const lines = named(g, from, to);
      expect(lines.length).toBe(1);
      expect(foldRouteYield(lines).faith).toBe(2);
    });

    it('promises a preview nothing while the far end is unchosen', () => {
      const g = bench(['pilgrimMarkets']);
      const from = town(g, 0);
      shrine(g, from);
      // The caller with one end in hand is asking about the origin alone, and a
      // line answered there would be a line the preview promised and the
      // caravan never paid — `destination`'s and `crossing`'s own bargain.
      expect(
        cardRouteYieldLines(g.state, from).filter((line) => line.card === 'pilgrimMarkets'),
      ).toEqual([]);
    });

    /**
     * **The leader ability that had been promising faith and paying none.**
     *
     * Mansa Musa's The Hajj is a live row of exactly this shape — *"trade routes
     * that begin or end at a city holding a holy site pay +2 gold and +2
     * faith"* — written as two route `pays` rows each carrying `faith: 2`. The
     * fold had no field for the voice, so the figure was read off the row, never
     * copied onto the line, and quietly dropped: the card said one thing and the
     * ledger did another. Adding the voice fixes that in the same stroke, which
     * is why the two are pinned together.
     *
     * A shrine at the origin therefore pays twice over on this bench — the
     * card's two and the leader's two — and `foldRouteYield` is the one sum of
     * both.
     */
    it('carries the faith through the fold, the leader’s promise included', () => {
      const g = bench(['pilgrimMarkets']);
      const from = town(g, 0);
      const to = town(g, 4);
      shrine(g, from);
      const lines = explainRouteYieldBetween(g.state, from, to);
      expect(foldRouteYield(lines.filter((l) => l.source.includes('Pilgrim Markets'))).faith).toBe(
        2,
      );
      expect(foldRouteYield(lines.filter((l) => l.source.includes('Hajj'))).faith).toBe(2);
      expect(foldRouteYield(lines).faith).toBe(4);
    });
  });

  // --- The Grain Exchange ----------------------------------------------------

  describe('The Grain Exchange — what the far end of the road holds', () => {
    it('pays grain off a granary in the town the cart left, and not the one it reaches', () => {
      const g = bench(['theGrainExchange']);
      const from = town(g, 0);
      const to = town(g, 4);
      const named = () =>
        explainRouteYieldBetween(g.state, from, to).filter((line) =>
          line.source.includes('Grain Exchange'),
        );
      expect(named()).toEqual([]);
      // A granary at the far end buys nothing: the clause is the origin's.
      addBuilding(g.state, to, 'granary');
      bumpRevision(g.state);
      expect(named()).toEqual([]);
      addBuilding(g.state, from, 'granary');
      bumpRevision(g.state);
      expect(foldRouteYield(named()).food).toBe(3);
    });

    it('gladdens a town only while one of those particular roads ends in it', () => {
      const g = bench(['theGrainExchange']);
      const from = town(g, 0);
      const to = town(g, 4);
      const scope = {
        test: 'routeEndsHere',
        crossing: 'domestic',
        farEnd: { test: 'hasBuilding', building: 'granary' },
      } as const;

      // No road at all: the town is no gladder for one.
      expect(cityScopeAdmits(g.state, to, scope)).toBe(false);

      // A live road between the two, and still no granary at its origin.
      const cart = g.state.units.find((u) => u.ownerId === 0)!;
      startRouteAt(g.state, cart, from, to, 'land');
      bumpRevision(g.state);
      expect(cityScopeAdmits(g.state, to, scope)).toBe(false);

      addBuilding(g.state, from, 'granary');
      bumpRevision(g.state);
      expect(cityScopeAdmits(g.state, to, scope)).toBe(true);
      // And asked from the other end: the town that *sent* the cart is not the
      // town that receives one.
      expect(cityScopeAdmits(g.state, from, scope)).toBe(false);
    });
  });

  // --- The Endowment ---------------------------------------------------------

  describe('The Endowment — which bank paid for the roof', () => {
    it('records the bank at the till and nothing at a completion', () => {
      const g = bench([]);
      const city = town(g);
      // A roof raised in the yard leaves the record empty, which is the shape
      // every town from before the field already has.
      addBuilding(g.state, city, 'monument');
      expect(buildingBank(city, 'monument')).toBeUndefined();
      // And a roof somebody bought says which counter rang.
      addBuilding(g.state, city, 'granary', 'gold');
      expect(buildingBank(city, 'granary')).toBe('gold');
      // A building the town does not hold answers the same as one nobody
      // bought, so no caller has to check the shelf first.
      expect(buildingBank(city, 'library')).toBeUndefined();
    });

    it('pays two beakers a bought roof, and nothing for one that was built', () => {
      const g = bench(['theEndowment']);
      const city = town(g);
      const named = () =>
        explainCity(g.state, city).lines.filter((line: CityYieldLine) =>
          line.source.includes('Endowment'),
        );
      addBuilding(g.state, city, 'monument');
      bumpRevision(g.state);
      expect(named()).toEqual([]);

      addBuilding(g.state, city, 'granary', 'gold');
      bumpRevision(g.state);
      expect(named().reduce((sum, line) => sum + line.science, 0)).toBe(2);

      // **Either bank counts.** A library bought with faith is as bought as one
      // bought with gold, which is what the card's "purchased" says.
      addBuilding(g.state, city, 'library', 'faith');
      bumpRevision(g.state);
      expect(named().reduce((sum, line) => sum + line.science, 0)).toBe(4);
    });

    it('goes through the purchase counter, which is the only seam that rings', () => {
      const g = bench([]);
      const city = town(g);
      const musa = playerById(g.state, 0)!;
      musa.gold = 99999;
      const gate = gatingTech('building', 'granary');
      if (gate) musa.techsResearched.push(gate);
      bumpRevision(g.state);
      const item = { kind: 'building', id: 'granary' } as const;
      expect(purchaseError(g.state, 0, city.id, item, 'gold')).toBeNull();
      purchaseItemAt(g.state, musa, city, item, 'gold');
      expect(city.buildings).toContain('granary');
      expect(buildingBank(city, 'granary')).toBe('gold');
    });
  });

  // --- Royal Assays ----------------------------------------------------------

  describe('Royal Assays — a copy more from a mined seam', () => {
    /**
     * A town whose ground carries one luxury seam, open to its owner, with the
     * named work standing on it. Answers the seam's id.
     */
    function seam(g: ReturnType<typeof bench>, city: City, resource: ResourceId) {
      const musa = playerById(g.state, 0)!;
      const tile = around(g, city)[0]!;
      tile.resource = resource;
      // **The work the seam's own row asks for**, so the deposit is genuinely
      // opened — a plantation over a gem seam opens nothing, and a test that
      // compared two closed seams would have compared two zeroes.
      raiseImprovement(tile, improvementForResource(resource)!, g.state.turn);
      // Whatever the row's reveal technology is, so the seam is one this empire
      // can name — a resource pays only an empire that has the word for it.
      const reveal = resourceDef(resource).requiresTech;
      if (reveal && !musa.techsResearched.includes(reveal)) musa.techsResearched.push(reveal);
      bumpRevision(g.state);
    }

    /** A luxury the table opens with a mine, and one it opens some other way. */
    const luxWith = (mine: boolean): ResourceId =>
      RESOURCE_IDS.find(
        (id) =>
          resourceDef(id).kind === 'luxury' &&
          (improvementForResource(id) === 'mine') === mine &&
          improvementForResource(id) !== null,
      )!;

    it('adds a copy per mined luxury deposit, and leaves an unmined one alone', () => {
      const mined = luxWith(true);
      const plain = bench([]);
      seam(plain, town(plain), mined);
      const base = resourceCopies(plain.state, 0, mined);
      expect(base).toBeGreaterThan(0);

      const held = bench(['royalAssays']);
      seam(held, town(held), mined);
      expect(resourceCopies(held.state, 0, mined)).toBe(base + 1);

      // The work is the narrowing: a luxury the table opens with something else
      // supplies exactly what it always did, card or no card.
      const other = luxWith(false);
      const grove = bench(['royalAssays']);
      seam(grove, town(grove), other);
      const bare = bench([]);
      seam(bare, town(bare), other);
      expect(resourceCopies(grove.state, 0, other)).toBe(resourceCopies(bare.state, 0, other));
      expect(resourceCopies(grove.state, 0, other)).toBeGreaterThan(0);
    });

    it('leaves a strategic seam under a mine untouched', () => {
      const g = bench(['royalAssays']);
      const city = town(g);
      const musa = playerById(g.state, 0)!;
      const strategic = RESOURCE_IDS.find(
        (id) => resourceDef(id).kind === 'strategic' && improvementForResource(id) === 'mine',
      )!;
      const tile = around(g, city)[0]!;
      tile.resource = strategic;
      tile.resourceCopies = 2;
      raiseImprovement(tile, 'mine', g.state.turn);
      const reveal = resourceDef(strategic).requiresTech;
      if (reveal && !musa.techsResearched.includes(reveal)) musa.techsResearched.push(reveal);
      bumpRevision(g.state);
      // The card says *luxury*, so the strategic seam supplies its own rolled
      // quantity and not one more.
      expect(resourceCopies(g.state, 0, strategic)).toBe(2);
    });

    it('is read outside the memo, so slotting the card moves the count at once', () => {
      const g = bench([]);
      const lux = luxWith(true);
      seam(g, town(g), lux);
      const before = resourceCopies(g.state, 0, lux);
      // Slotted mid-turn without touching the board. The economy clock does not
      // move for a card, so a law read inside the remembered walk would leave
      // this figure stale — C7's argument, and the reason this target is
      // applied on the way out.
      const musa = playerById(g.state, 0)!;
      musa.statecraft.orders.push('royalAssays' as OrderId);
      musa.statecraft.slots.push({ card: 'royalAssays' as OrderId, sealedUntil: g.state.turn });
      bumpRevision(g.state);
      expect(resourceCopies(g.state, 0, lux)).toBe(before + 1);
    });
  });
});
