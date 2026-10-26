/**
 * The empire panel and its drawer (batch UX3, `src/ui/empireDrawer.ts`; the spec
 * is `docs/plans/hud-empire-panel-spec.md` §3 to §5).
 *
 * This suite has no DOM, so the pure halves are driven directly and the wiring
 * is read from the sources:
 *
 *   1. **the depth rule**: how a peek, a toggle, leaving and closing move the
 *      drawer between closed, depth one and depth two, and when a peek may
 *      start at all;
 *   2. **the red dot**: its four causes, each on its own;
 *   3. **the readings**: research, the draft meter, the age wager and the
 *      Supply counts, each against the simulation's own figure;
 *   4. **the words**: the panel's accessible name and the drawer's lines;
 *   5. **the wiring**: the markup, the stylesheet, `main.ts` (the screen
 *      registry, the disposal register, the doors) and the Q and L keys in
 *      `controls.ts`.
 *
 * It replaces `hudDock.test.ts` and `holdingsRail.test.ts`: the dock's badge
 * facts are `statecraftOwed` and `beliefOwed` below, and the holdings rail's
 * fingerprint and caption are the Supply section's.
 */

import { describe, expect, it } from 'vitest';
import { braceBody, uiSource } from './sourceHelpers';

import { foundCityAt, turnsToFill } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { readEmpire } from '../../src/sim/readings';
import { explainNextRung, nextRungWords } from '../../src/sim/religion';
import { resourceDef } from '../../src/sim/resourceData';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../src/sim/state';
import { draftCost, nextDraftCost } from '../../src/sim/statecraft';
import { GOVERNMENT_TIERS, type OrderId } from '../../src/sim/statecraftData';
import { availableTechs, playerScience } from '../../src/sim/tech';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { drawWagers } from '../../src/sim/wagers';
import { resetVisibility } from '../../src/sim/visibility';
import {
  DEPTH_HINT,
  type DrawerDepth,
  type DrawerEvent,
  LEAVE_DELAY_MS,
  OWED_WORDS,
  PEEK_DELAY_MS,
  PEEK_FOOT,
  SUPPLY_CAPTION,
  SUPPLY_EMPTY,
  beliefOwed,
  cultureOwedWords,
  draftFigures,
  draftGlance,
  drawerStep,
  empireGlance,
  mayPeek,
  panelLabel,
  researchGlance,
  researchTurnsMark,
  statecraftOwed,
  supplyFingerprint,
  tierWords,
  wagerGlance,
  wagerWords,
} from '../../src/ui/empireDrawer';
import { researchProgress } from '../../src/ui/researchProgress';
import { type CopyCount, strategicHoldings } from '../../src/ui/resourceCopies';
import { newGame } from '../sim/newGameHelpers';

// --- fixtures ----------------------------------------------------------------

