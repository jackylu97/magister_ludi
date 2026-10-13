/**
 * **The Magisterial deck, entered** (batch D1b of `docs/plans/decks-rework.md`;
 * the design of record is `docs/six-decks-first-cut.md`'s "Magisterial" section
 * and its "Card-reading conventions").
 *
 * One file a deck, one test file beside it. What is pinned here, in the order a
 * reader would ask it:
 *
 *   · every row of `data/decks/magisterial.json` folds into the registry as a
 *     Magisterial row, with a band, a rarity, a name, a flavour and its ratified
 *     text — and an id nothing else in the eight files uses;
 *   · the file **is** the design doc's four tier tables, card for card: the same
 *     names in the same order, the doc's C/U/R as the row's rarity, the tier
 *     heading as the band, and the doc's proposed text as `text` verbatim;
 *   · a **live** row says only things the vocabulary can say — every effect kind
 *     is one the evaluator has an arm for, and every (`where`, `basis`) pair a
 *     `pays` line names is one of the pairs `docs/yields.md`'s register carries;
 *   · a live row prints: `describeCard` gives it clauses, and no keyword mark
 *     survives into the sentence a player is shown;
 *   · a **deferred** row carries no effects, says in plain words what is not
 *     built, and is dealt by nobody (`orderIsDealt`);
 *   · a seeded draft for a Magisterial figure (Hypatia, Scientific + Magisterial)
 *     deals only live rows of this deck, the commons and the crosses — never a
 *     deferred row, never another deck's.
 *
 * **What is deliberately not here.** The doc↔data mirror of
 * `docs/orders-and-doctrines.md`'s own Magisterial table lives where every
 * deck's does — `test/sim/statecraftDocSync.test.ts` — and a second copy of it
 * would be a second place to keep in step. This file pins the half that table
 * cannot: that the rows mirror the *design* doc they were entered from. The one
 * direction asserted below is the cheap guard the sync test's own shape
 * suggests — a name in that table that names no live row of this file.
 */

import { describe, expect, it } from 'vitest';

import { type BuildingId } from '../../../src/sim/buildingData';
import { refreshCityDerived } from '../../../src/sim/cities';
import { type Game, createGame } from '../../../src/sim/game';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../../src/sim/state';
import { explainCity } from '../../../src/sim/yields/town';
import { cardAuthority, drawOrderOffer, eligibleFor } from '../../../src/sim/statecraft';
import { describeCard, stripRefs } from '../../../src/sim/statecraft';
import {
  type Band,
  type CardEffect,
  type CardEffectKind,
  type OrderId,
  type OrderRarity,
  BANDS,
  DECK_FILES,
  DECK_FILE_ORDERS,
  ORDER_IDS,
  TIER_LADDER,
  orderDef,
  orderIsDealt,
} from '../../../src/sim/statecraftData';
import { TECH_IDS, type TechId, techDef } from '../../../src/sim/techData';
import { found } from '../statecraftHelpers';

// --- the deck -----------------------------------------------------------------

/** Every id this deck's file carries, in file order. */
const MAGISTERIAL: readonly OrderId[] = DECK_FILE_ORDERS.magisterial;

const live = (id: OrderId): boolean => orderIsDealt(id);
const deferred = (id: OrderId): boolean => !orderIsDealt(id);

// --- the design doc, read -----------------------------------------------------

