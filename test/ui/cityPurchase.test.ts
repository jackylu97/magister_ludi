/**
 * Two promises the city screen makes that only a source read can hold still,
 * both from the 2026-08-26 playtest (ledger Entry XXIX).
 *
 *   1. **A purchase-only thing is not a build row.** The augur used to sit in
 *      the "Add to queue" grid, greyed, answering "why can I not build this"
 *      with "because it is not built" — which is not an answer, it is a
 *      category error. The panel now filters the unit list with
 *      `isPurchaseOnly` and offers the augur in the bank it is actually sold
 *      in. The failure mode of forgetting is a row that looks broken rather than
 *      one that errors, so no behavioural test sees it.
 *   2. **Every buildable row carries its price in coin.** A tag that exists for
 *      units and not buildings (or the other way round) is the sort of gap that
 *      reads as a missing feature for a milestone.
 *
 * Plus the one thing item 3 of that playtest asked for, and the only way to make
 * it stay asked for: a belief's **axis has no name**. Keeping the table free of
 * a name field is what leaves nowhere for one to be printed from — an assertion
 * about the shape rather than about any one surface, which is what makes it
 * survive the next screen that draws a card.
 */

import { describe, expect, it } from 'vitest';

import { AXIS_MARK } from '../../src/ui/religionScreen';
import { buildListModel } from '../../src/ui/cityPanel';
import { BELIEF_AXES } from '../../src/sim/religionData';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { foundCityAt } from '../../src/sim/cities';
import { createGame } from '../sim/newGameHelpers';
import { getTileAt } from '../../src/sim/map';
import { explainContribution } from '../../src/sim/purchase';
import { playerById, bumpRevision } from '../../src/sim/state';
import { TECH_IDS } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';

/** The one row in the table that takes contributions. Found by its marker. */
const CONSECRATOR = BUILDING_IDS.find(
  (id) => buildingDef(id).acceptsContributions === true,
)!;

