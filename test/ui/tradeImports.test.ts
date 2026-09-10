/**
 * **The trade sheet knows The Silk Road** (batch R6, `docs/flags.md` item
 * (zzz)).
 *
 * The user's ruling: *"in the trade route menu: please note any luxury
 * resources that can be gained once that ability is unlocked. Also — add a new
 * recommendation section with routes to new unique luxuries once its
 * unlocked"*. Four claims come out of it and each fails silently:
 *
 *   1. **Every international pair says what it would bring**, and says it in
 *      *two voices* — a promise once the rule is held, and the wanting voice
 *      before, which is the half that teaches a player the ability exists.
 *   2. **The sheet reads the rule, never a second walk of it.** What a card
 *      promises has to be the kind the simulation would actually hand that road:
 *      the same exclusions (a kind we dig, a kind another road already carries)
 *      and the same one-per-route sweep. So the reader is pinned *against*
 *      `importedLuxuries` here — if the rule ever changes shape, this is what
 *      fails.
 *   3. **The new Recommended group is unique by kind**, best first: two markets
 *      holding wine are one wine, and offering both would recommend a second
 *      cart for a contentment it cannot pay twice.
 *   4. **A running road prints what it is carrying**, on its own row, so
 *      cancelling one is a decision a player can see the cost of.
 *
 * No jsdom in this suite (`vite.config.ts` — `environment: 'node'`), so the
 * drawing is read off the source exactly as `wantingVoice.test.ts` reads its
 * rule; everything else here is the pure half, which is why the pure half
 * exists.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { type City, type GameState, bumpRevision, createUnit } from '../../src/sim/state';
import { applyCommand } from '../../src/sim/commands';
import { tileIndex } from '../../src/sim/map';
import { EXPLORED } from '../../src/sim/visibility';
import { RULES } from '../../src/sim/rulesData';
import { importedLuxuries } from '../../src/sim/resourceEffects';
import { explainHappiness } from '../../src/sim/meters';
import { resourceDef } from '../../src/sim/resourceData';
import { stripRefs } from '../../src/sim/statecraft';
import { techDef } from '../../src/sim/techData';
import {
  importRuleTech,
  routesLendLuxuries,
  runningRouteImports,
  wouldImportFor,
} from '../../src/sim/routeImports';
import {
  type TradeContext,
  importedCopyWorth,
  recommendedGroups,
  routeCard,
  routeImportNote,
  routeModeTotal,
  runningRoutes,
  tradeContext,
} from '../../src/ui/tradeScreen';
import { at, bareState } from '../sim/improvementHelpers';

const SOURCES = import.meta.glob(['../../src/ui/tradeScreen.ts', '../../src/style.css'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) throw new Error(`${name} came back empty`);
  return text;
}

/** The technology that teaches the rule, and its name — never written down here. */
const RULE_TECH = importRuleTech()!;
const RULE_NAME = techDef(RULE_TECH).name;

/**
 * One empire of ours and three foreign markets: silk in the first, wine in the
 * next two.
 *
 * Every seam is opened by the one clause that needs no worker — **a town
 * standing on it** — which is `openedResource`'s last clause and the same
 * arrangement `treePass.test.ts` uses for the rule itself. Two wine markets, so
 * the group's uniqueness is a fact about the board rather than about how the
 * board happened to be built.
 *
 * Met by the clause that needs no paper (a piece of theirs in our sight) and
 * **found** (their centres written onto our chart), which is what a partner row
 * in `readRoutes` requires since batch R3.
 */
function world(): { state: GameState; home: City; silkTown: City; wineTown: City; wineFar: City } {
  const state = bareState(24, 9);
  // `bareState` seats the two empires at war; a caravan crosses a peaceful border.
  state.wars = [];
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const silkTown = foundCityAt(state, 1, at(state, 9, 4));
  const wineTown = foundCityAt(state, 1, at(state, 9, 8));
  const wineFar = foundCityAt(state, 1, at(state, 14, 4));
  at(state, 9, 4).resource = 'silk';
  at(state, 9, 8).resource = 'wine';
  at(state, 14, 4).resource = 'wine';
  home.buildings.push('market', 'market');
  state.players[0]!.gold = 5000;
  createUnit(state, 1, 'worker', 3, 3);
  for (const town of [silkTown, wineTown, wineFar]) {
    state.visibility[0]![tileIndex(state.map, town.col, town.row)] = EXPLORED;
  }
  bumpRevision(state);
  return { state, home, silkTown, wineTown, wineFar };
}

