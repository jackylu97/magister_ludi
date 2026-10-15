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
import { seatName } from '../../src/sim/leaderData';
import { renownThreshold } from '../../src/sim/renown';
import { BEAD_RULES } from '../../src/sim/beadData';
import { tabFigures, turnLineOf } from '../../src/ui/topBar';
import { game, found } from '../sim/statecraftHelpers';
import { newGame } from '../sim/newGameHelpers';

const SOURCES = import.meta.glob(
  [
    '../../src/sim/cities.ts',
    '../../src/sim/yields/empire.ts',
    '../../src/sim/readings.ts',
    '../../src/ui/topBar.ts',
    '../../src/ui/hudDock.ts',
    '../../src/ui/tutorial.ts',
    '../../src/main.ts',
    '../../src/style.css',
    '../../index.html',
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
 * **The turn line and its age card** (batch G1, `docs/wager.md` §1; regrouped
 * into the middle of the bar by batch UX1).
 *
 * The age is the one thing on the bar that is not about the local empire: the
 * world's age is held in common, and the countdown on it is the deadline a
 * wager is played to. What is pinned is that the bar asks the simulation rather
 * than keeping a clock of its own, and (through `turnLineOf`, on a real state)
 * what the line says.
 */
describe("the top bar's turn line", () => {
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
    // The line prints the count short ("9 left"); the accessible name says it
    // in full. `figure` prints both, in the bar's tabular mono.
    expect(bar).toContain('`${figure(countdown.turnsLeft)} left`');
    expect(bar).toContain('closes in ${figure(countdown.turnsLeft)} turn');
    // The age card hangs on the line, and the line is no button: there is no
    // age screen to open.
    expect(bar).toMatch(/info\.bind\(turnItem, \(\) => ageCard\(\)\)/);
    expect(bar).not.toMatch(/turnItem\.addEventListener/);
  });

  it('shows every empire its own age, because the world clock is a mean', () => {
    const bar = source('topBar.ts');
    // "Why has the age not turned over yet" is a question about the *other*
    // empires once the clock is an average, so the card prints the summands.
    const card = bar.slice(bar.indexOf('function ageCard()'));
    const body = card.slice(0, card.indexOf('\n  }\n'));
    expect(body).toContain('realPlayers(state)');
    expect(body).toContain('highestAge(seat.techsResearched)');
  });

  it('says the turn and the age, and no countdown before any age closes', () => {
    const state = twoHumans();
    const line = turnLineOf(state, 0);
    expect(line.turn).toBe(`Turn ${state.turn}`);
    expect(line.age).toBe('Æra I');
    expect(line.left).toBeNull();
    expect(line.waiting).toBeNull();
    expect(line.spoken).toBe(`Turn ${state.turn}, Æra I`);
  });

  it('counts the turns left while the age is closing', () => {
    const state = twoHumans();
    state.ageClose = { age: 1, turn: state.turn + 9 };
    const line = turnLineOf(state, 0);
    expect(line.age).toBe('Æra I');
    expect(line.left).toBe('9 left');
    expect(line.spoken).toBe(`Turn ${state.turn}, Æra I, the age closes in 9 turns`);
    state.ageClose = { age: 1, turn: state.turn + 1 };
    expect(turnLineOf(state, 0).spoken).toContain('closes in 1 turn');
    expect(turnLineOf(state, 0).spoken).not.toContain('1 turns');
  });

  it('names who the turn waits for once this seat has ended it, and never the wild', () => {
    const state = twoHumans();
    state.turnEnded[0] = true;
    const line = turnLineOf(state, 0);
    expect(line.waiting).toBe(`Waiting: ${seatName(state, 1)}`);
    expect(line.spoken).toBe(`Turn ${state.turn}, Waiting: ${seatName(state, 1)}`);
    // The seat still playing sees the age, not a waiting list.
    expect(turnLineOf(state, 1).waiting).toBeNull();
    // Everybody done: the turn is resolving, and nobody is named.
    state.turnEnded[1] = true;
    expect(turnLineOf(state, 0).waiting).toBe('resolving');
  });
});

/**
 * **The bar, left to right** (batch UX1, `docs/plans/hud-empire-panel-spec.md`
 * §2): the six yields and the meters chip, the turn line, the seat strip, the
 * three tabs, then ? and ☰. The markup holds the containers in that order and
 * `topBar.ts` fills them; the Abacus, the Lens, the chronicle and the
 * Compendium have left the bar.
 */
