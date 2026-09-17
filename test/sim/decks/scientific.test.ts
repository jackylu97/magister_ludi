/**
 * **The Scientific deck, D1b** (`docs/plans/decks-rework.md` "D1b — the cards";
 * the design of record is `docs/six-decks-first-cut.md`, its "Scientific"
 * section — the four tier tables, "Rules for these forty cards" and "Charter
 * technologies and research conditions").
 *
 * Forty rows in `data/decks/scientific.json`, and what is pinned here is the
 * bargain D1b was given: a card whose text fits a shape the vocabulary already
 * has is **live** and carries `effects`; a card that needs a shape, a predicate,
 * an occasion, a count or a rule that does not exist is **deferred** — its own
 * sentence in plain words, no effects, in the data and the Compendium and in no
 * pool. Never bent, never a new shape.
 *
 * So the register below reads in both directions. Every live row's effects have
 * to print through the describers (a shape nobody wrote words for fails there,
 * not on a screen), and every deferred row has to be empty of effects and
 * carrying a sentence — because a half-built row that still pays something is
 * exactly the drift the deferral rule exists to stop.
 *
 * **The five research Charters are deferred and still carry `charter`.** Optics,
 * Alloys, Taxonomy, Mechanics and Chemistry are not tech rows yet (D2 places
 * them off-lane), so the grant names a node the tree cannot answer for. The row
 * records the charter so D2 has one place to wire it, and `orderIsDealt` keeps
 * them off every shelf until it can be answered: a charter's grant is the whole
 * of the card, so a charter with no grant and a `deferred` sentence is dealt by
 * nobody (the clause the D1b audit asked for, `docs/plans/decks-shape-audit.md`
 * "A deferred charter is still dealt"). This file read the old answer when it
 * was written, and the two claims below are re-cut to the new one.
 */

import { describe, expect, it } from 'vitest';

