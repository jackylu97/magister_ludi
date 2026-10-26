/**
 * **The Devotion deck, as entered** — `docs/decks/devotion.md` is the spec of
 * record, implemented by the deck batch of `docs/plans/deck-implementation.md`.
 *
 * What is pinned here:
 *
 *   · the shelf's shape: every live row folds under its own deck with the band
 *     and rarity the sheet's tier tables give it, the cut rows are retired and
 *     dealt by nobody, and the one deferred row says why in a player's words;
 *   · every live row's effects are kinds the vocabulary holds and print through
 *     the describers;
 *   · the age gate: no row of Tier 0 or Tier I names or reads a prophet, a
 *     Temple, an apostle, an inquisitor, a Cathedral, a holy site, a foreign
 *     town or a town that follows a religion;
 *   · the new mechanics the deck brought, each on a small board: the card-taught
 *     rites (The Fast's charter, The Votive Gifts, The Host Restored), the
 *     faith-purchase rules (Consecrated Labor, The Lay Brothers, The Pious
 *     Masons), the holy city scope, rival pressure, the reroll discount, the
 *     contribution rate, the counted rite goal and the condition before a
 *     religion is founded.
 *
 * Since Devotion batch DV1 (`docs/plans/devotion-themes-triage.md`), this file
 * also checks the sheet of record, `docs/decks/devotion.md`, against the data:
 * every status and type, the two counts tables, every listed row once, and the
 * shared table against `common.json`. The age gate follows the themes pass's
 * section 12, item 2: no Devotion card that waits on The High Temple or a
 * founded religion is dealt before Tier II.
 *
 * Core, not slow: it reads the tables and plays a handful of verbs on one town.
 */

import { describe, expect, it } from 'vitest';