/** The rule, learnt. Every reading of it is memoised on the revision. */
function learn(state: GameState): void {
  state.players[0]!.techsResearched.push(RULE_TECH);
  bumpRevision(state);
}

/** The pair's row out of the sheet's one reading, or a thrown error naming it. */
function rowFor(ctx: TradeContext, from: City, to: City) {
  const row = ctx.rows.find((entry) => entry.from.id === from.id && entry.to.id === to.id);
  if (row === undefined) throw new Error(`no row ${from.name} → ${to.name}`);
  return row;
}

// --- 1. the reader against the rule -----------------------------------------

describe('the sheet’s reading of a loan', () => {
  it('is the rule’s own assignment, kind for kind', () => {
    const { state, home, silkTown, wineTown } = world();
    learn(state);
    for (const to of [silkTown, wineTown]) {
      const trader = createUnit(state, 0, 'trader', 3, 4);
      bumpRevision(state);
      const sent = applyCommand(state, {
        type: 'startRoute',
        playerId: 0,
        unitId: trader.id,
        fromCityId: home.id,
        toCityId: to.id,
      });
      expect(sent.ok, sent.ok ? '' : sent.error).toBe(true);
    }
    bumpRevision(state);
    // The finer reading (which road carries which kind) folds to the rule's own
    // list (which kinds the empire holds), in the resource table's order.
    const claims = runningRouteImports(state, 0);
    expect(claims).toHaveLength(2);
    expect([...claims].map((claim) => claim.id).sort()).toEqual(
      [...importedLuxuries(state, 0)].sort(),
    );
    // And every claim names a caravan of ours that is actually on the road.
    for (const claim of claims) {
      const unit = state.units.find((one) => one.id === claim.unitId);
      expect(unit?.ownerId).toBe(0);
      expect(unit?.trade).toBeDefined();
    }
  });

  it('answers for a pair that is not running, and never promises a kind twice', () => {
    const { state, home, silkTown, wineTown, wineFar } = world();
    learn(state);
    expect(wouldImportFor(state, 0, home, silkTown)).toBe('silk');
    expect(wouldImportFor(state, 0, home, wineTown)).toBe('wine');
    expect(wouldImportFor(state, 0, home, wineFar)).toBe('wine');
    // A road to the near wine market, and the far one has nothing left to bring:
    // the kind is spoken for, which is the rule's own exclusion and not a second
    // one written on the sheet.
    const trader = createUnit(state, 0, 'trader', 3, 4);
    bumpRevision(state);
    expect(
      applyCommand(state, {
        type: 'startRoute',
        playerId: 0,
        unitId: trader.id,
        fromCityId: home.id,
        toCityId: wineTown.id,
      }).ok,
    ).toBe(true);
    bumpRevision(state);
    expect(wouldImportFor(state, 0, home, wineFar)).toBeNull();
    expect(wouldImportFor(state, 0, home, silkTown)).toBe('silk');
  });

  it('brings nothing a border does not cross, and nothing this empire already digs', () => {
    const { state, home, silkTown } = world();
    learn(state);
    // Our own town: a road between two of our towns lends nothing at all.
    const ours = foundCityAt(state, 0, at(state, 3, 8));
    bumpRevision(state);
    expect(wouldImportFor(state, 0, home, ours)).toBeNull();
    // And a kind we hold ourselves is not a loan: the home town stands on silk.
    at(state, 3, 4).resource = 'silk';
    bumpRevision(state);
    expect(wouldImportFor(state, 0, home, silkTown)).toBeNull();
  });

  it('forecasts before the rule is learnt, and pays only after', () => {
    const { state, home, silkTown } = world();
    expect(routesLendLuxuries(state, 0)).toBe(false);
    // The forecast stands without the rule — it is what the road *would* fetch.
    expect(wouldImportFor(state, 0, home, silkTown)).toBe('silk');
    // Nothing is held, though, which is the rule's own answer.
    expect(importedLuxuries(state, 0)).toEqual([]);
    learn(state);
    expect(routesLendLuxuries(state, 0)).toBe(true);
  });
});

