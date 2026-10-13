/**
 * The Expansionist deck's own file, `data/decks/expansionist.json`, checked
 * against its sheet (`docs/decks/expansionist.md`).
 *
 * What is pinned here:
 *   · every row names this deck and carries a band, rarity, name, flavour and
 *     text; the only charters are the four tended-work unlocks;
 *   · the sheet's proposed cuts are retired and dealt to nobody;
 *   · every dealt row describes itself in words with no raw reference, and
 *     every deferred row carries a plain sentence and a note;
 *   · a seeded draft under Pachacuti (the Expansionist leader) deals only rows
 *     this seat may be offered;
 *   · the tended works: the card gate, counting as wild land, no pillage, the
 *     felled wood taking its garden with it, and Six Gardens' count;
 *   · the other shapes the deck added: the "Needs tended land" draft gate, the
 *     bought-hex tally, the founding claim, the worked-hex scope and the
 *     surveyed-hill test.
 *
 * The doc table in `docs/orders-and-doctrines.md` is checked by
 * `statecraftDocSync.test.ts`, not here.
 */

import { describe, expect, it } from 'vitest';

import { type Game, createGame } from '../../../src/sim/game';
import {
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  cardUnlocksImprovement,
  cityScopeAdmits,
  describeCard,
  drawOrderOffer,
  eligibleFor,
  slotOrderAt,
  slotOrderError,
  stripRefs,
  tallyOf,
  tileConditionHolds,
} from '../../../src/sim/statecraft';
import {
  buildImprovementAt,
  chopFeatureAt,
  improvementErrorAt,
  pillageAt,
  pillageError,
} from '../../../src/sim/improvements';
import { foundCityAt, ownedTiles, purchaseTileAt } from '../../../src/sim/cities';
import { commissionFigure } from '../../../src/sim/commissions';
import { raiseImprovement } from '../../../src/sim/map';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { at, bareState, woodedWorker } from '../improvementHelpers';
import {
  type Band,
  type CityScope,
  type CardEffect,
  type CardEffectKind,
  type OrderId,
  type OrderRarity,
  BANDS,
  DECK_FILE_ORDERS,
  TIER_LADDER,
  ORDER_IDS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { TECH_IDS, type TechId, techDef } from '../../../src/sim/techData';

/** The deck's own rows, in file order — what every draw and every screen walks. */
const ROWS: readonly OrderId[] = DECK_FILE_ORDERS.expansionist;

/**
 * A row the draft deals: one with effects, a commission (a goal and a reward)
 * or a charter (the tended-work unlocks). Since the deck implementation batch
 * (`docs/plans/deck-implementation.md`) this is `orderIsDealt`'s own answer.
 */
function isLive(id: OrderId): boolean {
  return orderIsDealt(id);
}

/** The sheet's Proposed cuts: kept for saves, out of every pool. */
const RETIRED = ROWS.filter((id) => orderDef(id).retired === true);
const LIVE = ROWS.filter(isLive);
const DEFERRED = ROWS.filter((id) => !isLive(id) && orderDef(id).retired !== true);

/** The four tended-work unlocks, the only charters this deck carries. */
const TENDED_UNLOCKS: Readonly<Record<string, string>> = {
  theForestGardens: 'forestGarden',
  theFishTraps: 'fishTraps',
  theWildOrchards: 'wildOrchard',
  theBurningSeason: 'burnedCountry',
};

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
      // neither"). The only charters are the four tended-work unlocks, each
      // naming its own improvement row.
      expect(def.pool, id).toBeUndefined();
      expect(def.slot, id).toBeUndefined();
      const work = TENDED_UNLOCKS[id];
      if (work === undefined) expect(def.charter, id).toBeUndefined();
      else expect(def.charter, id).toEqual({ unlocks: { improvement: work } });
    }
  });

  it('retires the sheet\'s proposed cuts and deals none of them', () => {
    expect(RETIRED.length).toBe(31);
    for (const id of RETIRED) {
      expect(orderIsDealt(id), id).toBe(false);
      expect(ordersForDecks(['expansionist']), id).not.toContain(id);
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

  it('spreads the rows across the five bands the design doc’s tiers name', () => {
    const bands = new Set(ROWS.map((id) => orderDef(id).band));
    // Band 4 is Tier IV (batch F); The Corvée and The General Levy sit there.
    expect([...bands].sort()).toEqual([0, 1, 2, 3, 4]);
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
      'levy',
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
  // The last rung of the ladder, which opens band 4 (Tier IV).
  player.statecraft.drafts = TIER_LADDER[TIER_LADDER.length - 1]!.drafts;
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

// --- the tended works and the shapes the deck added ----------------------------

/** Puts a card in seat 0's collection, the way a draft would. */
function hold(state: GameState, id: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  bumpRevision(state);
}

/** Seats a card for seat 0 in the first empty chair, through the slot verb. */
function seatCard(state: GameState, id: OrderId): void {
  hold(state, id);
  const player = playerById(state, 0)!;
  const index = player.statecraft.slots.findIndex((slot) => slot === null);
  expect(slotOrderError(state, 0, id, index)).toBeNull();
  slotOrderAt(state, player, id, index);
  bumpRevision(state);
}

describe('the tended works', () => {
  it('opens a tended work only to a seat holding its charter, and names the card when it refuses', () => {
    const { state, worker, tile } = woodedWorker();
    expect(improvementErrorAt(state, 0, tile, 'forestGarden')).toBe(
      'A forest garden needs the card The Forest Gardens',
    );
    hold(state, 'theForestGardens' as OrderId);
    expect(cardUnlocksImprovement(state, 0, 'forestGarden')).toBe(true);
    expect(improvementErrorAt(state, 0, tile, 'forestGarden')).toBeNull();
    // The charter names one row; its siblings stay shut.
    expect(improvementErrorAt(state, 0, tile, 'wildOrchard')).not.toBeNull();
    buildImprovementAt(state, worker, tile, 'forestGarden');
    expect(tile.improvement).toBe('forestGarden');
    expect(tile.feature).toBe('forest');
  });

  it('counts a tended hex as wild: unimproved, tended, and not improved', () => {
    const { state, tile } = woodedWorker();
    raiseImprovement(tile, 'forestGarden', state.turn);
    expect(tileConditionHolds(tile, { test: 'unimproved' })).toBe(true);
    expect(tileConditionHolds(tile, { test: 'improved' })).toBe(false);
    expect(tileConditionHolds(tile, { test: 'tended' })).toBe(true);
    raiseImprovement(tile, 'lumbermill', state.turn);
    expect(tileConditionHolds(tile, { test: 'unimproved' })).toBe(false);
    expect(tileConditionHolds(tile, { test: 'improved' })).toBe(true);
    expect(tileConditionHolds(tile, { test: 'tended' })).toBe(false);
    // `any` holds when one part does.
    expect(tileConditionHolds(tile, { test: 'any', of: [{ test: 'tended' }, { test: 'improved' }] })).toBe(true);
    expect(tileConditionHolds(tile, { test: 'any', of: [] })).toBe(false);
  });

  it('cannot be pillaged, though a road on the same hex can', () => {
    const { state, tile } = woodedWorker();
    raiseImprovement(tile, 'forestGarden', state.turn);
    const raider = createUnit(state, 1, 'warrior', tile.col, tile.row);
    bumpRevision(state);
    expect(pillageError(state, raider.id)).toBe(`There is nothing to pillage on (${tile.col}, ${tile.row})`);
    tile.road = 0;
    expect(pillageError(state, raider.id)).toBeNull();
    const report = pillageAt(state, raider, tile);
    expect(report.road).toBe(true);
    expect(report.improvement).toBeUndefined();
    expect(tile.improvement).toBe('forestGarden');
    expect(tile.road).toBeUndefined();
  });

  it('goes with the wood when the forest is felled', () => {
    const { state, worker, tile } = woodedWorker();
    raiseImprovement(tile, 'forestGarden', state.turn);
    chopFeatureAt(state, worker, tile);
    expect(tile.feature).toBe('none');
    expect(tile.improvement).toBeUndefined();
  });

  it('counts the tended hexes inside the borders for Six Gardens', () => {
    const { state, tile } = woodedWorker();
    expect(commissionFigure(state, 0, 'tendedTiles')).toBe(0);
    raiseImprovement(tile, 'forestGarden', state.turn);
    expect(commissionFigure(state, 0, 'tendedTiles')).toBe(1);
    expect(commissionFigure(state, 1, 'tendedTiles')).toBe(0);
  });
});

describe('the deck’s other shapes', () => {
  it('deals the cards marked "Needs tended land" only to a seat holding an unlock', () => {
    const g = seated();
    const seat = playerById(g.state, 0)!;
    openEveryBand(seat);
    const gated = ROWS.filter((id) => orderDef(id).needsTendedWork === true && orderIsDealt(id));
    expect(gated.length).toBeGreaterThan(0);
    // A seat is dealt only its current band (the ruling of 2026-10-13), so the
    // bag is read at every rung of the ladder and the bands are put together.
    const everyBand = (): OrderId[] =>
      TIER_LADDER.flatMap((rung) => eligibleFor(g.state, seat, rung.drafts));
    const shut = everyBand();
    for (const id of gated) expect(shut, id).not.toContain(id);
    seat.statecraft.orders.push('theFishTraps' as OrderId);
    const open = everyBand();
    for (const id of gated) expect(open, id).toContain(id);
  });

  it('counts a bought hex toward The Wide Country while it is seated', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 5, 5));
    bumpRevision(state);
    seatCard(state, 'theWideCountry' as OrderId);
    const sc = playerById(state, 0)!.statecraft;
    expect(tallyOf(sc, 'theWideCountry' as OrderId)).toBe(0);
    playerById(state, 0)!.gold = 5000;
    purchaseTileAt(state, city, at(state, 7, 5));
    expect(tallyOf(sc, 'theWideCountry' as OrderId)).toBe(1);
  });

  it('claims one more hex at founding under The Beating of the Bounds', () => {
    const plain = bareState();
    const before = ownedTiles(plain, foundCityAt(plain, 0, at(plain, 5, 5))).length;
    const state = bareState();
    seatCard(state, 'theBeatingOfTheBounds' as OrderId);
    const after = ownedTiles(state, foundCityAt(state, 0, at(state, 5, 5))).length;
    expect(after).toBe(before + 1);
  });

  it('admits a town by the hexes its citizens work, through any hex condition', () => {
    const { state, city, tile } = woodedWorker();
    const scope: CityScope = { test: 'workingTiles', on: { test: 'tended' } };
    raiseImprovement(tile, 'forestGarden', state.turn);
    city.workedTiles = city.workedTiles.filter((cell) => !(cell.col === tile.col && cell.row === tile.row));
    bumpRevision(state);
    expect(cityScopeAdmits(state, city, scope)).toBe(false);
    city.workedTiles.push({ col: tile.col, row: tile.row });
    bumpRevision(state);
    expect(cityScopeAdmits(state, city, scope)).toBe(true);
    expect(cityScopeAdmits(state, city, { ...scope, atLeast: 2 })).toBe(false);
  });

  it('pays The Prospectors only on a mine standing on a surveyed hill', () => {
    const { state, tile } = woodedWorker();
    seatCard(state, 'theProspectors' as OrderId);
    tile.feature = 'none';
    tile.hills = true;
    tile.resource = 'iron';
    raiseImprovement(tile, 'mine', state.turn);
    bumpRevision(state);
    const paid = (): number =>
      explainTileYield(tile, yieldContextFor(state, 0))
        .filter((line) => line.source === 'Order · The Prospectors')
        .reduce((sum, line) => sum + (line.production ?? 0), 0);
    expect(tileConditionHolds(tile, { test: 'surveyed' })).toBe(false);
    expect(paid()).toBe(0);
    tile.surveyed = true;
    bumpRevision(state);
    expect(tileConditionHolds(tile, { test: 'surveyed' })).toBe(true);
    expect(paid()).toBe(3);
  });
});