import { type Game } from '../../../src/sim/game';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  playerById,
} from '../../../src/sim/state';
import { getTileAt } from '../../../src/sim/map';
import { explainGrowthPercent, foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { explainCity } from '../../../src/sim/yields/town';
import {
  cityRite,
  explainRerollCost,
  performRiteAt,
  riteCostFor,
  riteError,
  templeShare,
} from '../../../src/sim/religion';
import { explainContribution, purchaseError } from '../../../src/sim/purchase';
import { commissionFigure } from '../../../src/sim/commissions';
import {
  cardHappiness,
  describeCard,
  drawOrderOffer,
  eligibleFor,
  isHolyCityOf,
  settleDraft,
  stripRefs,
  tallyOf,
} from '../../../src/sim/statecraft';
import {
  type Band,
  type CardEffect,
  type CardEffectKind,
  type CardType,
  type DeckId,
  type OrderId,
  type OrderRarity,
  BANDS,
  DECK_FILE_ORDERS,
  DECK_WORDS,
  ORDER_IDS,
  isCardType,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { RULES } from '../../../src/sim/rulesData';
import type { BuildingId } from '../../../src/sim/buildingData';
import type { RiteId } from '../../../src/sim/religionData';
import { createGame } from '../newGameHelpers';

/** The deck's own ids, in file order — the shelf everything below is asked of. */
const DEVOTION: readonly OrderId[] = DECK_FILE_ORDERS.devotion;

const RETIRED = DEVOTION.filter((id) => orderDef(id).retired === true);
// The Holy Army, shared with Dominion, moved to the shared file in batch S.
// Batch DV1 moved six more: The Holy Spring, The Priest-Astronomers, The
// Monastic University, The Painted Chapels, The Festival Calendar and The
// Penitents' Roll.
const STANDING = DEVOTION.filter((id) => orderDef(id).retired !== true);
const LIVE = STANDING.filter((id) => orderIsDealt(id));
const DEFERRED = STANDING.filter((id) => !orderIsDealt(id));

/**
 * **The shapes this deck says**, both directions: a kind mistyped in the JSON
 * fails the assertion below, and a kind listed here that no row says fails it
 * too.
 */
const KINDS_USED = [
  'pays',
  'percentYields',
  'productionBonus',
  'combatLine',
  'conditionRule',
  'happiness',
  'unitStat',
  'rulePercent',
  'pantheonSlots',
  'rule',
  'effectAmplifier',
  'grantsAbility',
  'pressureRule',
  'cardYieldAmplifier',
  'cityStat',
  // Batch DV2: The Consecration Feast and The Holy Summons.
  'windfallRider',
] as const satisfies readonly CardEffectKind[];

const RARITIES: readonly OrderRarity[] = ['common', 'uncommon', 'rare'];

/** Every effect a row says, the ones inside a gate included. */
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

/** A town for seat 0 on the tile its first unit stands on. */
function town(g: Game): { seat: Player; city: City } {
  const seat = playerById(g.state, 0)!;
  const unit = g.state.units.find((u) => u.ownerId === 0)!;
  const city = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!);
  bumpRevision(g.state);
  return { seat, city };
}

/** Seats these cards for seat 0, every one in a chair of its own. */
function seat(state: GameState, ids: readonly OrderId[]): void {
  const player = playerById(state, 0)!;
  player.statecraft.orders = [...ids];
  player.statecraft.slots = ids.map((card) => ({ card, sealedUntil: 0 }));
  bumpRevision(state);
}

/** Gives the town buildings straight off the shelf. */
function raise(state: GameState, city: City, ids: readonly string[]): void {
  for (const id of ids) if (!city.buildings.includes(id as BuildingId)) city.buildings.push(id as BuildingId);
  bumpRevision(state);
  refreshCityDerived(state, city);
}

/**
 * A religion founded by seat 0 whose holy site is the town's own centre, with
 * every citizen of the town following it.
 */
function holyCity(state: GameState, city: City): number {
  const tile = getTileAt(state.map, city.col, city.row)!;
  tile.improvement = 'holySite' as never;
  state.religions.push({
    id: state.religions.length,
    founderId: 0,
    name: 'The Testament',
    pantheon: [],
    follower: [],
    enhancer: [],
    foundedTurn: state.turn,
    holySite: { col: city.col, row: city.row },
  } as never);
  const religion = state.religions.length - 1;
  city.followers = { [religion]: city.population };
  bumpRevision(state);
  return religion;
}

function linesOf(state: GameState, city: City, card: string) {
  return explainCity(state, city).lines.filter((line) => line.card === card);
}

// --- the shelf ---------------------------------------------------------------

describe('the Devotion deck folds', () => {
  it('carries 78 rows: 48 live, 1 deferred and 29 retired', () => {
    // Batch DV1: 77 rows before, less the six that moved to common.json. Four
    // rows retired, three live and one deferred. Batch DV2 added seven live
    // rows.
    expect(DEVOTION).toHaveLength(78);
    expect(LIVE).toHaveLength(48);
    expect(DEFERRED).toHaveLength(1);
    expect(RETIRED).toHaveLength(29);
  });

  it('spreads its 49 standing rows across Tiers 0 to IV as 6, 6, 15, 9 and 13', () => {
    // Batch DV1 moved The Second Prophet, The Living Hymnal and The Mission
    // from Tier I to Tier II, and The Conversion of Kings and The Pious Masons
    // from Tier IV to Tier III. Batch DV2 added three rows at Tier II, three
    // at Tier III and one at Tier IV.
    expect(STANDING).toHaveLength(49);
    const perBand = BANDS.map((band) => STANDING.filter((id) => orderDef(id).band === band).length);
    expect(perBand).toEqual([6, 6, 15, 9, 13]);
  });

  it('names its own deck on every row, with a band and a rarity', () => {
    for (const id of DEVOTION) {
      const def = orderDef(id);
      expect(def.decks, id).toEqual(['devotion']);
      expect(BANDS, id).toContain(def.band as Band);
      expect(RARITIES, id).toContain(def.rarity);
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
  });

  it('is reached by a Devotion seat and by nobody else’s deck', () => {
    const mine = ordersForDecks(['devotion']);
    for (const id of LIVE) expect(mine, id).toContain(id);
    const theirs = ordersForDecks(['dominion', 'expansionist', 'commerce', 'scientific', 'magisterial']);
    for (const id of DEVOTION) expect(theirs, id).not.toContain(id);
  });

  it('retires the sheet’s cuts and deals them to nobody', () => {
    // 25 cut on 2026-10-06 and 2026-10-12, and the four of batch DV1.
    expect(RETIRED).toHaveLength(29);
    for (const id of ['pastoralShrines', 'theConsolation', 'theAlmsRoads', 'consecratedGround']) {
      expect(RETIRED, id).toContain(id);
    }
    for (const id of RETIRED) expect(orderIsDealt(id), id).toBe(false);
  });
});

describe('the live rows', () => {
  it('say only shapes the vocabulary holds', () => {
    const used = new Set<string>();
    for (const id of LIVE) {
      const def = orderDef(id);
      const dealtFor = def.effects.length > 0 || def.commission !== undefined || def.charter !== undefined;
      expect(dealtFor, `${id} is dealt and pays nothing`).toBe(true);
      for (const effect of effectsOf(id)) {
        expect(KINDS_USED as readonly string[], `${id}: ${effect.kind}`).toContain(effect.kind);
        used.add(effect.kind);
      }
    }
    for (const kind of KINDS_USED) expect([...used], kind).toContain(kind);
  });

  it('print through the describers, with no keyword mark left raw', () => {
    for (const id of LIVE) {
      const clauses = describeCard(id);
      expect(clauses.length, `${id} describes to nothing`).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.deferred, `${id}: a live row carries a deferred clause`).not.toBe(true);
        const text = stripRefs(clause.text);
        expect(text.trim(), id).not.toBe('');
        expect(text, `${id} leaves a keyword mark raw`).not.toContain('[[');
      }
    }
  });

  it('includes the four commissions and the one charter', () => {
    const commissions = LIVE.filter((id) => orderDef(id).commission !== undefined);
    expect(commissions.sort()).toEqual(
      ['theConversionOfKings', 'theFoundingVows', 'theGreatCommission', 'theMission'].sort(),
    );
    expect(LIVE.filter((id) => orderDef(id).charter !== undefined)).toEqual(['theFast']);
  });
});

