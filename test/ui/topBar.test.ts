/**
 * The top bar's headline and the phase that actually banks the gold read one
 * list.
 *
 * Bug report, 2026-08-29: The Great Litany's culture (`rateConversion`, +1
 * culture per 3 faith gained per turn) banked into `player.culturePool` every
 * turn — `collectYields` folds `explainEmpireCardYields` — but the strip's
 * `readEmpire` summed only city yields, the luxury signatures and the four
 * trade-gold lines, so the printed per-turn culture was short by exactly the
 * card lines while the pool filled by the true amount. What matters is not
 * this one card: it is that the headline and the resolution can no longer
 * drift, because they are now the same call.
 */

import { describe, expect, it } from 'vitest';

import { foldCardYields } from '../../src/sim/statecraft';
import {
  emptyCityYields,
} from '../../src/sim/cities';
import {
  empirePercents,
} from '../../src/sim/yields/town';
import {
  explainEmpireCardYields,
  stageEmpireFold,
} from '../../src/sim/yields/empire';
import { readEmpire } from '../../src/sim/readings';
import { game, found } from '../sim/statecraftHelpers';

const SOURCES = import.meta.glob(
  [
    '../../src/sim/cities.ts',
    '../../src/sim/yields/empire.ts',
    '../../src/sim/readings.ts',
    '../../src/ui/topBar.ts',
    '../../src/ui/hudDock.ts',
    '../../src/art/dockMarks.ts',
    '../../src/flairGallery/marks.ts',
  ],
  {
    eager: true,
    query: '?raw',
    import: 'default',
  },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

describe('readEmpire carries the empire-scale card lines', () => {
  it('The Great Litany’s culture is in the headline, not only in the pool', () => {
    const g = game();
    const city = found(g.state, 0);
    // Two faith buildings, three faith a turn — enough for one helping of the
    // Litany's "+1 culture per 3 faith gained per turn".
    city.buildings.push('shrine', 'temple');
    g.state.players[0]!.statecraft.doctrines.push('greatLitany');

    const cardCulture = foldCardYields(explainEmpireCardYields(g.state, 0)).culture;
    expect(cardCulture).toBeGreaterThan(0);
    // **Staged, since batch H19** (`docs/flags.md` oo): the empire's additive
    // lines fold and the meters multiply that fold once, so what the headline
    // gains is the card's line through the empire stage — this bench sits a
    // contentment tier up, and the culture it banks is the tenth more. Read
    // through the simulation's own multiplication rather than restated here.
    const banked = stageEmpireFold(
      { ...emptyCityYields(), culture: cardCulture },
      empirePercents(g.state, 0),
    ).culture;
    expect(banked).toBeGreaterThan(cardCulture);

    // The headline moves by exactly the card fold when the doctrine is the
    // only thing that changes — a fresh, otherwise-identical game rather than
    // mutating this one and re-reading, so the comparison cannot be fooled by
    // a stale cache.
    const withoutDoctrine = (() => {
      const bare = game();
      const c = found(bare.state, 0);
      c.buildings.push('shrine', 'temple');
      return readEmpire(bare.state, 0).totals.culture;
    })();
    expect(readEmpire(g.state, 0).totals.culture - withoutDoctrine).toBe(banked);
  });

  it('reads the same helper `collectYields` banks with, by source', () => {
    // **One list since batch H19**, and the same one on both sides: the four
    // folds `collectYields` used to bank one loop at a time are
    // `explainEmpireLines`, the card lines among them, and the headline reads
    // that list rather than a fold of its own.
    // The phase's own call, inside `collectYields`.
    // `yields/empire.ts` since batch E3b: the phase and the list it banks moved
    // together, which is the whole point of the layer.
    expect(source('yields/empire.ts')).toMatch(/explainEmpireLines\(state, player\.id\)/);
    expect(source('yields/empire.ts')).toMatch(/foldEmpireLines\(lines\)/);
    // The headline's call, inside `readEmpire` — through `readEmpire` since batch
    // E2, which is the same list taken once for the whole revision and shared
    // with the Ledger, the panel and the bot. The claim is unchanged and is
    // stronger: the strip does not merely call the same helper, it reads the
    // very object the other surfaces read.
    expect(source('topBar.ts')).toMatch(/readEmpire\(state, playerId\)\.totals/);
    expect(source('readings.ts')).toMatch(/explainEmpireLines\(state, playerId, empire\)/);
    expect(source('readings.ts')).toMatch(/foldEmpireLines\(lines\)/);
  });
});

/**
 * **The age card** (batch G1, `docs/wager.md` §1).
 *
 * The one chip on the strip that is not about the local empire: the world's age
 * is held in common, and the countdown on it is the deadline a wager (G2) is
 * played to — "a wager with a hidden deadline is a coin toss" is the user's own
 * reading. Source-reading, like every other register in `test/ui`: this suite
 * runs without a DOM, and what is pinned is that the bar *asks the simulation*
 * rather than keeping a second clock of its own.
 */
describe("the top bar's age card", () => {
  it('reads the world clock rather than deriving an age of its own', () => {
    const bar = source('topBar.ts');
    // The two folds off `GameState.ageClose`, asked by name. A bar that read
    // the seats' technologies and averaged them itself would be the second
    // clock this batch removed — right up until the day a rule moved.
    expect(bar).toMatch(
      /import \{ currentWorldAge, worldAgeCountdown \} from '\.\.\/sim\/worldClock'/,
    );
    expect(bar).toMatch(/worldAgeCountdown\(state\)/);
    expect(bar).toMatch(/eraNumeral\(currentWorldAge\(state\)\)/);
  });

  it('prints the age always and the countdown only while one runs', () => {
    const bar = source('topBar.ts');
    // The sentence is the strip's business and the number is the simulation's,
    // which is every other chip's split. `figure` is what prints the count, and
    // the chip's own face is already tabular mono (`.civ-yield`, `style.css`).
    expect(bar).toContain('closes in ${figure(countdown.turnsLeft)} turn');
    // A chip bound to the shared info card like its neighbours, and no button:
    // there is no age screen to open.
    expect(bar).toMatch(/info\.bind\(ageItem, \(\) => ageCard\(\)\)/);
    expect(bar).not.toMatch(/ageItem\.addEventListener/);
  });

  it('shows every empire its own age, because the world clock is a mean', () => {
    const bar = source('topBar.ts');
    // "Why has the age not turned over yet" is a question about the *other*
    // empires once the clock is an average, so the card prints the summands.
    const card = bar.slice(bar.indexOf('function ageCard()'));
    const body = card.slice(0, card.indexOf('\n  }\n'));
    expect(body).toContain('realPlayers(state)');
    expect(body).toContain('highestAge(seat.techsResearched)');
 * **The routes chip wears a drawn cart** (batch R2, `docs/flags.md` item (iii)).
 *
 * The user's ruling of 2026-09-09 asks for an icon for the Trade sheet beside
 * the other three doors. The chip at the end of the yield strip is the sheet's
 * older door and it wore a typed `⇄` — a pair of arrows meaning "exchange in
 * the abstract" — where every other mark in this strip is path data traced into
 * a mask. One drawing now serves both doors, and a typed glyph creeping back is
 * the failure this pins: it would show as an emoji beside six drawn marks, and
 * nothing would throw.
 */
describe('the routes chip’s mark', () => {
  it('is the drawn cart, masked in the strip’s own ink', () => {
    const bar = source('topBar.ts');
    expect(bar).toContain("import { tradeMarkDataUri } from '../art/dockMarks';");
    expect(bar).toContain("const icon = element('span', 'civ-yield-icon civ-yield-mark');");
    expect(bar).toContain("icon.style.setProperty('--civ-mark', `url(\"${tradeMarkDataUri()}\")`);");
    // The typed glyph is gone from the chip.
    expect(bar).not.toContain("element('span', 'civ-yield-icon', '⇄')");
  });

  it('is one drawing, worn by the chip and by the dock button alike', () => {
    // The dock's fourth button — the user's own words: *"The trade screen should
    // have an icon next to the statecraft/religion/diplomacy buttons"*. Both
    // doors take `tradeMarkDataUri`, so a redrawn cart moves in both places.
    expect(source('hudDock.ts')).toContain("tradeMarkDataUri()");
    expect(source('dockMarks.ts')).toContain('export const TRADE_MARK');
    // Same grid and same weight as its two neighbours: no fifth mask mechanism.
    expect(source('dockMarks.ts')).toContain(
      'return markSvg(TRADE_MARK.paths, YIELD_MARK_BOX, YIELD_MARK_STROKE, color);',
    );
  });

  it('joins the flair gallery in the pass that ships it', () => {
    // CLAUDE.md's rule: a new visual asset joins the cabinet the same pass.
    const marks = source('marks.ts');
    expect(marks).toContain('tradeMarkDataUri');
    expect(marks).toContain("markCell(grid, 'trade', tradeMarkDataUri()");
  });
});
