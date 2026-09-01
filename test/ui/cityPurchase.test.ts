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
import { BELIEF_AXES } from '../../src/sim/religionData';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { foundCityAt } from '../../src/sim/cities';
import { createGame } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import { explainContribution } from '../../src/sim/purchase';
import { playerById } from '../../src/sim/state';

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
const SOURCES = import.meta.glob(['../../src/ui/cityPanel.ts', '../../src/style.css'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

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

  it('gives a unit row and a building row a tag, and a project or a wonder none', () => {
    const source = panelSource();
    // The rows are built through one helper, so the three call sites say which
    // of them is priced. A project never completes, so there is nothing to buy;
    // a **wonder** is refused by `purchaseError` outright (it is built, not
    // bought), so its row withholds the tag rather than offering a price the
    // reducer will not honour.
    expect(source).toMatch(/row\(button, \{ kind: 'unit', id \}\)/);
    expect(source).toMatch(/row\(button, wonder \? undefined : \{ kind: 'building', id \}\)/);
    expect(source).toMatch(/\n\s*row\(button\);/);
  });

  it('prices and greys the tag with the reducer’s own two functions', () => {
    const source = panelSource();
    // The figure is the price evaluator's fold and the blocker is the command's
    // own sentence — so a tag a player can press is a command the reducer takes.
    expect(source).toMatch(/explainPurchaseCost\(state, seat, city\.id, item, currency\)/);
    expect(source).toMatch(/purchaseError\(state, seat, city\.id, item, currency\)/);
  });

  it('states the conversion in the caption, and the treasury nowhere', () => {
    // The caption used to lead with `Player.gold`, on the Buy Tiles caption's
    // precedent. That precedent stopped holding the day the top bar grew a gold
    // chip (user, 2026-08-27): the figure is on screen a hand's width above
    // this, and a second copy is a number a player has to check against itself.
    // What a caption *can* say that no price tag can is the rule behind every
    // tag on the grid, and that is read off the rules rather than typed.
    const source = panelSource();
    expect(source).not.toMatch(/in the treasury/);
    expect(source).toMatch(/RULES\.production\.goldPerHammer/);
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
    player.faithPool = 500;

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
    expect(explainContribution(g.state, 0, city.id, 'gold')).toBeNull();
    expect(explainContribution(g.state, 0, city.id, 'faith')).not.toBeNull();
  });
});