describe('the deferred rows', () => {
  it('are The Interdict alone, saying why', () => {
    // Consecrated Ground retired in batch DV1.
    expect([...DEFERRED].sort()).toEqual(['theInterdict']);
    for (const id of DEFERRED) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.note, `${id} defers without saying why`).toBeTruthy();
      expect(def.deferred?.length, id).toBeGreaterThan(0);
      for (const sentence of def.deferred!) {
        expect(sentence, id).not.toMatch(/[a-z][A-Z]/);
        expect(sentence, id).not.toMatch(/\d/);
      }
    }
  });
});

describe('a Devotion draft', () => {
  it('deals Akhenaten live rows of his own decks and nothing else', () => {
    const g = akhenaten();
    const player = playerById(g.state, 0)!;
    expect(player.decks).toEqual(['devotion', 'magisterial']);
    const bag = eligibleFor(g.state, player);
    expect(bag.length).toBeGreaterThan(0);
    for (const id of bag) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      if (def.decks.length > 0) expect(def.decks.some((deck) => player.decks.includes(deck)), id).toBe(true);
      expect(def.band, id).toBe(0);
    }
    player.culturePool = 10_000;
    const offer = drawOrderOffer(g.state, player);
    for (const option of offer.options) expect(bag, option).toContain(option);
    expect(settleDraft(g.state, player)).not.toBeNull();
  });
});

describe('the age gate', () => {
  // The themes pass's section 12, item 2 (the triage's reading 1): no
  // Devotion card that waits on The High Temple or a founded religion is
  // dealt before Tier II. Shared rows are left out: their partner passes kept
  // The Sacred Host, Cloister Schools, The Oriflamme, The Monastery Libraries
  // and The Schoolmen's Charter at Tier I.
  const WORDS =
    /\b(prophets?|temples?|apostles?|inquisitors?|cathedrals?|holy sites?|foreign|follows?|following|followers?)\b/i;
  const READS = /temple|cathedral|prophet|apostle|inquisitor|holySite|follow|ownersFaith|foreign/i;

  it('keeps every row of Tiers 0 and I off the clergy, the Temple, the holy site and the following town', () => {
    const early = STANDING.filter((row) => orderDef(row).band <= 1);
    expect(early).toHaveLength(12);
    for (const id of early) {
      const def = orderDef(id);
      expect(def.text ?? '', `${id}: ${def.text}`).not.toMatch(WORDS);
      const reads = JSON.stringify({ effects: def.effects, commission: def.commission, charter: def.charter });
      expect(reads, id).not.toMatch(READS);
    }
  });

  it('deals the three religion cards that moved from Tier I at Tier II', () => {
    for (const id of ['theLivingHymnal', 'theMission', 'theSecondProphet']) {
      expect(orderDef(id as OrderId).band, id).toBe(2);
    }
  });
});

// --- the mechanics -----------------------------------------------------------