/** A one-human game, as the landing starts one. */
function solo(): GameState {
  return newGame({
    seed: 1,
    sizeName: 'duel',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
}

function seatOf(state: GameState): Player {
  const player = playerById(state, 0);
  if (!player) throw new Error('no seat 0');
  return player;
}

/** A small grass board with nothing on it, for the Supply tests. */
function bench(): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [{ name: 'Ada', color: '#a00', isHuman: true }],
  });
  state.map = createMap({ width: 14, height: 8, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(14 * 8).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function town(state: GameState, col: number, row: number): City {
  return foundCityAt(state, 0, getTileAt(state.map, col, row)!);
}

/**
 * A worked seam of one strategic resource, with its technology granted, as
 * `resourceCopies.test.ts` builds one. A bench writing the board by hand
 * announces it (`bumpRevision`).
 */
function giveSeam(state: GameState, city: City, col: number, row: number, copies: number): void {
  const tile = getTileAt(state.map, col, row)!;
  tile.resource = 'iron';
  tile.resourceCopies = copies;
  tile.improvement = 'mine';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  const gate = resourceDef('iron').requiresTech;
  const player = seatOf(state);
  if (gate !== undefined && !player.techsResearched.includes(gate)) player.techsResearched.push(gate);
  bumpRevision(state);
}

function count(id: CopyCount['id'], held: number, committed: number): CopyCount {
  return { id, name: id, held, committed, spare: Math.max(0, held - committed) };
}

// --- 1 · the depth rule --------------------------------------------------------

describe('the depth rule', () => {
  const step = (depth: DrawerDepth, ...events: DrawerEvent[]): DrawerDepth =>
    events.reduce<DrawerDepth>((at, event) => drawerStep(at, event), depth);

  it('peeks at depth one from closed, and never lowers a pinned drawer', () => {
    expect(drawerStep(0, 'peek')).toBe(1);
    expect(drawerStep(1, 'peek')).toBe(1);
    expect(drawerStep(2, 'peek')).toBe(2);
  });

  it('pins at depth two on a click, a tap, Enter or Q, from closed or peeking', () => {
    expect(drawerStep(0, 'toggle')).toBe(2);
    expect(drawerStep(1, 'toggle')).toBe(2);
  });

  it('closes a pinned drawer on Q again or a second press on the panel', () => {
    expect(drawerStep(2, 'toggle')).toBe(0);
  });

  it('closes a peek when the pointer and the keyboard have left, but never a pinned drawer', () => {
    expect(drawerStep(1, 'leave')).toBe(0);
    expect(drawerStep(2, 'leave')).toBe(2);
    expect(drawerStep(0, 'leave')).toBe(0);
  });

  it('closes from any depth on Escape, the ×, a press outside or a screen opening', () => {
    for (const depth of [0, 1, 2] as const) expect(drawerStep(depth, 'close')).toBe(0);
  });

  it('walks the paths the spec draws', () => {
    // Hover, then click to pin, then leave: still pinned.
    expect(step(0, 'peek', 'toggle', 'leave')).toBe(2);
    // Hover, then leave: closed.
    expect(step(0, 'peek', 'leave')).toBe(0);
    // Q, Q: open then closed.
    expect(step(0, 'toggle', 'toggle')).toBe(0);
    // Tab onto the panel, then Enter, then Escape.
    expect(step(0, 'peek', 'toggle', 'close')).toBe(0);
  });

  it('waits 200 ms to peek and 300 ms to close a peek (spec §4)', () => {
    expect(PEEK_DELAY_MS).toBe(200);
    expect(LEAVE_DELAY_MS).toBe(300);
  });

  it('never peeks while dragging the map, on a touch, or behind a sheet or an aimed move', () => {
    const calm = { buttonsHeld: false, touch: false, busy: false };
    expect(mayPeek(calm)).toBe(true);
    expect(mayPeek({ ...calm, buttonsHeld: true })).toBe(false);
    expect(mayPeek({ ...calm, touch: true })).toBe(false);
    expect(mayPeek({ ...calm, busy: true })).toBe(false);
  });
});

// --- 2 · the red dot ---------------------------------------------------------

describe('the red dot', () => {
  it('is out for a fresh seat with nothing waiting', () => {
    const state = solo();
    expect(empireGlance(state, 0)!.owed).toEqual([]);
  });

  it('lights for a draft waiting, and the culture section says a card awaits', () => {
    const state = solo();
    seatOf(state).statecraft.pendingOrder = { options: [] };
    const glance = empireGlance(state, 0)!;
    expect(glance.owed).toEqual(['card']);
    expect(cultureOwedWords(glance.draft)).toBe('a card awaits');
  });

  it('lights for a Doctrine waiting', () => {
    const state = solo();
    seatOf(state).statecraft.pendingDoctrine = { options: [] };
    expect(empireGlance(state, 0)!.owed).toEqual(['card']);
  });

  it('lights for a charter to swear, and says so before any card', () => {
    const state = solo();
    const sc = seatOf(state).statecraft;
    sc.pendingGovernment = { tier: 1, options: [] };
    expect(empireGlance(state, 0)!.owed).toEqual(['charter']);
    sc.pendingOrder = { options: [] };
    const glance = empireGlance(state, 0)!;
    expect(glance.owed).toEqual(['charter']);
    expect(cultureOwedWords(glance.draft)).toBe('a charter is ready to be sworn');
  });

  it('lights for a belief to choose, which is also the Faith row’s dot', () => {
    const state = solo();
    seatOf(state).pantheon.pending = { options: [] };
    const glance = empireGlance(state, 0)!;
    expect(glance.owed).toEqual(['belief']);
    expect(glance.beliefOwed).toBe(true);
    // The draft meter's owed line is Statecraft's alone.
    expect(cultureOwedWords(glance.draft)).toBeNull();
  });

  it('lights for a strategic resource with no spare copy, and not while one is spare', () => {
    const state = bench();
    const mine = town(state, 3, 4);
    giveSeam(state, mine, 2, 3, 2);
    expect(empireGlance(state, 0)!.owed).toEqual([]);
    // Two legionaries hold both copies for as long as they live.
    createUnit(state, 0, 'legionary', 3, 3);
    createUnit(state, 0, 'legionary', 4, 3);
    bumpRevision(state);
    expect(empireGlance(state, 0)!.owed).toEqual(['supply']);
  });

  it('lists every cause at once, in a fixed order', () => {
    const state = bench();
    const mine = town(state, 3, 4);
    giveSeam(state, mine, 2, 3, 1);
    createUnit(state, 0, 'legionary', 3, 3);
    seatOf(state).statecraft.pendingOrder = { options: [] };
    seatOf(state).pantheon.pending = { options: [] };
    bumpRevision(state);
    expect(empireGlance(state, 0)!.owed).toEqual(['card', 'belief', 'supply']);
  });

  it('delegates to the simulation’s own “something is waiting”, and an empty seat owes nothing', () => {
    // The dock's two badge facts, carried over from `hudDock.test.ts`.
    const player = seatOf(solo());
    expect(statecraftOwed(undefined)).toBe(false);
    expect(beliefOwed(undefined)).toBe(false);
    expect(statecraftOwed(player)).toBe(false);
    player.statecraft.pendingGovernment = { tier: 1, options: [] };
    expect(statecraftOwed(player)).toBe(true);
    expect(beliefOwed(player)).toBe(false);
    delete player.statecraft.pendingGovernment;
    player.pantheon.pending = { options: [] };
    expect(statecraftOwed(player)).toBe(false);
    expect(beliefOwed(player)).toBe(true);
  });

  it('has a plain word for each cause, with no figure in it', () => {
    for (const words of Object.values(OWED_WORDS)) expect(words).not.toMatch(/\d/);
  });

  it('is not a seat that is not there', () => {
    expect(empireGlance(solo(), 99)).toBeNull();
  });
});

// --- 3 · the readings ---------------------------------------------------------

describe('research', () => {
  it('reads the technology being learnt the way the star chart does', () => {
    const state = solo();
    const player = seatOf(state);
    const [first, second] = availableTechs(state, 0);
    player.researching = first!;
    player.sciencePool = 7;
    const glance = researchGlance(state, player);
    const rate = playerScience(state, 0);
    const progress = researchProgress(7, techDef(first!).cost, rate);
    expect(glance.stage).toBe('learning');
    expect(glance.name).toBe(techDef(first!).name);
    expect(glance.fraction).toBe(progress.fraction);
    expect(glance.turns).toBe(progress.turns);
    expect(glance.rate).toBe(rate);
    expect(glance.next).toBeNull();
    // A queue behind it names the next one.
    player.researchQueue = [second!];
    expect(researchGlance(state, player).next).toBe(techDef(second!).name);
  });

  it('says when nothing is chosen, and when the tree is finished', () => {
    const state = solo();
    const player = seatOf(state);
    player.researching = null;
    const choosing = researchGlance(state, player);
    expect(choosing.stage).toBe('choosing');
    expect(researchTurnsMark(choosing)).toBe('—');
    player.techsResearched = [...TECH_IDS];
    const finished = researchGlance(state, player);
    expect(finished.stage).toBe('finished');
    expect(finished.fraction).toBe(1);
    expect(researchTurnsMark(finished)).toBe('✦');
  });
});

describe('the draft meter', () => {
  it('is the culture pool against the next draft’s cost, at the top bar’s culture rate', () => {
    const state = bench();
    const player = seatOf(state);
    town(state, 4, 4);
    player.statecraft.drafts = 5;
    player.culturePool = 30.6;
    bumpRevision(state);
    const glance = draftGlance(state, player);
    const cost = draftCost(5);
    expect(glance.cost).toBe(cost);
    expect(glance.banked).toBe(30);
    expect(glance.fraction).toBeCloseTo(30.6 / cost);
    expect(glance.turns).toBe(turnsToFill(cost - 30.6, readEmpire(state, 0).totals.culture));
    expect(draftFigures(glance)).toBe(`30/${cost} · ${glance.turns === null ? '—' : `${glance.turns}t`}`);
  });

  it('quotes the price the seat pays, discounts included (Magisterial batch MG5, The Open Door)', () => {
    // The Magisterial triage's reading 12: every screen that prints the next
    // price prints the discounted figure.
    const state = bench();
    const player = seatOf(state);
    town(state, 4, 4);
    player.statecraft.drafts = 5;
    player.culturePool = 30;
    const door = 'theOpenDoor' as OrderId;
    player.statecraft.orders.push(door);
    player.statecraft.slots.push({ card: door, sealedUntil: state.turn });
    bumpRevision(state);
    const glance = draftGlance(state, player);
    const cost = Math.floor((draftCost(5) * 85) / 100);
    expect(cost).toBeLessThan(draftCost(5));
    expect(glance.cost).toBe(cost);
    expect(glance.cost).toBe(nextDraftCost(state, player));
    expect(glance.fraction).toBeCloseTo(30 / cost);
    expect(draftFigures(glance)).toBe(`30/${cost} · ${glance.turns === null ? '—' : `${glance.turns}t`}`);
  });

  it('names the tier and the next tier a government is offered at', () => {
    const state = solo();
    const player = seatOf(state);
    player.statecraft.drafts = 5;
    const glance = draftGlance(state, player);
    const next = GOVERNMENT_TIERS.find((tier) => tier > 5)!;
    expect(glance.tier).toBe(5);
    expect(glance.nextGovernment).toBe(next);
    expect(tierWords(glance)).toBe(`Tier 5 · next government at ${next}`);
    // Past the last government there is nothing more to name.
    player.statecraft.drafts = GOVERNMENT_TIERS[GOVERNMENT_TIERS.length - 1]! + 1;
    const late = draftGlance(state, player);
    expect(late.nextGovernment).toBeNull();
    expect(tierWords(late)).toBe(`Tier ${late.tier}`);
  });
});

describe('the age wager row', () => {
  it('says there is no wager in an age that dealt none', () => {
    const state = solo();
    expect(wagerGlance(state, 0)).toEqual({ dealt: 0, met: 0 });
    expect(wagerWords({ dealt: 0, met: 0 })).toBe('no wager this age');
  });

  it('counts the bars of this age’s deal the seat has met', () => {
    const state = solo();
    const age = 2;
    state.turn = 30;
    state.ageClose = { age: age - 1, turn: 18 };
    const cards = drawWagers(state, age);
    state.wagers.push({
      age,
      dealt: [...cards],
      dealtOn: 29,
      opening: realPlayers(state).map((player) => ({ playerId: player.id, at: cards.map(() => 0) })),
      claimed: [
        { playerId: 0, index: 0, turn: 29 },
        { playerId: 0, index: 2, turn: 30 },
      ],
    });
    const glance = wagerGlance(state, 0);
    expect(glance).toEqual({ dealt: cards.length, met: 2 });
    expect(wagerWords(glance)).toBe(`2 of ${cards.length} bars met`);
  });
});

describe('the Supply section', () => {
  it('prints the simulation’s strategic holdings, row for row', () => {
    const state = bench();
    const mine = town(state, 3, 4);
    giveSeam(state, mine, 2, 3, 5);
    createUnit(state, 0, 'legionary', 3, 3);
    bumpRevision(state);
    const glance = empireGlance(state, 0)!;
    expect(glance.supply).toEqual(strategicHoldings(state, 0));
    expect(glance.supply.map((row) => [row.id, row.spare, row.held])).toEqual([['iron', 4, 5]]);
  });

  it('is empty for an empire with no strategic resource, and says so plainly', () => {
    const state = bench();
    town(state, 3, 4);
    expect(empireGlance(state, 0)!.supply).toEqual([]);
    expect(SUPPLY_EMPTY).not.toMatch(/\d/);
  });

  it('says what the two figures are, in plain words', () => {
    expect(SUPPLY_CAPTION).toBe('spare of what you hold');
    expect(SUPPLY_CAPTION).not.toMatch(/\d/);
  });

  it('draws each row with the shared mark and figure, and opens its Compendium entry', () => {
    const drawer = uiSource('empireDrawer.ts');
    const row = braceBody(drawer, 'function supplyRow(');
    expect(row).toContain('resourceMarkNode(count.id)');
    expect(row).toContain('copiesFigureNode(count)');
    expect(row).toContain("count.spare === 0 ? 'drawer-supply-row is-short'");
    expect(drawer).toContain('openKeyword(`resource:${id}`)');
    // The reading is `resourceCopies.ts`'s, not a second one.
    expect(drawer).toContain("import { type CopyCount, copiesFigureNode, strategicHoldings } from './resourceCopies';");
  });
});

describe('the Supply fingerprint (the old holdings rail’s)', () => {
  it('is equal for two readings that would draw the same list', () => {
    const rows = [count('iron', 5, 2), count('horses', 6, 0)];
    expect(supplyFingerprint(rows, 0)).toBe(supplyFingerprint([...rows], 0));
  });

  it('moves when a copy is spent, when ground is lost, and when a row joins', () => {
    const before = supplyFingerprint([count('iron', 5, 2)], 0);
    expect(supplyFingerprint([count('iron', 5, 3)], 0)).not.toBe(before);
    expect(supplyFingerprint([count('iron', 3, 2)], 0)).not.toBe(before);
    expect(supplyFingerprint([count('iron', 5, 2), count('camels', 5, 0)], 0)).not.toBe(before);
  });

  it('moves when the chair does, with no change of state at all', () => {
    const rows = [count('iron', 5, 2)];
    expect(supplyFingerprint(rows, 1)).not.toBe(supplyFingerprint(rows, 0));
  });
});

// --- 4 · the words -------------------------------------------------------------

describe('the words', () => {
  it('names the panel as the spec does: what is being learnt, and the next draft', () => {
    const state = bench();
    const player = seatOf(state);
    town(state, 4, 4);
    player.researching = availableTechs(state, 0)[0]!;
    bumpRevision(state);
    const glance = empireGlance(state, 0)!;
    const label = panelLabel(glance);
    expect(label.startsWith(`Your empire: researching ${glance.research.name}, `)).toBe(true);
    expect(label).toMatch(/; (next draft in \d+ turns?|next draft this turn|no culture being made)$/);
  });

  it('adds what is waiting to the panel’s name', () => {
    const state = solo();
    seatOf(state).pantheon.pending = { options: [] };
    expect(panelLabel(empireGlance(state, 0)!)).toMatch(/\. Waiting on you: a belief to choose$/);
  });

  it('says plainly when nothing is being researched', () => {
    const state = solo();
    seatOf(state).researching = null;
    expect(panelLabel(empireGlance(state, 0)!)).toContain('Your empire: nothing being researched;');
  });

  it('prints the Faith row in the simulation’s own sentence, as the top bar’s faith card does', () => {
    const state = solo();
    const glance = empireGlance(state, 0)!;
    expect(glance.faithLine).toBe(
      nextRungWords(explainNextRung(state, 0, readEmpire(state, 0).totals.faith)),
    );
  });

  it('hints at what a click adds, and at the way out once pinned', () => {
    expect(PEEK_FOOT).toBe('▾ click for Faith, Leader, Supply');
    expect(DEPTH_HINT[1]).toBe('click or Q to keep open');
    expect(DEPTH_HINT[2]).toBe('Esc or Q to close');
  });
});

// --- 5 · the wiring ------------------------------------------------------------

describe('the markup', () => {
  const html = uiSource('index.html');
  const panel = html.slice(html.indexOf('id="empire-panel"'), html.indexOf('</button>', html.indexOf('id="empire-panel"')));
  const drawer = html.slice(html.indexOf('<div id="empire-drawer"'), html.indexOf('<!-- ================= the star chart'));

  it('makes the panel one button that controls the drawer', () => {
    expect(panel).toContain('aria-expanded="false"');
    expect(panel).toContain('aria-controls="empire-drawer"');
    // Two bars and a ▸, and nothing else that could be pressed.
    expect(panel).toContain('id="empire-research-bar"');
    expect(panel).toContain('id="empire-draft-fill"');
    expect(panel).toContain('▸');
    expect(panel).not.toContain('<button');
  });

  it('keeps the old research card’s ids on the research section, for the star chart', () => {
    const research = drawer.slice(drawer.indexOf('id="hud-research"'), drawer.indexOf('id="drawer-culture"'));
    for (const id of ['tech-current', 'research-figures', 'research-turns', 'research-dial', 'research-glyph']) {
      expect(research, id).toContain(`id="${id}"`);
    }
    expect(research).toContain('aria-controls="tech-overlay"');
  });

  it('orders the keyboard as the spec does: research, culture, Faith, Leader, wager, Supply, then ×', () => {
    const order = [
      'id="hud-research"',
      'id="drawer-culture"',
      'id="drawer-faith"',
      'id="drawer-leader"',
      'id="drawer-wager"',
      'id="drawer-supply"',
      'id="drawer-close"',
    ].map((marker) => drawer.indexOf(marker));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('calls the H row Faith, after the ruling on the sheet’s name', () => {
    const faith = drawer.slice(drawer.indexOf('id="drawer-faith"'), drawer.indexOf('</button>', drawer.indexOf('id="drawer-faith"')));
    expect(faith).toContain('<span class="drawer-row-name">Faith</span>');
    expect(faith).toContain('>H</kbd>');
    expect(drawer).not.toContain('>Religion<');
  });

  it('has retired the dock, its popover column, the research card and the resources card', () => {
    for (const gone of ['id="hud-dock"', 'id="hud-dock-popovers"', 'id="hud-holdings"', 'research-card']) {
      expect(html, gone).not.toContain(gone);
    }
    const ui = import.meta.glob('../../src/ui/*.ts');
    expect(Object.keys(ui).some((path) => path.endsWith('/hudDock.ts'))).toBe(false);
    expect(Object.keys(ui).some((path) => path.endsWith('/holdingsRail.ts'))).toBe(false);
  });
});

describe('the stylesheet', () => {
  const css = uiSource('style.css');
  const rule = (selector: string): string => {
    const at = css.indexOf(`\n${selector} {`);
    if (at < 0) throw new Error(`no rule for ${selector}`);
    return css.slice(at, css.indexOf('}', at));
  };

  it('sizes the panel at 200 by 56, 12px under the bar', () => {
    expect(css).toContain('--empire-panel-w: 200px;');
    expect(css).toContain('--empire-panel-h: 56px;');
    expect(rule('.empire-panel')).toContain('top: calc(var(--topbar-h) + 12px);');
    expect(rule('.empire-panel')).toContain('left: 14px;');
  });

  it('draws the panel’s states: hover lifts, a press sinks, open flattens the right edge, owed shows the dot', () => {
    expect(css).toContain('.empire-panel:hover,\n.empire-panel.is-open {\n  background: #fdfaef;');
    expect(rule('.empire-panel:active')).toContain('transform: translate(3px, 3px);');
    expect(rule('.empire-panel:active')).toContain('box-shadow: 0 0 0 var(--ink);');
    expect(css).toMatch(
      /\n\.empire-panel\.is-open \{\s*border-top-right-radius: 2px;\s*border-bottom-right-radius: 2px;/,
    );
    expect(rule('.empire-banner.is-owed::after')).toContain('background: var(--vermilion);');
    // The two bars, in the section colours the drawer uses.
    expect(rule('.empire-bar.is-research .empire-bar-fill')).toContain('var(--cobalt)');
    expect(rule('.empire-bar.is-draft .empire-bar-fill')).toContain('var(--grape)');
    // And the panel writes all of it from one place.
    const paint = braceBody(uiSource('empireDrawer.ts'), 'function paintPanel(');
    expect(paint).toContain("banner.classList.toggle('is-owed', glance.owed.length > 0);");
    expect(paint).toContain("panel.setAttribute('aria-label', panelLabel(glance));");
    const setDepth = braceBody(uiSource('empireDrawer.ts'), 'function setDepth(');
    expect(setDepth).toContain("panel.classList.toggle('is-open', next > 0);");
    expect(setDepth).toContain("panel.setAttribute('aria-expanded', String(next > 0));");
  });

  it('opens the drawer to the right of the panel, 300 wide, never over the left column', () => {
    const drawer = rule('.empire-drawer');
    expect(drawer).toContain('left: calc(14px + var(--empire-panel-w) + 6px);');
    expect(drawer).toContain('top: calc(var(--topbar-h) + 12px);');
    expect(drawer).toContain('width: 300px;');
  });

  it('shows the rows, Supply and the × only at depth two, and the foot line only at depth one', () => {
    expect(css).toContain(".empire-drawer[data-depth='1'] .drawer-more,");
    expect(css).toContain(".empire-drawer[data-depth='1'] .drawer-close,");
    expect(css).toContain(".empire-drawer[data-depth='2'] .drawer-foot {");
  });

  it('gives each section its colour on hover and focus, and keeps culture’s edge while a card waits', () => {
    expect(rule('.drawer-section.is-research')).toContain('--edge: var(--cobalt);');
    expect(rule('.drawer-section.is-culture')).toContain('--edge: var(--grape);');
    expect(css).toContain('.drawer-section:hover,\n.drawer-section:focus-visible,\n.drawer-section.is-owed {');
    expect(css).toMatch(/\.drawer-section:focus-visible \{\s*outline: 3px solid var\(--edge\);\s*outline-offset: 2px;/);
    expect(rule('.drawer-section:active')).toContain('transform: translate(2px, 2px);');
  });

  it('stands the panel, the drawer and the chips down on the city screen', () => {
    for (const id of ['#empire-panel', '#empire-drawer', '#hud-commissions']) {
      expect(css, id).toContain(`body:has(.city-mode:not([hidden])) ${id},`);
    }
    for (const gone of ['#hud-dock', '#hud-holdings', '--research-card-h', '--hud-dock-h']) {
      expect(css, gone).not.toContain(gone);
    }
  });
});

describe('the drawer’s own wiring', () => {
  const drawer = uiSource('empireDrawer.ts');
  const code = drawer.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('tells the registry only when it is pinned: a peek closes nothing', () => {
    const setDepth = braceBody(drawer, 'function setDepth(');
    expect((setDepth.match(/options\.onOpen\(\)/g) ?? []).length).toBe(1);
    const pinned = setDepth.slice(setDepth.indexOf('if (next === 2) {'));
    expect(pinned.indexOf('options.onOpen()')).toBeGreaterThan(-1);
    expect(pinned.indexOf('options.onOpen()')).toBeLessThan(pinned.indexOf('} else if'));
    expect((code.match(/options\.onOpen\(\)/g) ?? []).length).toBe(1);
  });

  it('puts the keyboard back on the panel when it closes with the keyboard inside', () => {
    const setDepth = braceBody(drawer, 'function setDepth(');
    expect(setDepth).toContain('const heldKeyboard = drawer.contains(document.activeElement);');
    expect(setDepth).toContain('panel.focus({ preventScroll: true });');
  });

  it('peeks from the keyboard only on a Tab, so a sheet closing does not open it', () => {
    expect(drawer).toContain("tabbed = event.key === 'Tab';");
    expect(drawer).toContain("if (tabbed && depth === 0 && shown()) setDepth(drawerStep(depth, 'peek'));");
  });

  it('closes on the ×, on a press outside, and through the registry', () => {
    expect(drawer).toContain("closeButton.addEventListener('click', () => close(), { signal });");
    expect(drawer).toContain('if (target !== null && (panel.contains(target) || drawer.contains(target))) return;');
    expect(drawer).toContain('close,');
  });

  it('binds every listener to one controller that dispose aborts', () => {
    const binds = [...code.matchAll(/addEventListener\(/g)].length;
    // The options object closing an `addEventListener` call, not the destructuring.
    const signalled = [...code.matchAll(/\{ (capture: true, )?signal \},?\s*\)/g)].length;
    expect(binds).toBeGreaterThan(10);
    expect(signalled).toBe(binds);
    expect(braceBody(drawer, '    dispose(): void {')).toContain('listening.abort();');
    // It follows the popover's pattern without its unremovable listeners.
    expect(code).not.toContain('createPopover');
  });

  it('opens nothing on a panel that is not drawn, as on the city screen', () => {
    expect(braceBody(drawer, 'function toggle(')).toContain('if (depth === 0 && !shown()) return;');
  });

  it('redraws on the state, the revision and the seat, not on every pointer move', () => {
    const render = braceBody(drawer, 'function render(');
    expect(render).toContain('state === drawnState && state.revision === drawnRevision && seatId === drawnSeat');
  });
});

describe('main.ts', () => {
  const main = uiSource('main.ts');

  it('registers the drawer as a card, and says it is opening when it is pinned', () => {
    expect(main).toContain("screens.register(held('drawer', 'card', () => empireDrawer));");
    expect(main).toContain("onOpen: () => screens.opening('drawer'),");
  });

  it('disposes it with the boot and refreshes it with the HUD', () => {
    expect(main).toContain('gameDisposers.push(() => empireDrawer?.dispose());');
    expect(main).toContain('empireDrawer?.render();');
  });

  it('never peeks behind a sheet or while a move is being aimed', () => {
    expect(main).toContain('canPeek: () => !isInputBlocked() && !controls.isMoveMode(),');
  });

  it('wires every door to the screen it names', () => {
    for (const door of [
      'openStatecraft: () => statecraft?.open(),',
      'openFaith: () => religion?.open(),',
      'openLeader: () => leaderSheet?.open(),',
      'openWager: () => wagerSheet?.open(),',
      'statusCard: researchSection,',
    ]) {
      expect(main, door).toContain(door);
    }
  });

  it('re-places the tutorial’s ring when the drawer opens or closes', () => {
    expect(main).toContain('onChange: () => tutorial.refresh(),');
  });

  it('mounts the commission chips after the drawer, so the keyboard reaches them last', () => {
    expect(main).toContain('else empireDrawerEl.after(commissionRail.root);');
  });
});

describe('the Q and L keys', () => {
  const controls = uiSource('controls.ts');
  const main = uiSource('main.ts');

  it('binds Q to the drawer and L to the leader sheet, beside T and C', () => {
    const handler = controls.slice(controls.indexOf("if (event.key === 'c' || event.key === 'C') {"));
    const q = handler.indexOf("(event.key === 'q' || event.key === 'Q')");
    const l = handler.indexOf("(event.key === 'l' || event.key === 'L')");
    expect(q).toBeGreaterThan(-1);
    expect(l).toBeGreaterThan(q);
    expect(handler.slice(q, l)).toContain('onToggleEmpireDrawer?.();');
    expect(handler.slice(l)).toContain('onToggleLeader?.();');
    expect(main).toContain('onToggleEmpireDrawer: () => empireDrawer?.toggle(),');
    expect(main).toContain('onToggleLeader: () => leaderSheet?.toggle(),');
  });

  it('leaves a press with a modifier to the browser (Cmd + Q, Ctrl + L)', () => {
    for (const key of ['q', 'l']) {
      const at = controls.indexOf(`(event.key === '${key}' || event.key === '${key.toUpperCase()}') &&`);
      const guard = controls.slice(at, controls.indexOf(') {', at));
      expect(guard, key).toContain('!event.ctrlKey');
      expect(guard, key).toContain('!event.metaKey');
      expect(guard, key).toContain('!event.altKey');
    }
  });

  it('lists both on the ? card', () => {
    const html = uiSource('index.html');
    const help = html.slice(html.indexOf('id="help-overlay"'), html.indexOf('id="help-compendium"'));
    expect(help).toContain('<kbd>Q</kbd>');
    expect(help).toContain('<kbd>L</kbd> your leader');
  });
});