function game() {
  return createGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

/** The panel's own text, read through Vite's raw glob (`seatRoster.test.ts`). */
const SOURCES = import.meta.glob(
  ['../../src/ui/cityPanel.ts', '../../src/ui/priceCell.ts', '../../src/style.css'],
  {
    eager: true,
    query: '?raw',
    import: 'default',
  },
) as Record<string, string>;

function fileSource(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

function panelSource(): string {
  return fileSource('cityPanel.ts');
}

describe('the build list and the price tags', () => {
  it('filters purchase-only types out of the unit rows', () => {
    const source = panelSource();
    expect(source).toMatch(/isPurchaseOnly\(\{ kind: 'unit', id \}\)/);
    // …and offers them instead, in the bank the roster row names.
    expect(source).toMatch(/purchaseVerb\(item\)/);
  });

  it('prices every unit row and every building row, wonders included, and no project', () => {
    // Every row of the add list has a cell in the price column since batch UX5
    // (the user's A1 ruling). A **wonder** gets one too: the gate refuses it in
    // most towns ("a wonder must be built, not bought") and the cell is then a
    // dash, but a card may open a bank for one (The Gilded Scaffold, the Valley
    // of Kings, Magnificence), and a row that withheld its cell could never
    // show that price.
    // A project is a conversion that never completes, so nothing can buy one.
    const g = game();
    const settler = g.state.units.find((u) => u.ownerId === 0 && unitDef(u.type).foundsCity)!;
    const city = foundCityAt(g.state, 0, getTileAt(g.state.map, settler.col, settler.row)!);
    playerById(g.state, 0)!.techsResearched = [...TECH_IDS];
    bumpRevision(g.state);
    const rows = buildListModel(g.state, city, 0, 'all', false).flatMap((shelf) => shelf.rows);
    // Not vacuous: the list holds all three kinds.
    expect(rows.some((row) => row.kind === 'unit')).toBe(true);
    expect(rows.some((row) => row.kind === 'building' && row.wonder)).toBe(true);
    expect(rows.some((row) => row.kind === 'project')).toBe(true);
    for (const row of rows) {
      if (row.kind === 'project') expect(row.cells, row.name).toEqual([]);
      else expect(row.cells.length, row.name).toBeGreaterThan(0);
    }
  });

  it('prices and gates a cell with the reducer’s own two functions', () => {
    // The figure is the price evaluator's fold and the gate is the command's own
    // sentence, so a price a player can press is a command the reducer takes.
    // Asked in one place, the price column's bridge to the purchase gate.
    const cell = fileSource('priceCell.ts');
    expect(cell).toMatch(/explainPurchaseCost\(state, playerId, cityId, item, bank\)/);
    expect(cell).toMatch(/purchaseError\(state, playerId, cityId, item, bank\)/);
    expect(panelSource()).toMatch(/purchaseLook\(state, seat, city\.id, item, bank\)/);
  });

  it('states the conversion in the caption, read off the rules', () => {
    // What a caption can say that no single price can is the rule behind every
    // gold price on the list, and that is read off the rules rather than typed.
    // The treasury itself is in the band and the price column's heading since
    // the user's ruling of 2026-10-12 (`cityScreen.test.ts` pins where).
    const source = panelSource();
    expect(source).not.toMatch(/in the treasury/);
    expect(source).toMatch(/RULES\.production\.goldPerHammer/);
    // And the culture rate, for the one price that is not the full cost
    // (Magnificence, Magisterial batch MG11).
    expect(source).toMatch(/RULES\.production\.culturePerHammer/);
  });
});

describe('a belief’s axis has no word', () => {
  it('carries a glyph and nothing else, for every axis', () => {
    for (const axis of BELIEF_AXES) {
      const mark = AXIS_MARK[axis];
      expect(Object.keys(mark), axis).toEqual(['glyph']);
      expect(mark.glyph, axis).toBeTruthy();
    }
  });
});


/**
 * The Cathedral's two contribute buttons (design ledger Entry LV).
 *
 * The same instrument as everything above — no jsdom in this suite — plus the
 * one half of the gate that *is* pure: whether the offer exists at all is
 * `explainContribution`'s answer, and the panel draws a button exactly when it
 * is non-null. So the visibility rule is asserted against the simulation and the
 * wiring is read off the source.
 */
describe('the contribute buttons', () => {
  it('prices and greys with the reducer’s own two functions', () => {
    const source = panelSource();
    expect(source).toMatch(/explainContribution\(state, seat, city\.id, currency\)/);
    expect(source).toMatch(/contributeError\(state, seat, city\.id, currency\)/);
    // And it sends the command the gate was asked about, never a purchase.
    expect(source).toMatch(/type: 'contribute'/);
  });

  it('draws nothing at all when neither bank has an offer', () => {
    // `return any ? row : null` — an empty pair of controls on every city panel
    // in the game would be two buttons that only ever mean "not here".
    const source = panelSource();
    expect(source).toMatch(/const offer = explainContribution\([\s\S]{0,80}?\);\s*if \(!offer\) continue;/);
    expect(source).toMatch(/return any \? row : null;/);
    // Hung under the production bar, which is the front row the basket pays for.
    expect(source).toMatch(/const banks = contributeRow\(city, locked\);/);
  });

  it('wears a plate the stylesheet actually draws', () => {
    const css = fileSource('style.css');
    expect(css).toMatch(/\.city-contribute \{/);
    expect(css).toMatch(/\.city-contribute-button \{/);
    expect(css).toMatch(/\.city-contribute-button:disabled \{/);
  });

  it('offers a bank only while the front row takes it and the bank can pay', () => {
    const g = game();
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const city = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!);
    const player = playerById(g.state, 0)!;
    player.gold = 500;
    bumpRevision(g.state);
    player.faithPool = 500;
    bumpRevision(g.state);

    // Nothing queued: no offer in either bank.
    city.queue.length = 0;
    expect(explainContribution(g.state, 0, city.id, 'gold')).toBeNull();
    expect(explainContribution(g.state, 0, city.id, 'faith')).toBeNull();

    // A row that does not declare it: still nothing.
    city.queue.push({ kind: 'building', id: 'granary' });
    expect(explainContribution(g.state, 0, city.id, 'gold')).toBeNull();

    // The declaring row: both banks offer.
    city.queue.length = 0;
    city.queue.push({ kind: 'building', id: CONSECRATOR });
    city.hammerBasket = 0;
    expect(explainContribution(g.state, 0, city.id, 'gold')).not.toBeNull();
    expect(explainContribution(g.state, 0, city.id, 'faith')).not.toBeNull();

    // An empty purse withdraws that button and leaves the other one standing.
    player.gold = 0;
    bumpRevision(g.state);
    expect(explainContribution(g.state, 0, city.id, 'gold')).toBeNull();
    expect(explainContribution(g.state, 0, city.id, 'faith')).not.toBeNull();
  });
});