describe('the card-taught rites', () => {
  it('The Votive Gifts teaches an offering that turns the rite’s faith into the current build', () => {
    const g = akhenaten();
    const { seat: player, city } = town(g);
    const rite = 'votiveOffering' as RiteId;
    player.faithPool = 500;
    city.queue = [{ kind: 'building', id: 'granary' as BuildingId }];
    city.hammerBasket = 0;
    expect(riteError(g.state, 0, city.id, rite)).toMatch(/not known/);
    seat(g.state, ['theVotiveGifts' as OrderId]);
    expect(riteError(g.state, 0, city.id, rite)).toBeNull();
    const cost = riteCostFor(g.state, 0);
    performRiteAt(g.state, player, city, rite);
    expect(player.faithPool).toBe(500 - cost);
    // The granary may have finished; either way the hammers went somewhere.
    const hammers = Math.floor(cost / RULES.production.faithPerHammer);
    expect(city.hammerBasket > 0 || city.buildings.includes('granary' as BuildingId)).toBe(true);
    expect(hammers).toBeGreaterThan(0);
    // Once a turn: the town is keeping it now.
    expect(cityRite(g.state, city)).toBe(rite);
    expect(riteError(g.state, 0, city.id, rite)).toMatch(/already keeping/);
  });

  it('refuses the offering toward a wonder', () => {
    const g = akhenaten();
    const { seat: player, city } = town(g);
    seat(g.state, ['theVotiveGifts' as OrderId]);
    player.faithPool = 500;
    city.queue = [{ kind: 'building', id: 'pyramids' as BuildingId }];
    expect(riteError(g.state, 0, city.id, 'votiveOffering' as RiteId)).toMatch(/wonder/);
  });

  it('The Fast’s charter opens a rite that stops growth and pays science and culture for every citizen', () => {
    // Batch R1 (the user, 2026-10-25: "gain science and culture instead of
    // faith"): each equal to the town's population, and no faith.
    const g = akhenaten();
    const { seat: player, city } = town(g);
    player.charteredRites.push('riteOfFasting' as RiteId);
    player.faithPool = 500;
    city.population = 4;
    expect(riteError(g.state, 0, city.id, 'riteOfFasting' as RiteId)).toBeNull();
    performRiteAt(g.state, player, city, 'riteOfFasting' as RiteId);
    expect(explainGrowthPercent(g.state, city).some((line) => line.percent === -100)).toBe(true);
    const lines = linesOf(g.state, city, 'riteOfFasting');
    expect(lines.reduce((sum, line) => sum + line.science, 0)).toBe(4);
    expect(lines.reduce((sum, line) => sum + line.culture, 0)).toBe(4);
    expect(lines.reduce((sum, line) => sum + line.faith, 0)).toBe(0);
  });

  it('The Rites Commonwealth costs nothing in a city without a rite', () => {
    // Batch R1 (the user, 2026-10-25: "remove malice"): the −1 happiness in
    // every city without a rite is gone, and the discount on demand stays.
    const g = akhenaten();
    town(g);
    seat(g.state, ['theRitesCommonwealth' as OrderId]);
    expect(cardHappiness(g.state, 0)).toEqual([]);
    expect(describeCard('theRitesCommonwealth' as OrderId).map((clause) => stripRefs(clause.text))).toEqual([
      '-25% happiness demanded per citizen, in every city while it is keeping a rite',
    ]);
  });

  it('The Host Restored heals the units standing in land that follows the faith, and no others', () => {
    const g = akhenaten();
    const { seat: player, city } = town(g);
    holyCity(g.state, city);
    seat(g.state, ['theHostRestored' as OrderId]);
    player.faithPool = 500;
    const home = g.state.units.find((u) => u.ownerId === 0 && u.col === city.col && u.row === city.row);
    const away = g.state.units.find((u) => u.ownerId === 0 && (u.col !== city.col || u.row !== city.row));
    expect(home).toBeDefined();
    home!.hp = 10;
    if (away) {
      away.col = (city.col + 12) % g.state.map.width;
      away.hp = 10;
    }
    expect(riteError(g.state, 0, city.id, 'restoringOfTheHost' as RiteId)).toBeNull();
    performRiteAt(g.state, player, city, 'restoringOfTheHost' as RiteId);
    expect(home!.hp).toBeGreaterThan(10);
    if (away) expect(away.hp).toBe(10);
  });
});

describe('faith purchases', () => {
  it('The Lay Brothers opens ordinary buildings to faith in Temple towns only', () => {
    const g = akhenaten();
    const { seat: player, city } = town(g);
    player.faithPool = 5000;
    city.queue = [];
    const granary = { kind: 'building', id: 'granary' };
    // The tree's gate on the granary is not this card's business.
    player.techsResearched.push(...(['earthenware', 'agriculture'] as never[]));
    seat(g.state, ['theLayBrothers' as OrderId]);
    expect(purchaseError(g.state, 0, city.id, granary, 'faith')).toMatch(/gold, not faith/);
    raise(g.state, city, ['shrine', 'temple']);
    expect(purchaseError(g.state, 0, city.id, granary, 'faith')).toBeNull();
  });

  it('Consecrated Labor sells workers for faith in Shrine towns', () => {
    const g = akhenaten();
    const { seat: player, city } = town(g);
    player.faithPool = 5000;
    for (const unit of g.state.units) if (unit.col === city.col && unit.row === city.row) unit.col += 1;
    const worker = { kind: 'unit', id: 'worker' };
    seat(g.state, ['consecratedLabor' as OrderId]);
    expect(purchaseError(g.state, 0, city.id, worker, 'faith')).toMatch(/gold, not faith/);
    raise(g.state, city, ['shrine']);
    expect(purchaseError(g.state, 0, city.id, worker, 'faith')).toBeNull();
  });

  it('The Pious Masons sells a half-built wonder for faith in a Cathedral town', () => {
    const g = akhenaten();
    const { seat: player, city } = town(g);
    player.faithPool = 1_000_000;
    seat(g.state, ['thePiousMasons' as OrderId]);
    raise(g.state, city, ['cathedral']);
    const wonder = 'pyramids' as BuildingId;
    city.queue = [{ kind: 'building', id: wonder }];
    city.hammerBasket = 0;
    const item = { kind: 'building', id: wonder };
    expect(purchaseError(g.state, 0, city.id, item, 'faith')).toMatch(/wonder/);
    city.hammerBasket = 100_000;
    // Half built and more: the faith bank is open (any other refusal is the
    // tree's, which is not this card's business).
    expect(purchaseError(g.state, 0, city.id, item, 'faith') ?? '').not.toMatch(/must be built, not bought/);
  });
});

