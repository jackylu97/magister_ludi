/**
 * **The Devotion deck, as entered** — `docs/decks/devotion.md` is the spec of
 * record, implemented by the deck batch of `docs/plans/deck-implementation.md`.
 *
 * What is pinned here:
 *
 *   · the shelf's shape: every live row folds under its own deck with the band
 *     and rarity the sheet's tier tables give it, the cut rows are retired and
 *     dealt by nobody, and the two deferred rows say why in a player's words;
 *   · every live row's effects are kinds the vocabulary holds and print through
 *     the describers;
 *   · the first age: a band-0 row names no prophet, Temple or foreign city;
 *   · the new mechanics the deck brought, each on a small board: the card-taught
 *     rites (The Fast's charter, The Votive Gifts, The Host Restored), the
 *     faith-purchase rules (Consecrated Labor, The Lay Brothers, The Pious
 *     Masons), the holy city scope, rival pressure, the reroll discount, the
 *     contribution rate, the counted rite goal and the condition before a
 *     religion is founded.
 *
 * Core, not slow: it reads the tables and plays a handful of verbs on one town.
 */

import { describe, expect, it } from 'vitest';

import { type Game, createGame } from '../../../src/sim/game';
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
  type OrderId,
  type OrderRarity,
  BANDS,
  DECK_FILE_ORDERS,
  ORDER_IDS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { RULES } from '../../../src/sim/rulesData';
import type { BuildingId } from '../../../src/sim/buildingData';
import type { RiteId } from '../../../src/sim/religionData';

/** The deck's own ids, in file order — the shelf everything below is asked of. */
const DEVOTION: readonly OrderId[] = DECK_FILE_ORDERS.devotion;

const RETIRED = DEVOTION.filter((id) => orderDef(id).retired === true);
// The Holy Army, shared with Dominion, moved to the shared file in batch S.
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
  it('carries the sheet’s fifty-two cards, eight · fourteen · eleven · five · fourteen', () => {
    expect(STANDING).toHaveLength(52);
    const perBand = BANDS.map((band) => STANDING.filter((id) => orderDef(id).band === band).length);
    expect(perBand).toEqual([8, 14, 11, 5, 14]);
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
    expect(RETIRED).toHaveLength(25);
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
  it('are The Interdict and Consecrated Ground, each saying why', () => {
    expect([...DEFERRED].sort()).toEqual(['consecratedGround', 'theInterdict']);
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

describe('the first age', () => {
  const FORBIDDEN = /\b(prophet|prophets|temple|temples|apostle|apostles|inquisitor|inquisitors|cathedral|cathedrals|foreign)\b/i;

  it('leaves the prophet, the Temple and a foreign congregation out of every tier-0 row', () => {
    for (const id of STANDING.filter((row) => orderDef(row).band === 0)) {
      const def = orderDef(id);
      expect(def.text ?? '', id).not.toMatch(FORBIDDEN);
      expect(JSON.stringify(def.effects), id).not.toMatch(/temple|cathedral|prophet|apostle|inquisitor|following/i);
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

  it('The Fast’s charter opens a rite that stops growth and pays faith for every citizen', () => {
    const g = akhenaten();
    const { seat: player, city } = town(g);
    player.charteredRites.push('riteOfFasting' as RiteId);
    player.faithPool = 500;
    city.population = 4;
    expect(riteError(g.state, 0, city.id, 'riteOfFasting' as RiteId)).toBeNull();
    performRiteAt(g.state, player, city, 'riteOfFasting' as RiteId);
    expect(explainGrowthPercent(g.state, city).some((line) => line.percent === -100)).toBe(true);
    const faith = linesOf(g.state, city, 'riteOfFasting').reduce((sum, line) => sum + line.faith, 0);
    expect(faith).toBe(4);
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