describe('the top bar, left to right', () => {
  const html = source('index.html');
  const start = html.indexOf('<header id="topbar">');
  const header = html.slice(start, html.indexOf('</header>', start));

  it('holds its items in reading order', () => {
    const order = [
      'id="civ-yields"',
      'id="status"',
      'id="seat-strip"',
      'id="topbar-tabs"',
      'id="help-button"',
      'id="menu-button"',
    ].map((marker) => header.indexOf(marker));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('has let the Abacus, the Lens, the chronicle and the Compendium go', () => {
    for (const gone of ['abacus-button', 'lens-button', 'log-button', 'compendium-button']) {
      expect(header, gone).not.toContain(`id="${gone}"`);
    }
    // Two buttons are left at the right end, and nothing else.
    const tools = header.slice(header.indexOf('class="topbar-tools"'));
    expect(tools.match(/<button/g)).toHaveLength(2);
  });

  it('keeps the seat strip out of the way until a hot-seat game shows it', () => {
    expect(header).toContain('<div id="seat-strip" class="seats" hidden></div>');
    expect(source('style.css')).toMatch(/\.seats\[hidden\],\n\.seats:empty \{\s*display: none;/);
  });

  it('fills the strip with the six yields and then the meters chip, and nothing else', () => {
    const bar = source('topBar.ts');
    // The renown, routes, bead and age chips are gone from the strip.
    for (const gone of [
      "'civ-yield is-renown'",
      "'civ-yield is-routes civ-yield-routes'",
      "'civ-yield is-beads'",
      "'civ-yield is-age'",
    ]) {
      expect(bar, gone).not.toContain(gone);
    }
    // Every yield chip and the meters chip are appended to the strip, in that
    // order.
    expect(bar).toContain('    container.append(item);');
    expect(bar).toContain('  container.append(meters);');
    expect(bar.indexOf('    container.append(item);')).toBeLessThan(
      bar.indexOf('  container.append(meters);'),
    );
    expect(bar.match(/container\.append\(/g)).toHaveLength(2);
  });

  it('opens the Ledger from all six yields, culture included', () => {
    const bar = source('topBar.ts');
    expect(bar).not.toContain('onOpenStatecraft');
    expect(bar).toContain("item.addEventListener('click', () => onOpenLedger(key));");
    expect(source('main.ts')).not.toContain('onOpenStatecraft');
  });

  it('builds the three tabs in order: Diplomacy, Trade, Standings', () => {
    const bar = source('topBar.ts');
    expect(bar).toContain('tabs.replaceChildren(diplomacyTab, tradeTab, standingsGroup);');
    expect(bar).toContain('standingsGroup.append(standingsTab, renownItem, beadsItem);');
    // Each tab says its own name, which stays readable to a screen reader when
    // the stylesheet hides it below about 1200 px.
    for (const name of ['Diplomacy', 'Trade', 'Standings']) {
      expect(bar).toContain(`tabLabel('${name}')`);
    }
  });
});

/**
 * **Each tab's door.** Every tab is a real button (Standings is a group of
 * three), so Enter and Space press it with no handler of its own, and each
 * names the sheet it opens in `aria-controls`.
 */
describe('the tabs and their doors', () => {
  const bar = source('topBar.ts');
  const main = source('main.ts');

  it('opens Diplomacy from its tab, through the same door W uses', () => {
    expect(bar).toContain("sheetButton('topbar-tab is-diplomacy', 'diplomacy-overlay')");
    expect(bar).toContain("if (onOpenDiplomacy) diplomacyTab.addEventListener('click', () => onOpenDiplomacy());");
    expect(main).toContain('onOpenDiplomacy: () => openScreen(() => diplomacy?.open()),');
    expect(main).toContain('trigger: civYields.diplomacyTab,');
  });

  it('opens Trade from its tab, which carries the routes figure and its ledger card', () => {
    expect(bar).toContain("sheetButton('topbar-tab is-trade', 'trade-overlay')");
    expect(bar).toContain("if (onOpenTrade) tradeTab.addEventListener('click', () => onOpenTrade());");
    expect(bar).toContain('info.bind(tradeTab, () => routesCard());');
    expect(main).toContain('trade?.open();');
  });

  it('gives Standings three doors: the sheet, the Reliquary and the bead ledger', () => {
    expect(bar).toContain("sheetButton('topbar-tab-part is-sheet', 'victory-overlay')");
    expect(bar).toContain("if (onOpenStandings) standingsTab.addEventListener('click', () => onOpenStandings());");
    expect(bar).toContain("if (onOpenReliquary) renownItem.addEventListener('click', () => onOpenReliquary());");
    expect(bar).toContain("if (onOpenBeads) beadsItem.addEventListener('click', () => onOpenBeads());");
    expect(bar).toContain('info.bind(renownItem, () => renownCard());');
    expect(bar).toContain('info.bind(beadsItem, () => beadsCard());');
    expect(main).toContain('onOpenStandings: () => openScreen(() => victory?.open()),');
    expect(main).toContain('trigger: civYields.standingsTab,');
    expect(main).toContain('reliquary?.open();');
    expect(main).toContain('beads?.open();');
  });

  it('lets the dock keep only the screens about this empire', () => {
    const dock = source('hudDock.ts');
    expect(dock).toMatch(/container\.append\(statecraftButton, religionButton, leaderButton\);/);
    for (const gone of ['hud-dock-diplomacy', 'hud-dock-trade', 'hud-dock-standings']) {
      expect(dock, gone).not.toContain(gone);
    }
    for (const gone of ['hudDock.diplomacyButton', 'hudDock.tradeButton', 'hudDock.standingsButton']) {
      expect(main, gone).not.toContain(gone);
    }
  });
});

/**
 * **The tabs' figures**, read off a real state through `tabFigures`: every
 * number is the simulation's, printed short on the tab and in full in its
 * accessible name.
 */
describe("the tabs' figures", () => {
  it('prints the routes, the renown pool and the beads, short', () => {
    const state = twoHumans();
    state.players[0]!.renownPool = 57;
    const figures = tabFigures(state, 0);
    // Routes running over routes allowed, with no spaces: the tab is narrow.
    expect(figures.routes).toMatch(/^\d+\/\d+$/);
    // The pool alone, as the drawing has it (`✦57`); the rung is in the card.
    expect(figures.renown).toBe('57');
    expect(figures.beads).toBe(`0/${BEAD_RULES.threshold}`);
  });

  it('says the same numbers in full where a screen reader and a tooltip read them', () => {
    const state = twoHumans();
    const player = state.players[0]!;
    player.renownPool = 57;
    const figures = tabFigures(state, 0);
    const rung = renownThreshold(player);
    expect(figures.renownSpoken).toContain(`57 of ${rung}`);
    expect(figures.renownTitle).toContain(`57/${rung}`);
    expect(figures.beadsSpoken).toContain(`0 of ${BEAD_RULES.threshold}`);
    expect(figures.routesSpoken).toMatch(/^Trade: \d+ of \d+ routes running$/);
  });

  it('lights the renown figure only while a great person waits to be called', () => {
    const state = twoHumans();
    expect(tabFigures(state, 0).renownWaiting).toBe(false);
    // The End Turn blocker's own reading (`greatPersonBlocker`): a hand of names
    // on offer is a decision owed.
    state.players[0]!.greatPersonOffer = { options: ['x' as never] };
    expect(tabFigures(state, 0).renownWaiting).toBe(true);
  });

  it('marks a free route slot exactly when fewer routes run than are allowed', () => {
    const figures = tabFigures(twoHumans(), 0);
    const [used, slots] = figures.routes.split('/').map(Number);
    expect(figures.routeSpare).toBe(used! < slots!);
  });
});

/**
 * **The meters chip**: happiness and authority as one chip, each half its own
 * button. The wrapper's only children are the two buttons (the tutorial rings
 * it), so the dot between them is the stylesheet's, placed by `order`.
 */
describe('the meters chip', () => {
  it('draws one outline round the pair and the dot between them in CSS', () => {
    const css = source('style.css');
    const chip = css.slice(css.indexOf('\n.civ-meters {'));
    expect(chip.slice(0, chip.indexOf('}'))).toMatch(/border: var\(--border-thin\) solid/);
    expect(css).toMatch(/\.civ-meters::after \{\s*content: '·';\s*order: 1;/);
    expect(css).toMatch(/\.civ-meters > \.civ-meter:last-child \{\s*order: 2;/);
  });

  it('keeps each half its own button, hover card and breakdown card', () => {
    const bar = source('topBar.ts');
    expect(bar).toContain("const happinessChip = chip('happiness', 'Happiness', happiness.panel.id);");
    expect(bar).toContain("const authorityChip = chip('authority', 'Authority', authority.panel.id);");
    expect(bar).toContain('trigger: happinessChip,');
    expect(bar).toContain('trigger: authorityChip,');
    expect(bar).toContain('info.bind(happinessChip, () => {');
    expect(bar).toContain('info.bind(authorityChip, () => {');
  });
});

/**
 * **The tabs' marks are the drawings their screens already wore** (batch R2,
 * `docs/flags.md` item (iii), for the cart). The routes chip and the dock's
 * buttons wore these drawings; the tabs wear them now, masked in the bar's own
 * colour. A typed glyph creeping back is the failure this pins: it would show
 * as an emoji beside drawn marks, and nothing would throw.
 */
describe('the tabs’ marks', () => {
  it('are the drawn marks, masked in the bar’s own colour', () => {
    const bar = source('topBar.ts');
    expect(bar).toContain('tabMark(diplomacyMarkDataUri())');
    expect(bar).toContain('tabMark(tradeMarkDataUri())');
    expect(bar).toContain('tabMark(standingsMarkDataUri())');
    expect(bar).toContain("mark.style.setProperty('--tab-mark', `url(\"${uri}\")`);");
    expect(source('style.css')).toMatch(/\.topbar-tab-mark \{[^}]*mask-image: var\(--tab-mark\)/);
    // The typed arrows are gone from the bar.
    expect(bar).not.toContain("'⇄'");
  });

  it('are one drawing per screen, the same the flair gallery shows', () => {
    // Same grid and same weight as its two neighbours: no fifth mask mechanism.
    expect(source('dockMarks.ts')).toContain('export const TRADE_MARK');
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

/**
 * **Width** (`docs/plans/hud-audit.md`, problem 1): nothing may scroll out of
 * sight at 1024 px. The strip steps its figures down by measurement
 * (`topBarYieldChips.test.ts`); the tabs drop their printed names below about
 * 1200 px, and only from sight.
 */
describe('the bar at narrow widths', () => {
  const css = source('style.css');

  it('hides the tab names below about 1200 px, from sight and not from a screen reader', () => {
    const at = css.indexOf('@media (max-width: 1199px)');
    expect(at).toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf('\n}\n', at));
    const label = block.slice(block.indexOf('.topbar-tab-label {'));
    expect(label).toContain('clip-path: inset(50%)');
    expect(label.slice(0, label.indexOf('}'))).not.toMatch(/display:\s*none/);
    // The breakpoint is about the fixed-text names only, never the strip.
    expect(block).not.toMatch(/\.civ-yield|\.civ-meter/);
  });

  it('lets only the strip shrink, and centres the turn line in what is left', () => {
    expect(css).toMatch(/\.civ-yields \{[^}]*flex: 0 1 auto;/);
    expect(css).toMatch(/\.topbar-tabs \{[^}]*flex: none;/);
    expect(css).toMatch(/\.topbar-tools \{[^}]*flex: none;/);
    expect(css).toMatch(/\.status \{[^}]*margin: 0 auto;/);
  });
});

/**
 * **What left the bar, and where it went** (batch UX1). The Lens and the
 * chronicle are 40 px buttons to End Turn's left with their cards above them
 * (spec §7); the Compendium opens from ☰ and the ? card; the Abacus opens from
 * the standings sheet and `A` (pinned in `victoryScreen.test.ts`).
 */
describe('the Lens and the chronicle, beside End Turn', () => {
  const html = source('index.html');
  const css = source('style.css');
  const main = source('main.ts');
  const start = html.indexOf('<div id="hud-end-turn">');
  const corner = html.slice(start, html.indexOf('id="end-turn"', start));

  it('sit in the End Turn corner, left of End Turn, with the way back to an offer left of them', () => {
    expect(start).toBeGreaterThan(-1);
    const order = [
      'id="offer-return"',
      'id="hud-turn-tools"',
      'id="lens-button"',
      'id="log-button"',
    ].map((marker) => corner.indexOf(marker));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The chronicle keeps its unread badge, inside its own button.
    const chronicle = corner.slice(corner.indexOf('id="log-button"'));
    expect(chronicle.slice(0, chronicle.indexOf('</button>'))).toContain('id="log-badge"');
    // The Lens keeps its label: the lens that is up, and the yields flag.
    const lens = corner.slice(corner.indexOf('id="lens-button"'));
    const lensButton = lens.slice(0, lens.indexOf('</button>'));
    expect(lensButton).toContain('id="lens-current"');
    expect(lensButton).toContain('id="lens-yields-flag"');
  });

  it('carry their cards with them, out of the column under the bar', () => {
    expect(corner).toContain('id="lens-popover"');
    expect(corner).toContain('id="log-popover"');
    const column = html.slice(html.indexOf('<div id="hud-popovers">'));
    const columnBody = column.slice(0, column.indexOf('id="help-overlay"'));
    expect(columnBody).not.toContain('id="lens-popover"');
    expect(columnBody).not.toContain('id="log-popover"');
  });

  it('open each card directly above the pair', () => {
    expect(css).toMatch(/\.hud-turn-tools \{\s*position: relative;/);
    const rule = css.slice(css.indexOf('.hud-turn-tools > .hud-card {'));
    const body = rule.slice(0, rule.indexOf('}'));
    expect(body).toContain('position: absolute;');
    expect(body).toContain('right: 0;');
    expect(body).toContain('bottom: calc(100% + 12px);');
  });

  it('are 40 px buttons with the HUD’s physical press', () => {
    const rule = css.slice(css.indexOf('\n.turn-tool {'));
    const body = rule.slice(0, rule.indexOf('}'));
    expect(body).toContain('min-width: 40px;');
    expect(body).toContain('height: 40px;');
    expect(css).toMatch(/\.turn-tool:active,\n\.turn-tool\[aria-expanded='true'\] \{\s*transform: translate\(3px, 3px\);/);
  });

  it('draw their cards above the unit panel, and below the popover columns', () => {
    const zIndex = (selector: string): number => {
      const rule = css.slice(css.indexOf(`\n${selector} {`));
      const match = /z-index:\s*(\d+)/.exec(rule.slice(0, rule.indexOf('}')));
      if (!match) throw new Error(`no z-index on ${selector}`);
      return Number(match[1]);
    };
    expect(zIndex('#hud-end-turn')).toBeGreaterThan(zIndex('#unit-panel'));
    expect(zIndex('#hud-end-turn')).toBeLessThan(zIndex('#hud-popovers'));
  });

  it('stand down with the rest of the chrome on the city screen', () => {
    expect(css).toMatch(/body:has\(\.city-mode:not\(\[hidden\]\)\) \.hud-turn-tools \{\s*display: none;/);
  });

  it('are wired by id exactly as before, and the corner still hosts the diplomacy offers', () => {
    expect(main).toContain("const lensButton = requireElement<HTMLButtonElement>('lens-button');");
    expect(main).toContain("const logButton = requireElement<HTMLButtonElement>('log-button');");
    expect(main).toContain('trigger: lensButton,');
    expect(main).toContain('trigger: logButton,');
    expect(main).toContain("host: requireElement('hud-end-turn'),");
  });
});

describe('the Compendium, from the menu and the ? card', () => {
  const html = source('index.html');
  const main = source('main.ts');

  it('has a row in the ☰ menu and keeps its link at the foot of the ? card', () => {
    const menu = html.slice(html.indexOf('id="menu-popover"'), html.indexOf('id="help-overlay"'));
    expect(menu).toContain('id="menu-compendium"');
    expect(menu).toContain('aria-controls="compendium-overlay"');
    const help = html.slice(html.indexOf('id="help-overlay"'));
    expect(help.slice(0, help.indexOf('</div>\n    </div>'))).toContain('id="help-compendium"');
  });

  it('opens from the menu row and gives the keyboard back to ☰', () => {
    expect(main).toContain(
      "menuCompendiumButton.addEventListener('click', () => {\n  menu.close();\n  compendium.open();\n});",
    );
    const block = main.slice(main.indexOf('createCompendium({'));
    expect(block.slice(0, block.indexOf('onOpen:'))).toContain('trigger: menuButton,');
    expect(main).not.toContain('compendiumButton.addEventListener');
  });
});

describe('the ? card says where the moved things are', () => {
  const html = source('index.html');
  const help = html.slice(html.indexOf('id="help-overlay"'), html.indexOf('id="help-compendium"'));

  it('names the keys, the tabs, and the two buttons beside End Turn', () => {
    for (const key of ['C', 'H', 'W', 'E', 'A', 'V']) expect(help, key).toContain(`<kbd>${key}</kbd>`);
    expect(help).toContain('<b>Diplomacy</b>, <b>Trade</b> and <b>Standings</b>');
    expect(help).toContain('beside End Turn');
    expect(help).toContain('opens the Abacus');
    // Nothing still points at a bar button that is gone.
    expect(help).not.toContain('in the bar keeps the');
  });
});

/** A two-seat game where both seats are human, the wild seated last. */
function twoHumans() {
  return newGame({
    seed: 4,
    sizeName: 'duel',
    players: [
      { name: 'Crimson', color: '#d4502e', isHuman: true },
      { name: 'Teal', color: '#1f8a85', isHuman: true },
    ],
    barbarians: true,
  });
}