describe('the religion readings', () => {
  it('finds the holy city by its holy site', () => {
    const g = akhenaten();
    const { city } = town(g);
    expect(isHolyCityOf(g.state, city, 0)).toBe(false);
    holyCity(g.state, city);
    expect(isHolyCityOf(g.state, city, 0)).toBe(true);
  });

  it('The Calling pays faith until a religion is founded, and stops after', () => {
    const g = akhenaten();
    const { city } = town(g);
    raise(g.state, city, ['shrine']);
    seat(g.state, ['theCalling' as OrderId]);
    const calling = () =>
      explainCity(g.state, city).percents.filter((line) => line.card === 'theCalling').length;
    expect(calling()).toBeGreaterThan(0);
    holyCity(g.state, city);
    expect(calling()).toBe(0);
  });

  it('The Holy Inquisition turns back a rival religion and lets your own through', () => {
    const g = akhenaten();
    const { city } = town(g);
    const mine = holyCity(g.state, city);
    g.state.religions.push({ ...g.state.religions[mine]!, id: mine + 1, founderId: 1, holySite: undefined } as never);
    const rival = g.state.religions[mine + 1]!;
    expect(templeShare(g.state, city, rival, 100)).toBe(100);
    seat(g.state, ['theHolyInquisition' as OrderId]);
    expect(templeShare(g.state, city, rival, 100)).toBe(60);
    expect(templeShare(g.state, city, g.state.religions[mine]!, 100)).toBe(100);
  });

  it('The Last Offering eases the faith rate on the Magnum Opus in the holy city', () => {
    const g = akhenaten();
    const { seat: player, city } = town(g);
    holyCity(g.state, city);
    player.faithPool = 1000;
    city.queue = [{ kind: 'building', id: 'theMagnumOpus' as BuildingId }];
    city.hammerBasket = 0;
    const before = explainContribution(g.state, 0, city.id, 'faith');
    expect(before).not.toBeNull();
    seat(g.state, ['theLastOffering' as OrderId]);
    const after = explainContribution(g.state, 0, city.id, 'faith')!;
    expect(after.rate).toBeLessThan(before!.rate);
    expect(after.hammers).toBeGreaterThan(before!.hammers);
  });

  it('The Penitents’ Roll takes a share off the faith price of a reroll', () => {
    // Shared with Magisterial since batch DV1, under its old id.
    const g = akhenaten();
    town(g);
    const plain = explainRerollCost(g.state, 0, 'order', 'faith').total;
    seat(g.state, ['thePenitentsRoll' as OrderId]);
    const eased = explainRerollCost(g.state, 0, 'order', 'faith').total;
    expect(eased).toBe(Math.floor((plain * 70) / 100));
  });

  it('reads the two new commission figures as nought before any religion', () => {
    const g = akhenaten();
    town(g);
    expect(commissionFigure(g.state, 0, 'followingCityShare')).toBe(0);
    expect(commissionFigure(g.state, 0, 'rivalCapitalsFollowing')).toBe(0);
  });
});

describe('the counted rite goal', () => {
  it('The Founding Vows counts rites started while it is seated', () => {
    const g = akhenaten();
    const { seat: player, city } = town(g);
    player.charteredRites.push('riteOfFasting' as RiteId);
    player.faithPool = 5000;
    seat(g.state, ['theFoundingVows' as OrderId]);
    performRiteAt(g.state, player, city, 'riteOfFasting' as RiteId);
    city.timed = [];
    performRiteAt(g.state, player, city, 'riteOfFasting' as RiteId);
    expect(tallyOf(player.statecraft, 'theFoundingVows' as OrderId)).toBe(2);
  });
});

// --- the sheet of record (batch DV1) ------------------------------------------

/**
 * **The deck sheet**, `docs/decks/devotion.md`, the spec of record since batch
 * DV1 (`docs/plans/devotion-themes-triage.md`). It is in the sorted format of
 * the Commerce sheet: five tier tables (Card | Rarity | Status | Ability |
 * Type) and a shared table (Card | Rarity | Also in | Tier | Status | Ability
 * | Type). The empty Doctrine tables have three columns, so the reader below
 * skips them.
 */