import { type Game, createGame } from '../../../src/sim/game';
import { getTileAt } from '../../../src/sim/map';
import { refreshCityDerived } from '../../../src/sim/cities';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { explainCity, foldCity } from '../../../src/sim/yields/town';
import { type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import {
  deckPoolOf,
  describeCard,
  describeEffects,
  drawOrderOffer,
  eligibleFor,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  type CardEffect,
  type OrderId,
  type OrderRarity,
  BANDS,
  DECK_FILE_ORDERS,
  isCharter,
  orderDef,
  orderIsDealt,
} from '../../../src/sim/statecraftData';
import { TECH_IDS, type TechAge, type TechId, techDef } from '../../../src/sim/techData';
import { found, game } from '../statecraftHelpers';

/** The ids of `data/decks/scientific.json`, in file order. */
const DECK: readonly OrderId[] = DECK_FILE_ORDERS.scientific;

/** A row with effects — the half of the deck D1b could say in the vocabulary. */
const LIVE = DECK.filter((id) => orderDef(id).effects.length > 0);

/** A row with a sentence and nothing to slot — what D2's waves un-defer. */
const DEFERRED = DECK.filter((id) => orderDef(id).effects.length === 0);

/** The five research Charters, deferred and carrying their grant. */
const CHARTERS = DECK.filter((id) => isCharter(id));

const RARITIES: readonly OrderRarity[] = ['common', 'uncommon', 'rare'];

/** The doc's rarity marks, the sync test's own table. */
const MARK: Record<OrderRarity, string> = { common: '●', uncommon: '◆', rare: '○' };

// --- the rows ----------------------------------------------------------------

describe('the forty rows', () => {
  it('is the whole deck, every row named for this deck alone, banded and rated', () => {
    expect(DECK).toHaveLength(40);
    expect(new Set(DECK).size).toBe(40);
    for (const id of DECK) {
      const def = orderDef(id);
      expect(def.decks, id).toEqual(['scientific']);
      expect(BANDS, id).toContain(def.band);
      expect(RARITIES, id).toContain(def.rarity);
      expect(def.name, id).toBeTruthy();
      expect(def.flavor, id).toBeTruthy();
      // A row written after the rework carries neither of the old fields.
      expect(def.pool, id).toBeUndefined();
      expect(def.slot, id).toBeUndefined();
      expect(def.retired, id).toBeUndefined();
    }
  });

  it('fills the design doc’s four tier tables — ten, ten, twelve and eight', () => {
    const perBand = [0, 1, 2, 3].map((band) => DECK.filter((id) => orderDef(id).band === band).length);
    expect(perBand).toEqual([10, 10, 12, 8]);
  });

  it('splits into live rows with effects and deferred rows with a sentence, and nothing between', () => {
    expect(LIVE.length + DEFERRED.length).toBe(DECK.length);
    for (const id of LIVE) {
      const def = orderDef(id);
      expect(def.text, `${id} is live and carries no ratified text`).toBeTruthy();
      expect(def.deferred, `${id} is live and also deferred`).toBeUndefined();
    }
    for (const id of DEFERRED) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.deferred, `${id} defers nothing in words`).toBeDefined();
      expect(def.deferred!.length, id).toBeGreaterThan(0);
      for (const line of def.deferred!) expect(line.trim(), id).toBeTruthy();
      // A deferred row prints no rules text: the effects are the truth, and a
      // row with none must not promise any.
      expect(def.text, `${id} is deferred and still prints rules text`).toBeUndefined();
    }
  });

  it('keeps every deferred sentence plain — no identifiers, no figures, no marks', () => {
    for (const id of DEFERRED) {
      for (const line of orderDef(id).deferred!) {
        expect(line, id).not.toMatch(/\d/);
        expect(line, id).not.toMatch(/\[\[/);
        expect(line, id).not.toMatch(/[%+]/);
      }
    }
  });
});

// --- the register ------------------------------------------------------------

describe('the live rows’ effects', () => {
  it('names only shapes the vocabulary has words for, and prints a clause for each', () => {
    for (const id of LIVE) {
      const effects = orderDef(id).effects;
      // `describeEffect` has an arm for every shape in the union and no silent
      // default, so a shape nobody wrote words for fails here.
      const speaking = effects.filter(
        (effect: CardEffect) =>
          effect.kind !== 'pays' || (effect.basis ?? 'flat') !== 'flat' || Object.keys(effect).length > 2,
      );
      const clauses = describeEffects(effects);
      expect(clauses.length, `${id} says ${speaking.length} things and prints ${clauses.length}`)
        .toBeGreaterThanOrEqual(speaking.length);
      for (const clause of clauses) expect(clause.text, id).toBeTruthy();
    }
  });

  it('prints through the describers with every keyword resolved — no raw marks on a surface', () => {
    for (const id of DECK) {
      const said = describeCard(id).map((clause) => clause.text);
      for (const text of said) {
        expect(stripRefs(text), id).toBeTruthy();
        expect(stripRefs(text), id).not.toContain('[[');
        expect(stripRefs(text), id).not.toContain(']]');
      }
    }
  });

  it('pays only through pairs the yields sequence already carries', () => {
    // `docs/yields.md`'s register: the hex at step 2, the town's flats and
    // counts at 3. Those are the two the deck uses, and a row reaching for a
    // pair nobody folds is a shape decision rather than a JSON row.
    const pairs = new Set<string>();
    for (const id of LIVE) {
      for (const effect of orderDef(id).effects) {
        if (effect.kind !== 'pays') continue;
        pairs.add(`${effect.where}:${effect.basis ?? 'flat'}`);
        if (effect.where === 'hex') expect(effect.on, `${id} pays a hex with no condition`).toBeDefined();
      }
    }
    expect([...pairs].sort()).toEqual(['city:count', 'city:flat', 'hex:flat']);
  });
});

// --- the charters ------------------------------------------------------------

describe('the five research Charters', () => {
  it('names the five detours the design doc lists, one row each, all deferred', () => {
    expect(CHARTERS).toHaveLength(5);
    const techs = CHARTERS.map((id) => orderDef(id).charter!.unlocks.tech);
    expect(techs).toEqual(['optics', 'alloys', 'taxonomy', 'mechanics', 'chemistry']);
    for (const id of CHARTERS) {
      const def = orderDef(id);
      expect(def.effects, id).toEqual([]);
      expect(def.deferred, id).toBeDefined();
      expect(def.charter!.unlocks.building, id).toBeUndefined();
      expect(def.charter!.unlocks.rites, id).toBeUndefined();
    }
  });

  it('names five nodes the tree does not hold yet — D2 places them off-lane', () => {
    const tree = new Set<string>(TECH_IDS);
    for (const id of CHARTERS) {
      expect(tree.has(orderDef(id).charter!.unlocks.tech!), `${id} names a node the tree already holds`).toBe(false);
    }
  });

  /**
   * **Dealt by nobody, like every other deferred row.** This file pinned the
   * opposite when it was written — `orderIsDealt` dealt a charter whatever else
   * the row said, so the five sat in the pool although their grant named
   * nothing, and the pin said so rather than wishing it away. `orderIsDealt`
   * grew the clause the note asked for, so the charters are now exactly where
   * the rest of the deferred catalogue is: in the data, in the Compendium, in
   * no pool. D2 places the nodes and drops the `deferred` sentence, and the row
   * deals itself the same turn.
   */
  it('is dealt by nobody until its node exists, and neither is any other deferred row', () => {
    for (const id of CHARTERS) {
      expect(orderDef(id).deferred, id).toBeDefined();
      expect(orderDef(id).effects, id).toEqual([]);
      expect(orderIsDealt(id), `${id} is a deferred charter and still dealt`).toBe(false);
    }
    for (const id of DEFERRED) {
      expect(orderIsDealt(id), `${id} is deferred and still dealt`).toBe(false);
    }
    for (const id of LIVE) expect(orderIsDealt(id), id).toBe(true);
  });
});

// --- the draw ----------------------------------------------------------------

/** A duel with Hypatia in the first seat — Scientific and Magisterial. */
function seated(seed = 13): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Hypatia', color: '#d4502e', isHuman: true, leader: 'hypatiaOfAlexandria' },
      { name: 'Rival', color: '#3a7fe8', leader: 'pachacuti' },
    ],
  });
}