const docFiles = import.meta.glob('../../../docs/six-decks-first-cut.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const DOC = Object.values(docFiles)[0] as string;

/** The Magisterial section alone — the tier headings repeat in every deck. */
const SECTION = (() => {
  const start = DOC.indexOf('### Magisterial');
  expect(start, 'the design doc has a Magisterial section').toBeGreaterThanOrEqual(0);
  const end = DOC.indexOf('\n## ', start);
  return DOC.slice(start, end === -1 ? undefined : end);
})();

/** The doc's C/U/R, as the field spells it. */
const MARKS: Record<string, OrderRarity> = { C: 'common', U: 'uncommon', R: 'rare' };

/** One tier table of the Magisterial section: `[name, rarity, text]` a row. */
function tierRows(band: Band): string[][] {
  const heading = `#### Tier ${band} —`;
  const start = SECTION.indexOf(heading);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const end = SECTION.indexOf('\n#### ', start + heading.length);
  const block = SECTION.slice(start, end === -1 ? undefined : end);
  const rows: string[][] = [];
  for (const line of block.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells[0] === 'Card' || cells.every((cell) => /^-+$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows;
}

// --- the vocabulary, read -----------------------------------------------------

/**
 * Every effect kind the evaluator has an arm for — `statecraft.test.ts`' own
 * register, restated here so a row naming a shape that does not exist fails in
 * this file rather than three files away.
 */
const KNOWN_KINDS = new Set<CardEffectKind>([
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

const yieldsDocFiles = import.meta.glob('../../../docs/yields.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const YIELDS_DOC = Object.values(yieldsDocFiles)[0] as string;

/**
 * The (`where` · `basis`) pairs `docs/yields.md`'s register carries — the
 * sequence of record. A `pays` row written in a pair that is not there is a
 * shape the register has never placed, and this deck may not invent one.
 */
const REGISTERED_PAIRS: ReadonlySet<string> = (() => {
  const pairs = new Set<string>();
  for (const line of YIELDS_DOC.split('\n')) {
    if (!line.startsWith('| `pays` |')) continue;
    const cell = line.split('|')[2]?.trim() ?? '';
    const [where, basis] = cell.split('·').map((half) => half.trim());
    if (where && basis) pairs.add(`${where}·${basis}`);
  }
  return pairs;
})();

/** Every effect on a row, the condition-gated ones inside `then` included. */
function allEffects(id: OrderId): CardEffect[] {
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

// --- the seat ------------------------------------------------------------------

/** A duel with Hypatia (Scientific + Magisterial) in seat 0. */
function seated(seed: number): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Hypatia', color: '#d4502e', isHuman: true, leader: 'hypatiaOfAlexandria' },
      { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
    ],
  });
}

/** A technology of this age, for the research-age half of the band gate. */
function techOfAge(age: 1 | 2 | 3 | 4): TechId {
  const id = TECH_IDS.find((tech) => techDef(tech).age === age);
  expect(id, `a technology of age ${age}`).toBeDefined();
  return id!;
}

/** Opens every band for this seat: the ladder's last rung and the last age. */
function openEveryBand(state: GameState, player: Player): void {
  player.statecraft.drafts = 29;
  for (const age of [1, 2, 3, 4] as const) {
    const id = techOfAge(age);
    if (!player.techsResearched.includes(id)) player.techsResearched.push(id);
  }
  void state;
}

// --- the rows ------------------------------------------------------------------

describe('the Magisterial deck', () => {
  it('folds every row of its own file as a Magisterial row with a band and a rarity', () => {
    expect(MAGISTERIAL.length).toBeGreaterThan(0);
    for (const id of MAGISTERIAL) {
      const def = orderDef(id);
      expect(def.decks, id).toEqual(['magisterial']);
      expect(BANDS, id).toContain(def.band);
      expect(['common', 'uncommon', 'rare'], id).toContain(def.rarity);
      expect(def.name, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
      expect(def.text, `${id} carries no ratified text`).toBeTruthy();
      expect(def.line, id).toBe('none');
      // The rework's rows carry neither of the pre-rework fields.
      expect(def.pool, id).toBeUndefined();
      expect(def.slot, id).toBeUndefined();
      expect(def.retired, id).toBeUndefined();
      expect(id, `${id} is not lowerCamel`).toMatch(/^[a-z][A-Za-z0-9]*$/);
    }
  });

  it('gives every row an id nothing else in the eight files uses', () => {
    const mine = new Set<string>(MAGISTERIAL);
    expect(mine.size).toBe(MAGISTERIAL.length);
    for (const file of DECK_FILES) {
      if (file === 'magisterial') continue;
      for (const id of DECK_FILE_ORDERS[file]) expect(mine.has(id), id).toBe(false);
    }
    // The retired shelf is every id the registry holds that no deck file does.
    const inDecks = new Set<string>(DECK_FILES.flatMap((file) => [...DECK_FILE_ORDERS[file]]));
    for (const id of ORDER_IDS) {
      if (inDecks.has(id)) continue;
      expect(mine.has(id), `${id} collides with the retired shelf`).toBe(false);
    }
  });

  it('is the design doc’s four tier tables, card for card', () => {
    const byBand = new Map<Band, OrderId[]>(BANDS.map((band) => [band, []]));
    for (const id of MAGISTERIAL) byBand.get(orderDef(id).band)!.push(id);
    // The doc has tables for Tier 0 to Tier III only. Band 4 (Tier IV) was
    // added in the foundation batch and holds no Magisterial row yet.
    expect(byBand.get(4), 'no Magisterial row in band 4 yet').toEqual([]);
    for (const band of BANDS.filter((b) => b < 4)) {
      const rows = tierRows(band);
      const ids = byBand.get(band)!;
      expect(ids.length, `tier ${band} holds as many rows as the doc`).toBe(rows.length);
      rows.forEach((cells, index) => {
        const id = ids[index]!;
        const def = orderDef(id);
        expect(def.name, `tier ${band} row ${index} (${id})`).toBe(cells[0]);
        expect(MARKS[cells[1]!], `${def.name}: the doc's mark "${cells[1]}"`).toBeDefined();
        expect(def.rarity, `${def.name} (${id}) — the doc says "${cells[1]}"`).toBe(
          MARKS[cells[1]!],
        );
        expect(def.text, `${def.name} (${id}) — the doc's proposed text`).toBe(cells[2]);
      });
    }
  });
});

describe('the live rows', () => {
  it('say only things the vocabulary can say', () => {
    const lived = MAGISTERIAL.filter(live);
    expect(lived.length).toBeGreaterThan(0);
    for (const id of lived) {
      const effects = allEffects(id);
      expect(effects.length, `${id} is live and says nothing`).toBeGreaterThan(0);
      for (const effect of effects) {
        expect(KNOWN_KINDS.has(effect.kind), `${id}: "${effect.kind}"`).toBe(true);
        if (effect.kind !== 'pays') continue;
        const pair = `${effect.where}·${effect.basis ?? 'flat'}`;
        expect(REGISTERED_PAIRS.has(pair), `${id}: the pair ${pair} is in no register`).toBe(true);
      }
    }
  });

  it('print through the describers, with no keyword mark left raw', () => {
    for (const id of MAGISTERIAL.filter(live)) {
      const clauses = describeCard(id);
      expect(clauses.length, `${id} prints nothing`).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(clause.text, id).toBeTruthy();
        expect(stripRefs(clause.text), `${id}: a raw keyword mark`).not.toMatch(/\[\[/);
      }
    }
  });
});

describe('the deferred rows', () => {
  it('carry no effects, say what is missing in plain words, and are dealt by nobody', () => {
    const held = MAGISTERIAL.filter(deferred);
    expect(held.length).toBeGreaterThan(0);
    for (const id of held) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.charter, id).toBeUndefined();
      expect(def.deferred, `${id} is deferred and does not say why`).toBeDefined();
      expect(def.deferred!.length, id).toBeGreaterThan(0);
      for (const sentence of def.deferred!) {
        expect(sentence, id).toBeTruthy();
        // Player prose: no identifiers, no keyword marks, no camelCase.
        expect(sentence, id).not.toMatch(/\[\[/);
        expect(sentence, id).not.toMatch(/[a-z][A-Z]/);
      }
      expect(orderIsDealt(id), `${id} is deferred and still dealt`).toBe(false);
    }
  });

  it('print their deferred halves through the describers', () => {
    for (const id of MAGISTERIAL.filter(deferred)) {
      const clauses = describeCard(id);
      expect(clauses.length, `${id} prints nothing`).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(stripRefs(clause.text), `${id}: a raw keyword mark`).not.toMatch(/\[\[/);
      }
    }
  });
});

describe('the fold', () => {
  /**
   * **The rows on a board, not just in a table.** Shape is not payment: a scope
   * that admits nothing and a count that reads nothing both typecheck and both
   * pay nought. So every live row is seated at once in a town that has raised
   * what the deck names, and the town's own list is read — rule 5's list, which
   * is what the totals are the fold of.
   */
  function seatedWithEveryLiveRow(): { g: Game; seat: Player; city: City } {
    const g = seated(31);
    const seat = playerById(g.state, 0)!;
    openEveryBand(g.state, seat);
    const city = found(g.state, seat.id);
    for (const id of [
      'monument',
      'shrine',
      'granary',
      'library',
      'temple',
      'market',
      'garden',
      'amphitheater',
    ] as BuildingId[]) {
      if (!city.buildings.includes(id)) city.buildings.push(id);
    }
    const lived = MAGISTERIAL.filter(live);
    seat.statecraft.orders = [...lived];
    seat.statecraft.slots = lived.map((card) => ({ card, sealedUntil: 0 }));
    bumpRevision(g.state);
    refreshCityDerived(g.state, city);
    return { g, seat, city };
  }

  it('reads every live row into a town’s list without throwing', () => {
    const { g, city } = seatedWithEveryLiveRow();
    const reading = explainCity(g.state, city);
    expect(reading.lines.length).toBeGreaterThan(0);
    expect(Number.isFinite(reading.flats.food)).toBe(true);
  });

  it('pays what the Monument rows print, in the town that raised one', () => {
    const { g, city } = seatedWithEveryLiveRow();
    const lines = explainCity(g.state, city).lines.filter((line) => line.card === 'civicGranaries');
    const food = lines.reduce((sum, line) => sum + line.food, 0);
    const production = lines.reduce((sum, line) => sum + line.production, 0);
    expect(food).toBe(2);
    expect(production).toBe(2);
  });

  it('pays a two-building scope only where both stand', () => {
    const { g, city } = seatedWithEveryLiveRow();
    const of = (card: string) =>
      explainCity(g.state, city).lines.filter((line) => line.card === card);
    expect(of('hearthCeremonies').reduce((sum, line) => sum + line.faith, 0)).toBe(2);
    // The Grand Fairs wants a Market beside the Monument, and this town has one.
    expect(of('theGrandFairs').reduce((sum, line) => sum + line.gold, 0)).toBe(5);
    // Take the Market away and the line goes with it.
    city.buildings.splice(city.buildings.indexOf('market' as BuildingId), 1);
    bumpRevision(g.state);
    refreshCityDerived(g.state, city);
    expect(of('theGrandFairs')).toHaveLength(0);
  });

  it('widens the writ off the culture buildings it counts', () => {
    const { g, seat } = seatedWithEveryLiveRow();
    const assemblies = cardAuthority(g.state, seat.id).filter(
      (line) => line.card === 'theCivicAssemblies',
    );
    expect(assemblies.length, 'The Civic Assemblies pays no capacity at all').toBeGreaterThan(0);
  });
});

describe('the draft', () => {
  it('deals a Magisterial seat only live rows of its own decks, the commons and the crosses', () => {
    const magisterialLive = new Set<string>(MAGISTERIAL.filter(live));
    for (const seed of [1, 7, 23, 101]) {
      const g = seated(seed);
      const seat = playerById(g.state, 0)!;
      expect(seat.decks).toEqual(['scientific', 'magisterial']);
      openEveryBand(g.state, seat);
      // The bag first: nothing eligible that is not this seat's to draw.
      for (const id of eligibleFor(g.state, seat)) {
        const home = orderDef(id).decks;
        expect(orderIsDealt(id), `${id} is eligible and dealt by nobody`).toBe(true);
        if (home.length === 0) continue;
        expect(home.some((deck) => seat.decks.includes(deck)), id).toBe(true);
        if (home.includes('magisterial') && home.length === 1) {
          expect(magisterialLive.has(id), `${id} is a deferred row in the bag`).toBe(true);
        }
      }
      // Then twenty hands, the cadence walking the third position through its
      // generic · cross · generic · single turns.
      for (let draft = 0; draft < 20; draft += 1) {
        seat.statecraft.drafts = 29 + draft;
        for (const id of drawOrderOffer(g.state, seat).options) {
          expect(orderIsDealt(id), `${id} was dealt and is dealt by nobody`).toBe(true);
          const home = orderDef(id).decks;
          if (home.length === 0) continue;
          expect(home.some((deck) => seat.decks.includes(deck)), id).toBe(true);
        }
      }
    }
  });

  it('keeps every deferred row of this deck out of a Magisterial seat’s bag', () => {
    const g = seated(5);
    const seat = playerById(g.state, 0)!;
    openEveryBand(g.state, seat);
    // A seat is dealt only its current band (the ruling of 2026-10-13), so the
    // bag is read at every rung of the ladder and the bands are put together.
    const bag = new Set<string>(
      TIER_LADDER.flatMap((rung) => eligibleFor(g.state, seat, rung.drafts)),
    );
    for (const id of MAGISTERIAL.filter(deferred)) expect(bag.has(id), id).toBe(false);
    for (const id of MAGISTERIAL.filter(live)) expect(bag.has(id), id).toBe(true);
  });
});

/**
 * **The worksheet's own table** (`docs/orders-and-doctrines.md`, "### Magisterial").
 *
 * The full mirror is `statecraftDocSync.test.ts`' — every live row in the table
 * by name, with its band, rarity, derived role and ratified words — and it is
 * asserted there and nowhere else. What is pinned here is the direction that
 * table alone cannot get wrong twice: a name in the Magisterial table that
 * names no live row of this deck's file.
 */
describe('the worksheet', () => {
  const worksheetFiles = import.meta.glob('../../../docs/orders-and-doctrines.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const WORKSHEET = Object.values(worksheetFiles)[0] as string;

  it('names no card in its Magisterial table that this file does not carry live', () => {
    const start = WORKSHEET.indexOf('### Magisterial');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = WORKSHEET.indexOf('\n### ', start + 1);
    const block = WORKSHEET.slice(start, end === -1 ? undefined : end);
    const names = new Set(MAGISTERIAL.filter(live).map((id) => orderDef(id).name));
    for (const line of block.split('\n')) {
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells[0] === 'Order' || cells.every((cell) => /^-+$/.test(cell))) continue;
      expect(names.has(cells[0]!), `the table names "${cells[0]}"`).toBe(true);
    }
  });
});