const sheetFiles = import.meta.glob('../../../docs/decks/devotion.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const SHEET = Object.values(sheetFiles)[0] as string;

/** The sheet's tier headings, which are the bands. */
const TIERS: Record<string, Band> = { '0': 0, I: 1, II: 2, III: 3, IV: 4 };

/** How a sheet row relates to the data: the first word of its Status cell. */
type SheetStatus = 'implemented' | 'modify' | 'add';
const SHEET_STATUSES: readonly SheetStatus[] = ['implemented', 'modify', 'add'];

/** The words a `modify` row may give after the colon: the sheet's own list. */
const REASONS = ['deferred', 'revised', 'reworked', 'moved', 'shared', 'as built'] as const;
type Reason = (typeof REASONS)[number];

/** One card the sheet lists, in a tier table or the shared table. */
interface SheetCard {
  /** The name the sheet prints, without the bold and the "(was …)" note. */
  name: string;
  /** The name in the "(was …)" note, when the sheet gives one. */
  was?: string;
  rarity: string;
  band: Band;
  status: SheetStatus;
  /** The words after the colon in the Status cell. */
  reasons: Reason[];
  text: string;
  /** The Type cell, lowercased. */
  type: CardType;
}

/** One card of the shared table. Its row lives in `data/decks/common.json`. */
interface SharedCard extends SheetCard {
  /** The other deck that may draw it, from the "Also in" cell. */
  alsoIn: DeckId;
}

/** The Type cell read as a type. A row without one fails here, by name. */
function typeOf(card: string, cell: string | undefined): CardType {
  const type = (cell ?? '').toLowerCase();
  expect(isCardType(type), `"${card}" has no type the game knows ("${cell ?? ''}")`).toBe(true);
  return type as CardType;
}

/** A table row's cells, or `null` for a header, a rule or a line that is not a row. */
function cellsOf(line: string): string[] | null {
  if (!line.startsWith('|')) return null;
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  if (cells[0] === 'Card' || cells.every((cell) => /^-+$/.test(cell))) return null;
  return cells;
}

/** A Card cell read into the printed name and the "(was …)" name, if any. */
function namesOf(cell: string): { name: string; was?: string } {
  const plain = cell.replace(/\*\*/g, '').trim();
  const match = /^(.*?)\s*\(was (.+)\)$/.exec(plain);
  if (match === null) return { name: plain };
  return { name: match[1]!.trim(), was: match[2]!.trim() };
}

/** A Status cell read into its first word and the reasons after the colon. */
function statusOf(card: string, cell: string): { status: SheetStatus; reasons: Reason[] } {
  const colon = cell.indexOf(':');
  const head = (colon < 0 ? cell : cell.slice(0, colon)).trim();
  expect(SHEET_STATUSES, `"${card}" has an unknown status "${cell}"`).toContain(head);
  const reasons = colon < 0 ? [] : cell.slice(colon + 1).split(';').map((word) => word.trim());
  for (const reason of reasons) {
    expect(REASONS, `"${card}" gives an unknown reason "${reason}"`).toContain(reason);
  }
  if (head === 'modify') expect(reasons.length, `"${card}" says modify and gives no reason`).toBeGreaterThan(0);
  else expect(reasons, `"${card}" gives a reason with "${head}"`).toEqual([]);
  return { status: head as SheetStatus, reasons: reasons as Reason[] };
}

/** The five tier tables, from the first tier heading to the first other level-two heading. */
function sheetCards(): SheetCard[] {
  const start = SHEET.indexOf('\n## Tier 0');
  expect(start, 'the sheet has a Tier 0 table').toBeGreaterThanOrEqual(0);
  const cards: SheetCard[] = [];
  let band: Band | null = null;
  for (const line of SHEET.slice(start + 1).split('\n')) {
    const heading = /^## Tier (0|I|II|III|IV)$/.exec(line);
    if (heading) {
      band = TIERS[heading[1]!]!;
      continue;
    }
    if (line.startsWith('## ')) break;
    const cells = cellsOf(line);
    if (cells === null || band === null || cells.length < 5) continue;
    cards.push({
      ...namesOf(cells[0]!),
      rarity: cells[1]!,
      band,
      ...statusOf(cells[0]!, cells[2]!),
      text: cells[3]!,
      type: typeOf(cells[0]!, cells[4]),
    });
  }
  return cards;
}

/** The shared table ("Shared with another deck"), to the next level-two heading. */
function sharedCards(): SharedCard[] {
  const start = SHEET.indexOf('\n## Shared with another deck');
  expect(start, 'the sheet has a shared table').toBeGreaterThanOrEqual(0);
  const deckByWord = new Map(
    (Object.entries(DECK_WORDS) as [DeckId, string][]).map(([deck, word]) => [word, deck] as const),
  );
  const cards: SharedCard[] = [];
  for (const line of SHEET.slice(start + 1).split('\n').slice(1)) {
    if (line.startsWith('## ')) break;
    const cells = cellsOf(line);
    if (cells === null || cells.length < 7) continue;
    const alsoIn = deckByWord.get(cells[2]!);
    expect(alsoIn, `"${cells[0]}" is shared with an unknown deck "${cells[2]}"`).toBeDefined();
    expect(alsoIn, `"${cells[0]}" is shared with Devotion itself`).not.toBe('devotion');
    expect(Object.keys(TIERS), `"${cells[0]}" has an unknown tier "${cells[3]}"`).toContain(cells[3]);
    cards.push({
      ...namesOf(cells[0]!),
      rarity: cells[1]!,
      alsoIn: alsoIn!,
      band: TIERS[cells[3]!]!,
      ...statusOf(cells[0]!, cells[4]!),
      text: cells[5]!,
      type: typeOf(cells[0]!, cells[6]),
    });
  }
  return cards;
}

/** A counts table, found by its header row: each body row's first cell against its numbers. */
function countsTable(header: string): Map<string, number[]> {
  const start = SHEET.indexOf(header);
  expect(start, `the sheet has the table "${header}"`).toBeGreaterThanOrEqual(0);
  const rows = new Map<string, number[]>();
  for (const line of SHEET.slice(start).split('\n').slice(2)) {
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.replace(/\*\*/g, '').trim());
    rows.set(cells[0]!, cells.slice(1).filter((cell) => /^\d+$/.test(cell)).map(Number));
  }
  return rows;
}