/** A technology of this age, for the band gate's research half. */
function techOfAge(age: TechAge): TechId {
  const id = TECH_IDS.find((tech) => techDef(tech).age === age);
  expect(id, `a technology of age ${age}`).toBeDefined();
  return id!;
}

/** Opens every band for this seat: the ladder's last rung and the last age. */
function openEveryBand(state: GameState, playerId: number): void {
  const player = playerById(state, playerId)!;
  player.statecraft.drafts = 29;
  for (const age of [2, 3, 4] as TechAge[]) player.techsResearched.push(techOfAge(age));
}

describe('a Scientific seat’s draw', () => {
  it('holds this deck’s live rows, its partner’s, the commons — and nothing deferred', () => {
    const g = seated();
    const hypatia = playerById(g.state, 0)!;
    expect(hypatia.decks).toEqual(['scientific', 'magisterial']);
    openEveryBand(g.state, 0);
    const pool = deckPoolOf(g.state, hypatia);
    for (const id of pool) {
      expect(orderDef(id).decks.some((deck) => hypatia.decks.includes(deck)) || orderDef(id).decks.length === 0, id)
        .toBe(true);
      expect(orderIsDealt(id), id).toBe(true);
      // Nothing half-built reaches a hand: a dealt row of this deck either pays
      // something or is one of the five Charters.
      if (DECK.includes(id)) {
        expect(orderDef(id).effects.length > 0 || isCharter(id), id).toBe(true);
      }
    }
    // Every live row of this deck is in it, and every deferred row — the five
    // Charters among them, since the clause landed — is not.
    for (const id of LIVE) expect(pool, id).toContain(id);
    for (const id of DEFERRED) expect(pool, id).not.toContain(id);
  });

  it('deals an opening seat only band-nought rows of its own pool, over twenty seeded hands', () => {
    // **Re-cut for the finished D1b.** Written while the other six files were
    // empty, this pinned the opening shelf as *this deck's* band-nought live
    // rows and nothing else. Hypatia also holds Magisterial, and the commons
    // deal to everybody, so the shelf is the seat's whole pool at band nought —
    // and this deck's own share of it is still claimed, below.
    const g = seated(21);
    const hypatia = playerById(g.state, 0)!;
    const sc = hypatia.statecraft;
    const mine = LIVE.filter((id) => orderDef(id).band === 0);
    expect(mine.length).toBeGreaterThan(0);
    const opening = deckPoolOf(g.state, hypatia).filter((id) => orderDef(id).band === 0);
    for (const id of mine) expect(opening, id).toContain(id);
    expect(eligibleFor(g.state, hypatia).slice().sort()).toEqual(opening.slice().sort());
    const seen = new Set<OrderId>();
    for (let n = 1; n <= 20; n++) {
      sc.drafts = 0;
      delete sc.pendingOrder;
      const offer = drawOrderOffer(g.state, hypatia);
      expect(new Set(offer.options).size).toBe(offer.options.length);
      for (const id of offer.options) {
        expect(opening, `hand ${n} dealt "${id}"`).toContain(id);
        seen.add(id);
      }
    }
    // Over twenty hands the draw is not quietly stuck on one row: it reaches
    // well past a single hand's worth of the shelf.
    expect(seen.size).toBeGreaterThan(3);
  });

  it('deals a fully opened seat nothing this deck defers, over forty seeded hands', () => {
    const g = seated(34);
    const hypatia = playerById(g.state, 0)!;
    const sc = hypatia.statecraft;
    openEveryBand(g.state, 0);
    const refused = new Set(DEFERRED.filter((id) => !isCharter(id)));
    for (let n = 1; n <= 40; n++) {
      sc.drafts = 29;
      delete sc.pendingOrder;
      for (const id of drawOrderOffer(g.state, hypatia).options) {
        expect(refused.has(id), `hand ${n} dealt the deferred "${id}"`).toBe(false);
      }
    }
  });

  it('deals the same hand from the same generator state', () => {
    const a = seated(5);
    const b = seated(5);
    for (const g of [a, b]) playerById(g.state, 0)!.statecraft.drafts = 1;
    expect(drawOrderOffer(b.state, playerById(b.state, 0)!)).toEqual(
      drawOrderOffer(a.state, playerById(a.state, 0)!),
    );
  });
});