// --- 2. the card line -------------------------------------------------------

describe('the loan line on a card', () => {
  it('promises the kind, in half-copy words, once the rule is held', () => {
    const { state, home, silkTown } = world();
    learn(state);
    const ctx = tradeContext(state, 0);
    const row = rowFor(ctx, home, silkTown);
    const note = routeImportNote(ctx, row)!;
    expect(note.id).toBe('silk');
    expect(note.known).toBe(true);
    // The luxury is a keyword ref, and the words carry no figure at all — "half
    // a copy" is the share said in words (hard rule 7).
    expect(note.text).toContain('[[resource:silk|Silk]]');
    expect(stripRefs(note.text)).toBe('Brings Silk — half a copy');
    expect(stripRefs(note.text)).not.toMatch(/[0-9]/);
    // The card carries it, and the card is what the sheet draws from.
    expect(routeCard(ctx, row, row.modes[0]!).imports).toEqual(note);
  });

  it('says the same thing as a want before the rule, and names the technology', () => {
    const { state, home, silkTown } = world();
    const ctx = tradeContext(state, 0);
    const note = routeImportNote(ctx, rowFor(ctx, home, silkTown))!;
    expect(note.id).toBe('silk');
    expect(note.known).toBe(false);
    expect(note.text).toContain(`[[tech:${RULE_TECH}|${RULE_NAME}]]`);
    expect(stripRefs(note.text)).toBe(`Would bring Silk — needs ${RULE_NAME}`);
  });

  it('is nothing at all on a pair that would bring nothing', () => {
    const { state, home } = world();
    learn(state);
    const ours = foundCityAt(state, 0, at(state, 3, 8));
    bumpRevision(state);
    const ctx = tradeContext(state, 0);
    expect(routeImportNote(ctx, rowFor(ctx, home, ours))).toBeNull();
  });

  it('wears the wanting voice, and only when it is a want', () => {
    // The drawing, read off the source: one line, two classes, and the register
    // of surfaces in `wantingVoice.test.ts` holds the same string.
    expect(source('tradeScreen.ts')).toContain(
      "note.known ? 'trade-import' : 'trade-import wanting'",
    );
    // The mark takes the ink of the words beside it, so a want's mark is
    // vermilion too and there is no second rule to keep in step.
    expect(source('style.css')).toContain('.trade-import {');
    const rule = source('style.css').slice(source('style.css').indexOf('\n.trade-import {'));
    expect(rule.slice(0, rule.indexOf('}'))).not.toContain('color:');
  });
});

// --- 3. the Recommended group -----------------------------------------------

