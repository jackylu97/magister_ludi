/**
 * **The trade sheet no longer shows a road's luxury loan** (batch TT1,
 * `docs/flags.md` item (iiiiiii)).
 *
 * Batch R6 (`docs/flags.md` (zzz)) taught the sheet The Silk Road's loan: every
 * international pair said which luxury it would bring home, a "New luxuries"
 * group on the Recommended tab ranked those roads, and a running road's row
 * named the kind it carried. The user's ruling of 2026-11-10 cut the loan
 * (*"The Silk Road no longer lends a luxury for each foreign route"*), so all
 * three left the sheet with the rule.
 *
 * What this file holds now:
 *
 *   1. **A road abroad lends nothing**, even with The Silk Road known.
 *   2. **The Capitulations' posts still lend**, at the share the data sets. That
 *      is the one loan left (`postsLendLuxuries`).
 *   3. **The sheet has no loan line, no "New luxuries" group and no mark on a
 *      running row.** No jsdom in this suite (`vite.config.ts` — `environment:
 *      'node'`), so the drawing is read off the source.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { type City, type GameState, bumpRevision, createUnit } from '../../src/sim/state';
import { applyCommand } from '../../src/sim/commands';
import { tileIndex } from '../../src/sim/map';
import { EXPLORED } from '../../src/sim/visibility';
import { RULES } from '../../src/sim/rulesData';
import { importedLuxuries, luxuryLoans } from '../../src/sim/resourceEffects';
import { postTermTurns } from '../../src/sim/routes';
import { explainHappiness } from '../../src/sim/meters';
import { resourceDef } from '../../src/sim/resourceData';
import { recommendedGroups, runningRoutes, tradeContext } from '../../src/ui/tradeScreen';
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

/**
 * One empire of ours and three foreign markets: silk in the first, wine in the
 * next two.
 *
 * Every seam is opened by the one clause that needs no worker — **a town
 * standing on it** — which is `openedResource`'s last clause. Met by the clause
 * that needs no paper (a piece of theirs in our sight) and **found** (their
 * centres written onto our chart), which is what a partner row in `readRoutes`
 * requires since batch R3.
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
  // The technology that used to teach the loan. It still opens the Caravanserai.
  state.players[0]!.techsResearched.push('silkRoad');
  createUnit(state, 1, 'worker', 3, 3);
  for (const town of [silkTown, wineTown, wineFar]) {
    state.visibility[0]![tileIndex(state.map, town.col, town.row)] = EXPLORED;
  }
  bumpRevision(state);
  return { state, home, silkTown, wineTown, wineFar };
}

/** Sends one caravan of ours from `from` to `to` through the reducer. */
function send(state: GameState, from: City, to: City): void {
  const trader = createUnit(state, 0, 'trader', 3, 4);
  bumpRevision(state);
  const sent = applyCommand(state, {
    type: 'startRoute',
    playerId: 0,
    unitId: trader.id,
    fromCityId: from.id,
    toCityId: to.id,
  });
  expect(sent.ok, sent.ok ? '' : sent.error).toBe(true);
  bumpRevision(state);
}

describe('a road abroad lends no luxury (batch TT1)', () => {
  it('brings nothing home, with The Silk Road known and two roads running', () => {
    const { state, home, silkTown, wineTown } = world();
    send(state, home, silkTown);
    send(state, home, wineTown);
    expect(importedLuxuries(state, 0)).toEqual([]);
    expect(luxuryLoans(state, 0)).toEqual([]);
    expect(explainHappiness(state, 0).some((line) => line.source.includes('on loan'))).toBe(false);
  });
});

describe('The Capitulations’ posts still lend', () => {
  it('lends one kind for each foreign town holding the post, and a road adds nothing', () => {
    const { state, home, silkTown, wineTown, wineFar } = world();
    const sc = state.players[0]!.statecraft;
    sc.orders.push('theCapitulations' as never);
    sc.slots.push({ card: 'theCapitulations' as never, sealedUntil: state.turn });
    const established = state.turn - postTermTurns();
    wineTown.posts = [{ by: 0, since: established }];
    wineFar.posts = [{ by: 0, since: established }];
    // A road to the silk market, which used to bring the silk home.
    send(state, home, silkTown);
    // The first post town lends its wine; the second has nothing left to lend.
    expect(luxuryLoans(state, 0).map((loan) => loan.id)).toEqual(['wine']);
    expect(importedLuxuries(state, 0)).toEqual(['wine']);
    // At the share the data sets, never a whole seam.
    const line = explainHappiness(state, 0).find(
      (entry) => entry.source === `${resourceDef('wine').name} · on loan`,
    );
    expect(line).toBeDefined();
    expect(line!.value).toBe(
      Math.floor((RULES.meters.happiness.perUniqueLuxury * RULES.trade.importedLuxuryPercent) / 100),
    );
  });
});

describe('the sheet shows no loan', () => {
  it('builds no New luxuries group', () => {
    const { state } = world();
    const ids = recommendedGroups(tradeContext(state, 0)).map((group) => group.id as string);
    expect(ids).not.toContain('luxuries');
  });

  it('puts no kind on a running road’s row', () => {
    const { state, home, silkTown } = world();
    send(state, home, silkTown);
    const rows = runningRoutes(state, 0);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]!)).not.toContain('importId');
  });

  it('draws no loan line, and keeps no style for one', () => {
    expect(source('tradeScreen.ts')).not.toContain('trade-import');
    expect(source('tradeScreen.ts')).not.toContain('New luxuries\'');
    expect(source('style.css')).not.toContain('.trade-import');
    expect(source('style.css')).not.toContain('.trade-purpose-note');
  });
});