// --- the six live rows, on a board -------------------------------------------

/** Grants a card and seats it, the way `statecraft.test.ts` does. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

describe('what the live rows do on a board', () => {
  it('The Almanac — a Library town works one point harder, and the shelf is cheaper', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('library');
    refreshCityDerived(g.state, city);
    // The line hangs on the shelf it names (`cardLinesOnBuilding`), so the
    // ledger says which building the point came from.
    const named = () =>
      explainCity(g.state, city).lines.filter((line) => line.source.startsWith('Order · The Almanac'));
    expect(named()).toEqual([]);
    slot(g.state, 0, 'scientificTheAlmanac');
    const line = named();
    expect(line).toHaveLength(1);
    expect(line[0]!.production).toBe(1);
    // And a town with no Library is untouched — the scope is the whole rule.
    city.buildings.splice(city.buildings.indexOf('library'), 1);
    refreshCityDerived(g.state, city);
    expect(named()).toEqual([]);
  });

  it('The Scribes’ Hall — a Library town pays by its own citizens, not the realm’s', () => {
    const g = game();
    const city = found(g.state, 0);
    city.buildings.push('library');
    city.population = 12;
    refreshCityDerived(g.state, city);
    const before = foldCity(g.state, city);
    slot(g.state, 0, 'scientificTheScribesHall');
    const after = foldCity(g.state, city);
    expect(after.science).toBe(before.science + 3);
    expect(after.culture).toBe(before.culture + 4);
  });

  it('Working Estates and Master Artificers — the works pay, and the ordinary ground does not', () => {
    const g = game();
    const city = found(g.state, 0);
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const ctx = () => yieldContextFor(g.state, 0);
    const bare = explainTileYield(tile, ctx()).length;
    tile.improvement = 'academy';
    const plain = explainTileYield(tile, ctx());
    slot(g.state, 0, 'workingEstates');
    slot(g.state, 0, 'masterArtificers');
    const paid = explainTileYield(tile, ctx());
    expect(paid).toHaveLength(plain.length + 2);
    const added = paid.slice(plain.length);
    expect(added.map((line) => line.source)).toEqual([
      'Order · Working Estates',
      'Order · Master Artificers',
    ]);
    expect(added[0]!.food).toBe(3);
    expect(added[0]!.gold).toBe(2);
    expect(added[1]!.production).toBe(6);
    expect(added[1]!.gold).toBe(6);
    // A holy site is a great person's work and is deliberately not one of these
    // five: the design doc's rule names the Academy, the Landmark, the
    // Manufactory, the Customs House and the Citadel, and nothing else.
    tile.improvement = 'holySite';
    expect(explainTileYield(tile, ctx()).length).toBeLessThan(paid.length);
    delete tile.improvement;
    expect(explainTileYield(tile, ctx())).toHaveLength(bare);
  });
});

// --- the doc -----------------------------------------------------------------

/**
 * **The worksheet's Scientific shelf** (`docs/orders-and-doctrines.md`). The
 * strict mirror — every live row on the shelf and every shelf row a live row —
 * is `statecraftDocSync.test.ts`'s, and D1b's rows land in that table in the
 * orchestrator's own edit. What is asked here is the half this fence can answer:
 * whatever the table already says about a row of this deck agrees with the row.
 */
describe('the worksheet’s Scientific shelf', () => {
  const docFiles = import.meta.glob('../../../docs/orders-and-doctrines.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const DOC = Object.values(docFiles)[0] as string;

  function shelfRows(): string[][] {
    const start = DOC.indexOf('### Scientific');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = DOC.indexOf('\n### ', start + '### Scientific'.length);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    const rows: string[][] = [];
    for (const line of section.split('\n')) {
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells[0] === 'Order' || cells.every((cell) => /^-+$/.test(cell))) continue;
      rows.push(cells);
    }
    return rows;
  }

  it('says of every row it carries exactly what that row says of itself', () => {
    const byName = new Map(DECK.map((id) => [orderDef(id).name, id] as const));
    for (const cells of shelfRows()) {
      const id = byName.get(cells[0]!);
      expect(id, `the shelf names "${cells[0]}", which is no row of this deck`).toBeDefined();
      const def = orderDef(id!);
      expect(def.effects.length, `${cells[0]} is deferred and on the shelf`).toBeGreaterThan(0);
      expect(Number(cells[1]), `${cells[0]} — band`).toBe(def.band);
      expect(cells[2], `${cells[0]} — rarity`).toBe(MARK[def.rarity]);
      expect(cells[4], `${cells[0]} — the row's own words`).toBe(def.text);
    }
  });
});