describe('the New luxuries group', () => {
  it('holds the roads that bring a kind we lack, best first and one road a kind', () => {
    const { state, home, silkTown, wineTown, wineFar } = world();
    learn(state);
    const ctx = tradeContext(state, 0);
    const group = recommendedGroups(ctx).find((entry) => entry.id === 'luxuries');
    expect(group).toBeDefined();
    expect(group!.note).toBeNull();
    const kinds = group!.rows.map((entry) => wouldImportFor(state, 0, entry.row.from, entry.row.to));
    // Silk and wine, once each — never both wine markets.
    expect(kinds).toContain('silk');
    expect(
      group!.rows.find((entry) => wouldImportFor(state, 0, entry.row.from, entry.row.to) === 'silk')!
        .row.to.id,
    ).toBe(silkTown.id);
    expect(kinds.filter((id) => id === 'wine')).toHaveLength(1);
    expect(new Set(kinds).size).toBe(kinds.length);
    // Best first, by the card's own score plus what the loan is worth.
    const scores = group!.rows.map(
      (entry) => routeModeTotal(entry.row, entry.mode) + importedCopyWorth(),
    );
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    // The wine road that made the cut is the better of the two, by that score.
    const wine = group!.rows.find(
      (entry) => wouldImportFor(state, 0, entry.row.from, entry.row.to) === 'wine',
    )!;
    const near = rowFor(ctx, home, wineTown);
    const far = rowFor(ctx, home, wineFar);
    const best =
      routeModeTotal(near, wine.mode) >= routeModeTotal(far, wine.mode) ? wineTown : wineFar;
    expect(wine.row.to.id).toBe(best.id);
    // Every card in the group is one of ours going abroad, and available.
    for (const entry of group!.rows) {
      expect(entry.row.available).toBe(true);
      expect(entry.row.to.ownerId).not.toBe(0);
    }
  });

  it('stands as a hint before the rule is known, with no cards under it', () => {
    const { state } = world();
    const group = recommendedGroups(tradeContext(state, 0)).find(
      (entry) => entry.id === 'luxuries',
    );
    expect(group).toBeDefined();
    expect(group!.rows).toEqual([]);
    expect(group!.note).toContain(`[[tech:${RULE_TECH}|${RULE_NAME}]]`);
    expect(stripRefs(group!.note!)).toBe(
      `Routes abroad will bring luxuries once ${RULE_NAME} is known`,
    );
  });

  it('does not appear at all where no road abroad would bring anything', () => {
    // Two towns of ours and nothing across a border: a heading over nothing is
    // the thing the Recommended tab's own rule forbids, hint or no hint.
    const state = bareState(24, 9);
    const home = foundCityAt(state, 0, at(state, 3, 4));
    foundCityAt(state, 0, at(state, 9, 4));
    home.buildings.push('market', 'market');
    state.players[0]!.gold = 5000;
    bumpRevision(state);
    const ids = recommendedGroups(tradeContext(state, 0)).map((group) => group.id);
    expect(ids).not.toContain('luxuries');
  });

  it('prices a borrowed copy the way the happiness meter does', () => {
    // The meter's own line for a loan, on a board where one is actually held —
    // the figure the group ranks by is the one the empire is paid.
    const { state, home, silkTown } = world();
    learn(state);
    const trader = createUnit(state, 0, 'trader', 3, 4);
    bumpRevision(state);
    expect(
      applyCommand(state, {
        type: 'startRoute',
        playerId: 0,
        unitId: trader.id,
        fromCityId: home.id,
        toCityId: silkTown.id,
      }).ok,
    ).toBe(true);
    bumpRevision(state);
    const line = explainHappiness(state, 0).find(
      (entry) => entry.source === `${resourceDef('silk').name} · on loan`,
    );
    expect(line).toBeDefined();
    expect(importedCopyWorth()).toBe(line!.value);
    // And it is the share the data sets, never a whole seam.
    expect(importedCopyWorth()).toBeLessThan(RULES.meters.happiness.perUniqueLuxury);
    expect(importedCopyWorth()).toBeGreaterThan(0);
  });
});

// --- 4. the running ledger --------------------------------------------------

describe('a running road’s row', () => {
  it('carries the kind it is fetching, and nothing before the rule', () => {
    const { state, home, silkTown } = world();
    const trader = createUnit(state, 0, 'trader', 3, 4);
    bumpRevision(state);
    expect(
      applyCommand(state, {
        type: 'startRoute',
        playerId: 0,
        unitId: trader.id,
        fromCityId: home.id,
        toCityId: silkTown.id,
      }).ok,
    ).toBe(true);
    bumpRevision(state);
    // The road runs, but nothing comes home until the rule is learnt.
    expect(runningRoutes(state, 0).map((route) => route.importId)).toEqual([null]);
    learn(state);
    const rows = runningRoutes(state, 0);
    expect(rows.map((route) => route.importId)).toEqual(['silk']);
    // The row's kind is the caravan's own claim, not the empire's list.
    expect(rows[0]!.unitId).toBe(runningRouteImports(state, 0)[0]!.unitId);
  });

  it('draws the mark beside the name on the row', () => {
    const text = source('tradeScreen.ts');
    expect(text).toContain("const brings = element('span', 'trade-import is-row');");
    expect(text).toContain('brings.append(resourceMarkNode(route.importId));');
  });
});