/** The name of the data row a sheet row stands for: the "(was …)" name if given. */
const dataNameOf = (card: { name: string; was?: string }): string => card.was ?? card.name;

/**
 * A charter, read off the sheet's own words: every charter's text ends with
 * "No chair required." A row with data must agree with its `charter` field,
 * which `checkAgainstRow` asks. An `add` row has only its words.
 */
const isCharterText = (text: string): boolean => text.endsWith('No chair required.');

/** The rows the sheet's tier tables must list: every row of this file that is not retired. */
const LISTED: readonly OrderId[] = STANDING;

/** Every name in the registry: a card still to be added may reuse none of them. */
const TAKEN = new Set(ORDER_IDS.map((id) => orderDef(id).name));

/**
 * The checks every sheet row with a data row shares, in either table: the
 * type, the rarity, the charter, and what the status and its reasons claim.
 * Each reason the data can answer must be true both ways.
 */
function checkAgainstRow(card: SheetCard, id: OrderId): void {
  const def = orderDef(id);
  expect(def.type, `${card.name}: the sheet's type`).toBe(card.type);
  // The sheet has no `rarity` reason: every row keeps its rarity.
  expect(def.rarity, `${card.name}: the sheet's rarity`).toBe(card.rarity);
  expect(def.charter !== undefined, `${card.name}: a charter on one side only`).toBe(isCharterText(card.text));
  const dealt = orderIsDealt(id);
  const sameText = def.text === card.text;
  if (card.status === 'implemented') {
    expect(card.was, `${card.name} is implemented and renamed`).toBeUndefined();
    expect(dealt, `${card.name} is marked implemented but is not dealt`).toBe(true);
    expect(def.band, `${card.name}: the sheet's tier`).toBe(card.band);
    expect(def.text, `${card.name}: the sheet's ability`).toBe(card.text);
    return;
  }
  const has = (reason: Reason): boolean => card.reasons.includes(reason);
  expect(has('deferred'), `${card.name}: deferred on one side only`).toBe(!dealt);
  expect(has('moved'), `${card.name}: a different tier on one side only`).toBe(def.band !== card.band);
  expect(has('revised') || has('reworked'), `${card.name}: different words on one side only`).toBe(
    !sameText,
  );
  if (has('as built')) {
    // The game does something slightly different, and the words are the same.
    expect(dealt, `${card.name} plays as built but is not dealt`).toBe(true);
    expect(sameText, `${card.name} plays as built, so its words are the data's`).toBe(true);
    return;
  }
  // A dealt row that matches the sheet in every way is implemented.
  const same = card.was === undefined && sameText && def.band === card.band;
  expect(dealt && same, `${card.name} matches its row and should say implemented`).toBe(false);
}

describe('the Devotion deck: the sheet of record', () => {
  it('mirrors the five tier tables, card for card', () => {
    const sheet = sheetCards();
    const shared = sharedCards();
    expect(sheet.length, 'the sheet lists cards under every tier heading').toBeGreaterThan(0);
    const byName = new Map(LISTED.map((id) => [orderDef(id).name, id] as const));
    for (const card of sheet) {
      if (card.status === 'add') {
        expect(TAKEN.has(card.name), `"${card.name}" is marked add but the data has it`).toBe(false);
        continue;
      }
      const id = byName.get(dataNameOf(card));
      expect(id, `the deck file has no row for "${dataNameOf(card)}"`).toBeDefined();
      expect(card.reasons, `${card.name} is in a tier table and marked shared`).not.toContain('shared');
      checkAgainstRow(card, id!);
    }
    // Every row that is not retired is on the sheet once.
    const listed = sheet.filter((card) => card.status !== 'add').map(dataNameOf);
    expect(new Set(listed).size, 'a data row is listed twice').toBe(listed.length);
    for (const name of byName.keys()) {
      expect(listed.includes(name), `"${name}" is a row the sheet does not list`).toBe(true);
    }
    expect(listed.length).toBe(LISTED.length);
    // And the sheet prints no name twice, the shared table's included.
    const printed = [...sheet, ...shared].map((card) => card.name);
    expect(new Set(printed).size, 'the sheet prints a name twice').toBe(printed.length);
  });

  it('mirrors the shared table onto its rows in common.json', () => {
    const shared = sharedCards();
    expect(shared.length, 'the shared table lists cards').toBeGreaterThan(0);
    const common = new Map(
      DECK_FILE_ORDERS.common
        .filter((id) => orderDef(id).retired !== true)
        .map((id) => [orderDef(id).name, id] as const),
    );
    let checked = 0;
    for (const card of shared) {
      const name = dataNameOf(card);
      if (card.status === 'add') {
        expect(TAKEN.has(card.name), `"${card.name}" is marked add but the data has it`).toBe(false);
        continue;
      }
      const id = common.get(name);
      expect(id, `common.json has no row for "${name}"`).toBeDefined();
      // The row is the one the sheet means: shared by Devotion and the deck named.
      expect(orderDef(id!).decks, name).toContain('devotion');
      expect(orderDef(id!).decks, name).toContain(card.alsoIn);
      checkAgainstRow(card, id!);
      checked += 1;
    }
    expect(checked, 'every shared row in the data was checked').toBe(
      shared.filter((card) => card.status !== 'add').length,
    );
    expect(checked).toBeGreaterThan(0);
  });

  it('lists every shared row that names Devotion', () => {
    const names = new Set(sharedCards().map(dataNameOf));
    for (const id of DECK_FILE_ORDERS.common) {
      const def = orderDef(id);
      if (def.retired === true || !def.decks.includes('devotion')) continue;
      expect(names.has(def.name), `"${def.name}" names Devotion and is not on the shared table`).toBe(true);
    }
  });

  it('keeps every retired row off the tables, with no type', () => {
    const listed = new Set(
      [...sheetCards(), ...sharedCards()].flatMap((card) => [card.name, dataNameOf(card)]),
    );
    const retiredShared = DECK_FILE_ORDERS.common.filter(
      (id) => orderDef(id).retired === true && orderDef(id).decks.includes('devotion'),
    );
    for (const id of [...RETIRED, ...retiredShared]) {
      expect(listed.has(orderDef(id).name), `${id} is retired and still on the sheet`).toBe(false);
      expect(orderDef(id).type, `${id} is retired and carries a type`).toBeUndefined();
      expect(orderIsDealt(id), `${id} is retired and still dealt`).toBe(false);
    }
  });

  it('counts its rows in the two counts tables, the charters included', () => {
    const sheet = sheetCards();
    const shared = sharedCards();
    const status = countsTable('| Tier | Implemented | Modify | Add | All | Charters |');
    const types = countsTable('| Tier | Military | Economic | Civic | Wildcard |');
    const byStatus = (cards: readonly SheetCard[]): number[] => [
      ...SHEET_STATUSES.map((s) => cards.filter((card) => card.status === s).length),
      cards.length,
      cards.filter((card) => isCharterText(card.text)).length,
    ];
    const byType = (cards: readonly SheetCard[]): number[] =>
      (['military', 'economic', 'civic', 'wildcard'] as const).map(
        (t) => cards.filter((card) => card.type === t).length,
      );
    for (const word of Object.keys(TIERS)) {
      const cards = sheet.filter((card) => card.band === TIERS[word]);
      expect(status.get(`Tier ${word}`), `Tier ${word}'s status counts`).toEqual(byStatus(cards));
      expect(types.get(`Tier ${word}`), `Tier ${word}'s type counts`).toEqual(byType(cards));
    }
    expect(status.get('All'), 'the status totals').toEqual(byStatus(sheet));
    expect(types.get('All'), 'the type totals').toEqual(byType(sheet));
    expect(status.get('Shared'), 'the shared status counts').toEqual(byStatus(shared));
    expect(types.get('Shared'), 'the shared type counts').toEqual(byType(shared));
    // Batch DV1's sheet: 66 cards with the two charters (64 take a chair),
    // and 29 shared cards with one charter.
    expect(sheet).toHaveLength(66);
    expect(sheet.filter((card) => isCharterText(card.text))).toHaveLength(2);
    expect(shared).toHaveLength(29);
  });

  it('types every listed row, 49 of this file and 28 shared, and nothing else of this file', () => {
    expect(LISTED).toHaveLength(49);
    for (const id of DEVOTION) {
      const def = orderDef(id);
      if (def.retired === true) expect(def.type, id).toBeUndefined();
      else expect(isCardType(def.type ?? ''), `${id} is listed and has no type`).toBe(true);
    }
    const sharedRows = DECK_FILE_ORDERS.common.filter((id) => {
      const def = orderDef(id);
      return def.retired !== true && def.decks.includes('devotion');
    });
    // 18 before batch DV1, and the seven rows it moved here. Batch DV2 added
    // The Shrine Guards, The Blessed Forges and The Schoolmen's Charter. The
    // Rising Nave, the one row marked add on the shared table, has no data
    // row yet.
    expect(sharedRows).toHaveLength(28);
    for (const id of sharedRows) expect(isCardType(orderDef(id).type ?? ''), id).toBe(true);
  });
});
