/**
 * The corner panel (batch SS2b, `src/ui/empireDrawer.ts`; the board is "Option
 * A, revised" in `docs/plans/mockups/scholars-study/corner-panel-options.html`,
 * with the user's choices in `docs/plans/ui-critique-2026-10-16.md`).
 *
 * This suite has no DOM, so the pure halves are driven directly and the wiring
 * is read from the sources:
 *
 *   1. **opening and closing**: a click on the card's ground or Q toggles it,
 *      and Escape, a press outside and any screen opening close it;
 *   2. **the red dot**: its four causes, each on its own;
 *   3. **the readings**: research, the draft meter, the age wager, the Supply
 *      counts and the two live figures, each against the simulation's own;
 *   4. **the words**: the banner's accessible name and the rows' lines;
 *   5. **the wiring**: the markup (two line buttons, four marks that become
 *      rows, the open part last), the stylesheet, `main.ts` (the screen
 *      registry, the disposal register, the one door each) and the Q, L and S
 *      keys.
 *
 * It replaced `hudDock.test.ts` and `holdingsRail.test.ts` in batch UX3, and
 * the side drawer's depth rule in batch SS2.
 */

import { describe, expect, it } from 'vitest';
import { braceBody, uiSource } from './sourceHelpers';

import { foundCityAt, turnsToFill } from '../../src/sim/cities';
import { explainPurchaseCost, purchaseError } from '../../src/sim/purchase';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { readEmpire } from '../../src/sim/readings';
import {
  type NextRung,
  explainNextRung,
  nextBeliefPool,
  nextRungWords,
  poolSlotsFor,
  religionBeliefPool,
} from '../../src/sim/religion';
import { resourceDef } from '../../src/sim/resourceData';
import {
  type City,
  type GameState,
  type Player,
  type Religion,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../src/sim/state';
import { draftCost, nextDraftCost, ref, stripRefs } from '../../src/sim/statecraft';
import { GOVERNMENT_TIERS, type OrderId } from '../../src/sim/statecraftData';
import { availableTechs, playerScience } from '../../src/sim/tech';
import { TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
import { drawWagers } from '../../src/sim/wagers';
import { resetVisibility } from '../../src/sim/visibility';
import {
  CLOSE_HINT,
  OWED_WORDS,
  type ProphetGlance,
  QUICK_BUTTONS,
  QUICK_NAMES,
  SUPPLY_CAPTION,
  SUPPLY_EMPTY,
  beliefOwed,
  cultureOwedWords,
  draftFigures,
  draftGlance,
  doorGate,
  draftTierWords,
  draftTitle,
  empireGlance,
  faithDoorGate,
  faithFigure,
  governmentWords,
  greyedLabel,
  leaderWords,
  panelLabel,
  panelStep,
  prophetGlance,
  quickLabel,
  quickTitle,
  researchGlance,
  researchNextWords,
  researchRateWords,
  researchTurnsMark,
  routesDoorGate,
  statecraftOwed,
  supplyFingerprint,
  tierWords,
  wagerGlance,
  wagerWords,
} from '../../src/ui/empireDrawer';
import { researchProgress } from '../../src/ui/researchProgress';
import { type CopyCount, strategicHoldings } from '../../src/ui/resourceCopies';
import { tabFigures } from '../../src/ui/topBar';
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

// --- 1 · opening and closing -------------------------------------------------

describe('opening and closing', () => {
  it('opens on a click, a tap, Enter or Q, and closes on the same again', () => {
    expect(panelStep(false, 'toggle')).toBe(true);
    expect(panelStep(true, 'toggle')).toBe(false);
  });

  it('closes on Escape, a press outside or a screen opening, and stays closed', () => {
    expect(panelStep(true, 'close')).toBe(false);
    expect(panelStep(false, 'close')).toBe(false);
  });

  it('has no hover peek any more: the board opens the card on a click', () => {
    const drawer = uiSource('empireDrawer.ts');
    for (const gone of ['pointerenter', 'PEEK_DELAY_MS', 'LEAVE_DELAY_MS', 'mayPeek', 'canPeek']) {
      expect(drawer, gone).not.toContain(gone);
    }
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

  it('lights for a belief to choose, but no longer on the Faith mark', () => {
    // The user, 2026-11-17: a god waiting for a name is no dot on the Faith
    // mark. The banner still counts it, as the End Turn blocker does.
    const state = solo();
    seatOf(state).pantheon.pending = { options: [] };
    const glance = empireGlance(state, 0)!;
    expect(glance.owed).toEqual(['belief']);
    expect(glance.faith.dot).toBe(false);
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
    // The turns are on the line, beside the draft's bar; the detail names the tier.
    expect(draftFigures(glance)).toBe(`30/${cost}`);
    expect(draftTierWords(glance)).toBe('Tier 5');
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
    expect(draftFigures(glance)).toBe(`30/${cost}`);
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
    // The open line prints the next government on a line of its own.
    expect(governmentWords(glance)).toBe(`next government at ${next}`);
    // Past the last government there is nothing more to name.
    player.statecraft.drafts = GOVERNMENT_TIERS[GOVERNMENT_TIERS.length - 1]! + 1;
    const late = draftGlance(state, player);
    expect(late.nextGovernment).toBeNull();
    expect(tierWords(late)).toBe(`Tier ${late.tier}`);
    expect(governmentWords(late)).toBe('');
  });

  it('titles the line with the board’s tooltip: Statecraft, the next draft and the key', () => {
    const state = solo();
    const glance = draftGlance(state, seatOf(state));
    expect(draftTitle(glance)).toMatch(/^Statecraft: (next draft in \d+ turns?|next draft this turn|no culture being made) \(C\)$/);
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

  it('draws each row as the board does, name and shared figure, and opens its Compendium entry', () => {
    const drawer = uiSource('empireDrawer.ts');
    const row = braceBody(drawer, 'function supplyRow(');
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

  it('names the seat on the Leader row, which the open card has no heading for', () => {
    expect(leaderWords('Pachacuti')).toBe('Pachacuti');
    expect(uiSource('empireDrawer.ts')).toContain("`Leader: ${glance.seatName}, your civ.");
  });

  it('prints the research row’s rate and next, and nothing for either when there is none', () => {
    const state = solo();
    const player = seatOf(state);
    const [first, second] = availableTechs(state, 0);
    player.researching = first!;
    const learning = researchGlance(state, player);
    expect(researchRateWords(learning)).toMatch(/^[+−-]?\d+ a turn$/);
    expect(researchNextWords(learning)).toBe('');
    player.researchQueue = [second!];
    expect(researchNextWords(researchGlance(state, player))).toBe(`next: ${techDef(second!).name}`);
    player.researching = null;
    expect(researchRateWords(researchGlance(state, player))).toBe('');
  });

  it('says the way out at the foot of the open card', () => {
    expect(CLOSE_HINT).toBe('Q or Esc closes');
  });
});

describe('the live figures on Routes and Faith', () => {
  it('prints the bar’s own routes figure, running against the cap, and marks a free slot', () => {
    const state = solo();
    const glance = empireGlance(state, 0)!;
    const bar = tabFigures(state, 0);
    expect(glance.routes).toEqual({ text: bar.routes, words: bar.routesSpoken, free: bar.routeSpare });
    expect(glance.routes.text).toMatch(/^\d+\/\d+$/);
  });

  it('prints the faith banked, out of the Faith sheet’s reading and the purchase gate', () => {
    const state = solo();
    const glance = empireGlance(state, 0)!;
    const reading = explainNextRung(state, 0, readEmpire(state, 0).totals.faith);
    const banked = Math.max(0, Math.floor(seatOf(state).faithPool));
    expect(glance.faith).toEqual(faithFigure(reading, banked, prophetGlance(state, 0)));
    expect(glance.faith.words.startsWith(nextRungWords(reading))).toBe(true);
  });

  const unready: ProphetGlance = { callable: false, price: 200, complete: false };

  it('shows banked over price while the next god has a price, with the line, rose once met', () => {
    const open: NextRung = { kind: 'open', rung: 2, cost: 72, banked: 41, perTurn: 14, turns: 3 };
    const saving = faithFigure(open, 41, unready);
    expect(saving).toMatchObject({ text: '41/72', met: false, dot: false, note: 'next god' });
    expect(saving.fraction).toBeCloseTo(41 / 72);
    expect(saving.words).toBe(nextRungWords(open));
    const met = faithFigure({ ...open, banked: 73, turns: 0 }, 73, unready);
    expect(met).toMatchObject({ text: '73/72', met: true, fraction: 1 });
  });

  it('prints the one number in every other state, and names the next thing in its title', () => {
    const waiting = faithFigure({ kind: 'waiting' }, 73, unready);
    expect(waiting).toMatchObject({ text: '73', fraction: null, met: false, dot: false, note: 'god waiting' });
    expect(waiting.words).toBe(`${nextRungWords({ kind: 'waiting' })}. A prophet costs 200 faith`);
    const full = faithFigure({ kind: 'full' }, 141, unready);
    expect(full).toMatchObject({ text: '141', fraction: null, note: 'pantheon full' });
    const closed: NextRung = { kind: 'closed', tech: TECH_IDS[0]! };
    const shut = faithFigure(closed, 12, unready);
    expect(shut).toMatchObject({ text: '12', fraction: null, note: 'place closed' });
    expect(shut.words.startsWith(nextRungWords(closed))).toBe(true);
  });

  it('lights the dot only for a prophet the seat can call, and never once its religion is full', () => {
    const full: NextRung = { kind: 'full' };
    const callable = faithFigure(full, 214, { callable: true, price: 200, complete: false });
    expect(callable.dot).toBe(true);
    expect(callable.note).toBe('call a prophet');
    expect(callable.words).toBe(`${nextRungWords(full)}. You have the faith to call a prophet`);
    const done = faithFigure(full, 400, { callable: true, price: 200, complete: true });
    expect(done.dot).toBe(false);
    expect(done.words).toBe(nextRungWords(full));
  });
});

describe('the prophet reading', () => {
  it('is the purchase gate’s own answer in the seat’s towns, and the capital’s price', () => {
    const state = bench();
    const capital = town(state, 4, 4);
    const prophet = { kind: 'unit', id: 'prophet' } as const;
    seatOf(state).faithPool = 0;
    bumpRevision(state);
    const poor = prophetGlance(state, 0);
    expect(poor.callable).toBe(false);
    expect(poor.price).toBe(explainPurchaseCost(state, 0, capital.id, prophet, 'faith')!.total);
    // Rich in faith but without the technology prophets need: the gate says
    // no, so there is no dot.
    seatOf(state).faithPool = 10_000;
    bumpRevision(state);
    expect(purchaseError(state, 0, capital.id, prophet, 'faith')).not.toBeNull();
    expect(prophetGlance(state, 0).callable).toBe(false);
    seatOf(state).techsResearched.push('theHighTemple' as TechId);
    bumpRevision(state);
    expect(purchaseError(state, 0, capital.id, prophet, 'faith')).toBeNull();
    expect(prophetGlance(state, 0).callable).toBe(true);
  });

  it('finds the prophet by its marker and asks the gate, never a price beside it', () => {
    const drawer = uiSource('empireDrawer.ts');
    const reading = braceBody(drawer, 'export function prophetGlance(');
    expect(reading).toContain("purchaseError(state, playerId, town.id, item, 'faith') === null");
    expect(reading).not.toContain('faithPool');
    expect(braceBody(drawer, 'function prophetTypes(')).toContain('def.prophesies === true');
  });

  it('says the religion is complete once every belief it can hold is chosen', () => {
    const state = bench();
    town(state, 4, 4);
    expect(prophetGlance(state, 0).complete).toBe(false);
    const religion = {
      id: 'r1',
      founderId: 0,
      name: 'Test',
      pantheon: [],
      follower: [],
      enhancer: [],
      foundedTurn: 1,
    } as unknown as Religion;
    state.religions.push(religion);
    expect(prophetGlance(state, 0).complete).toBe(false);
    religion.follower = religionBeliefPool(religion, 'follower').slice(0, poolSlotsFor(state, religion, 'follower'));
    religion.enhancer = religionBeliefPool(religion, 'enhancer').slice(0, poolSlotsFor(state, religion, 'enhancer'));
    expect(nextBeliefPool(state, religion)).toBeNull();
    expect(prophetGlance(state, 0).complete).toBe(true);
  });
});

describe('the greyed doors (batch SS9a)', () => {
  it('greys Faith on a fresh seat, and names Divination from the next-rung reading', () => {
    const state = solo();
    const gate = faithDoorGate(state, 0)!;
    expect(gate).not.toBeNull();
    expect(gate.tech).toBe('divination');
    expect(stripRefs(gate.words)).toBe('Opens when you research Divination');
    expect(stripRefs(gate.line)).toBe('Faith opens when you research Divination');
    expect(stripRefs(gate.note)).toBe('opens with Divination');
    // The describers' keyword ref for the technology, and no number in the prose.
    expect(gate.words).toContain(ref('tech', 'divination', 'Divination'));
    for (const words of [gate.words, gate.line, gate.note]) expect(stripRefs(words)).not.toMatch(/\d/);
    expect(greyedLabel(gate)).toBe('Faith, not open yet. Faith opens when you research Divination');
  });

  it('opens Faith with Divination, and early for a seat with faith of its own', () => {
    const state = solo();
    const player = seatOf(state);
    player.techsResearched.push('divination' as TechId);
    bumpRevision(state);
    expect(faithDoorGate(state, 0)).toBeNull();
    // A ruin, a leader or a card that brings faith before Divination.
    const early = solo();
    seatOf(early).faithPool = 15;
    bumpRevision(early);
    expect(faithDoorGate(early, 0)).toBeNull();
  });

  it('greys Routes until the caravan’s technology, Currency, or a route slot', () => {
    const state = bench();
    town(state, 4, 4);
    const gate = routesDoorGate(state, 0)!;
    expect(gate.tech).toBe('currency');
    expect(stripRefs(gate.line)).toBe('Routes opens when you research Currency');
    // Currency opens it, whether or not a market stands yet.
    seatOf(state).techsResearched.push('currency' as TechId);
    bumpRevision(state);
    expect(routesDoorGate(state, 0)).toBeNull();
    // A slot from a building before Currency opens it early.
    const early = bench();
    const town2 = town(early, 4, 4);
    town2.buildings.push('market');
    bumpRevision(early);
    expect(routesDoorGate(early, 0)).toBeNull();
  });

  it('puts both gates in the panel’s reading, and the keys ask the same one', () => {
    const state = solo();
    const glance = empireGlance(state, 0)!;
    expect(glance.gates.faith).toEqual(faithDoorGate(state, 0));
    expect(glance.gates.routes).toEqual(routesDoorGate(state, 0));
    expect(doorGate(state, 0, 'faith')).toEqual(glance.gates.faith);
    expect(doorGate(state, 0, 'routes')).toEqual(glance.gates.routes);
    const main = uiSource('main.ts');
    expect(main).toContain("else if (!greyedDoorRefuses('faith')) religion?.open();");
    expect(main).toContain("else if (!greyedDoorRefuses('routes')) trade?.open();");
    expect(main).toContain('onGreyed: (line) => controls.guide(`☞ ${line}.`),');
  });

  it('draws a greyed door dimmed with no figure, reachable, and never silent', () => {
    const drawer = uiSource('empireDrawer.ts');
    const paint = braceBody(drawer, 'function paintGate(');
    expect(paint).toContain("button.classList.toggle('is-greyed', gate !== null);");
    expect(paint).toContain("button.setAttribute('aria-disabled', 'true');");
    expect(paint).toContain('setDescriptorText(note, gate.note, { linked: false });');
    // No technology id is compared in the panel: the readings name it.
    expect(braceBody(drawer, 'export function faithDoorGate(')).not.toMatch(/'divination'/);
    expect(braceBody(drawer, 'export function routesDoorGate(')).not.toMatch(/'currency'/);
    const css = uiSource('style.css');
    expect(css).toContain('.quick-button.is-greyed .quick-mark {\n  opacity: 0.45;');
    expect(css).toContain('.quick-button.is-greyed .quick-figure,\n.quick-button.is-greyed .quick-line {\n  display: none;');
    expect(uiSource('index.html')).toContain('id="quick-routes-note"');
  });
});

describe('the marks’ names and keys', () => {
  it('names each mark and its key in its title and accessible name, in the board’s order', () => {
    expect(QUICK_BUTTONS).toEqual(['diplomacy', 'routes', 'faith', 'standings']);
    expect(QUICK_BUTTONS.map((name) => QUICK_NAMES[name].key)).toEqual(['W', 'E', 'H', 'S']);
    expect(quickTitle('standings')).toBe('Standings (S)');
    expect(quickTitle('routes', 'Trade: 1 of 3 routes running')).toBe('Routes (E): Trade: 1 of 3 routes running');
    expect(quickLabel('diplomacy')).toBe('Diplomacy. Opens the Diplomacy sheet (W)');
    expect(quickLabel('faith', 'The pantheon is full')).toBe('Faith: The pantheon is full. Opens the Faith sheet (H)');
  });
});

// --- 5 · the wiring ------------------------------------------------------------

describe('the markup', () => {
  const html = uiSource('index.html');
  const corner = html.slice(html.indexOf('<div id="empire-corner"'), html.indexOf('<!-- ================= the star chart'));
  const top = corner.slice(corner.indexOf('id="empire-top"'), corner.indexOf('id="empire-quick"'));
  const banner = top.slice(top.indexOf('id="empire-panel"'), top.indexOf('</button>', top.indexOf('id="empire-panel"')));
  const quick = corner.slice(corner.indexOf('id="empire-quick"'), corner.indexOf('id="empire-drawer"'));
  const drawer = corner.slice(corner.indexOf('id="empire-drawer"'));

  it('makes the banner the toggle that controls the open part, with the arrow under it', () => {
    expect(banner).toContain('aria-expanded="false"');
    expect(banner).toContain('aria-controls="empire-drawer"');
    expect(banner).toContain('id="empire-banner"');
    expect(banner).toContain('class="empire-panel-arrow"');
  });

  it('makes the two lines buttons: the technology opens the star chart, the next draft Statecraft', () => {
    const research = top.slice(top.indexOf('id="hud-research"'), top.indexOf('id="drawer-culture"'));
    const draft = top.slice(top.indexOf('id="drawer-culture"'));
    expect(research).toContain('aria-controls="tech-overlay"');
    for (const id of ['tech-current', 'empire-research-bar', 'empire-research-turns', 'research-figures', 'research-rate', 'research-next']) {
      expect(research, id).toContain(`id="${id}"`);
    }
    expect(research).toContain('>T</kbd>');
    expect(draft).toContain('aria-controls="statecraft-overlay"');
    for (const id of ['empire-draft-fill', 'empire-draft-turns', 'culture-figures', 'culture-tier', 'culture-government', 'culture-owed']) {
      expect(draft, id).toContain(`id="${id}"`);
    }
    expect(draft).toContain('>C</kbd>');
    // Underlined names with an arrow (the user's pick), not raised keys.
    expect((top.match(/class="empire-line-arrow"/g) ?? []).length).toBe(2);
    expect(top).toContain('>Next draft</span');
  });

  it('grows in place: the marks under the top part, the open part last', () => {
    const order = ['id="empire-top"', 'id="empire-quick"', 'id="empire-drawer"'].map((marker) => corner.indexOf(marker));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    // The four marks are not in the part that grows, so opening it cannot move them.
    for (const name of QUICK_BUTTONS) {
      expect(quick, name).toContain(`id="quick-${name}"`);
      expect(drawer, name).not.toContain(`id="quick-${name}"`);
    }
  });

  it('gives each mark its sheet, in the board’s order, with the name and key its open row shows', () => {
    const controls = ['diplomacy-overlay', 'trade-overlay', 'religion-overlay', 'victory-overlay'];
    let from = 0;
    QUICK_BUTTONS.forEach((name, at) => {
      const start = quick.indexOf(`id="quick-${name}"`);
      expect(start, name).toBeGreaterThan(from);
      from = start;
      const button = quick.slice(start, quick.indexOf('</button>', start));
      expect(button, name).toContain(`aria-controls="${controls[at]}"`);
      expect(button, name).toContain('class="quick-mark"');
      expect(button, name).toContain(`<span class="quick-name">${QUICK_NAMES[name].name}</span>`);
      expect(button, name).toContain(`>${QUICK_NAMES[name].key}</kbd>`);
    });
    for (const id of ['quick-routes-figure', 'quick-faith-figure', 'quick-faith-note', 'quick-faith-line']) {
      expect(quick, id).toContain(`id="${id}"`);
    }
  });

  it('orders the open part as the board does: Leader, the wager, Supply', () => {
    const order = ['id="drawer-leader"', 'id="drawer-wager"', 'id="drawer-supply"', 'id="drawer-close-hint"'].map(
      (marker) => drawer.indexOf(marker),
    );
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    // The four screens are the marks' rows, and there is no × to press.
    expect(drawer).not.toContain('id="drawer-faith"');
    expect(drawer).not.toContain('id="drawer-close"');
    expect(drawer).toContain('>L</kbd>');
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

  it('sizes the card at rest as the board does: 248 by 131, 16 px from the left, 12 px under the bar', () => {
    expect(css).toContain('--empire-panel-w: 248px;');
    expect(css).toContain('--empire-panel-h: 131px;');
    const corner = rule('.empire-corner');
    expect(corner).toContain('top: calc(var(--topbar-h) + 12px);');
    expect(corner).toContain('left: 16px;');
    expect(corner).toContain('width: var(--empire-panel-w);');
    expect(corner).toContain('flex-direction: column;');
    // What adds up to 131: two 36 px lines (24 + 4 + a 4 px bar + 4) 4 apart
    // inside 8 px of padding, a 36 px mark row, the hairline and the edge.
    expect(rule('.empire-lines')).toContain('padding: 8px 8px 8px 0;');
    expect(rule('.empire-lines')).toContain('gap: 4px;');
    expect(rule('.empire-line-head')).toContain('height: 24px;');
    expect(rule('.empire-line-head')).toContain('margin-bottom: 4px;');
    expect(rule('.empire-line')).toContain('padding: 0 0 4px;');
    expect(rule('.empire-bar')).toContain('height: 4px;');
    expect(rule('.quick-button')).toContain('height: 36px;');
    // The banner column: 12 of padding, the 20 px banner, 8 of gap.
    expect(rule('.empire-panel')).toContain('width: 40px;');
    expect(rule('.empire-panel')).toContain('padding: 12px 8px 12px 12px;');
  });

  it('opens downward in place: the open part has no position of its own', () => {
    expect(css).not.toContain('left: calc(14px + var(--empire-panel-w) + 6px);');
    expect(css).not.toMatch(/\n\.empire-drawer \{[^}]*position:/);
    // Open, the card is over the toasts and the chips, and still under the bar.
    const open = /z-index:\s*(\d+)/.exec(rule('.empire-corner.is-open'));
    const toasts = /z-index:\s*(\d+)/.exec(rule('.toasts'));
    expect(Number(open![1])).toBeGreaterThan(Number(toasts![1]));
    // It covers the chips until it closes, tabs and all.
    expect(css).toContain('body:has(.empire-corner.is-open) #hud-commissions {\n  visibility: hidden;');
  });

  it('draws the board’s parts: the bookmark, the underlined lines, the bars and the four marks', () => {
    expect(rule('.empire-banner')).toContain('width: 20px;');
    expect(rule('.empire-banner')).toContain('height: 28px;');
    expect(rule('.empire-banner.is-owed::after')).toContain('background: var(--vermilion);');
    expect(rule('.empire-line-title,\n.empire-line-arrow')).toContain('text-decoration: underline;');
    expect(css).toContain('.empire-line:hover .empire-line-title,\n.empire-line:hover .empire-line-arrow {\n  text-decoration-color: var(--ink);');
    expect(rule('.empire-bar.is-research .empire-bar-fill')).toContain('var(--lapis)');
    expect(rule('.empire-bar.is-draft .empire-bar-fill')).toContain('var(--grape)');
    expect(rule('.empire-quick')).toContain('grid-template-columns: 44px minmax(0, 1fr) minmax(0, 1fr) 44px;');
    expect(rule('.quick-figure.is-free')).toContain('color: var(--teal);');
    expect(rule('.quick-figure.is-met')).toContain('color: var(--y-faith);');
    expect(rule('.quick-line')).toContain('height: 2px;');
    expect(rule('.quick-button.is-owed::after')).toContain('background: var(--vermilion);');
    expect(css).toContain('.empire-panel.is-open .empire-panel-arrow {');
    // And the panel writes all of it from one place.
    const paint = braceBody(uiSource('empireDrawer.ts'), 'function paintTop(');
    expect(paint).toContain("banner.classList.toggle('is-owed', glance.owed.length > 0);");
    expect(paint).toContain("panel.setAttribute('aria-label', panelLabel(glance));");
    const quick = braceBody(uiSource('empireDrawer.ts'), 'function paintQuick(');
    expect(quick).toContain("routesFigure.classList.toggle('is-free', routes.free);");
    expect(quick).toContain("faithFigureEl.classList.toggle('is-met', faith.met);");
    expect(quick).toContain("quick.faith.classList.toggle('is-owed', faith.dot);");
    const setOpen = braceBody(uiSource('empireDrawer.ts'), 'function setOpen(');
    expect(setOpen).toContain("corner.classList.toggle('is-open', next);");
    expect(setOpen).toContain("panel.setAttribute('aria-expanded', String(next));");
    expect(setOpen).toContain('drawer.hidden = !next;');
  });

  it('turns the marks into rows of the card’s one shape while it is open', () => {
    expect(rule('.quick-name,\n.quick-note,\n.quick-key')).toContain('display: none;');
    expect(rule('.empire-corner.is-open .empire-quick')).toContain('flex-direction: column;');
    expect(rule('.empire-corner.is-open .quick-name')).toContain('margin-left: 18px;');
    expect(rule('.empire-corner.is-open .quick-key')).toContain('display: grid;');
    expect(rule('.drawer-row')).toContain('padding: 0 12px 0 48px;');
    expect(rule('.drawer-row')).toContain('height: 36px;');
    // The lines grow their figures and keys only while the card is open.
    expect(rule('.empire-line-detail')).toContain('display: none;');
    expect(rule('.empire-corner.is-open .empire-line-detail')).toContain('display: flex;');
  });

  it('stands the card and the chips down on the city screen', () => {
    for (const id of ['#empire-corner', '#hud-commissions']) {
      expect(css, id).toContain(`body:has(.city-mode:not([hidden])) ${id},`);
    }
    for (const gone of ['#hud-dock', '#hud-holdings', '--research-card-h', '--hud-dock-h']) {
      expect(css, gone).not.toContain(gone);
    }
  });
});

describe('the panel’s own wiring', () => {
  const drawer = uiSource('empireDrawer.ts');
  const code = drawer.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('tells the registry when it opens, and only then', () => {
    const setOpen = braceBody(drawer, 'function setOpen(');
    expect((setOpen.match(/options\.onOpen\(\)/g) ?? []).length).toBe(1);
    const opening = setOpen.slice(setOpen.indexOf('if (next) {'));
    expect(opening.indexOf('options.onOpen()')).toBeGreaterThan(-1);
    expect(opening.indexOf('options.onOpen()')).toBeLessThan(opening.indexOf('} else if'));
    expect((code.match(/options\.onOpen\(\)/g) ?? []).length).toBe(1);
  });

  it('grows the card from any part of the top that is not one of the two lines', () => {
    expect(drawer).toContain("top.addEventListener(\n    'click',");
    expect(drawer).toContain("if (target?.closest('.empire-line')) return;");
    // The banner is a button inside the top part, so its click arrives there:
    // no second listener on it that would toggle twice.
    expect(drawer).not.toContain("panel.addEventListener('click'");
    // The draft line is Statecraft's door; the research line is the star chart's own.
    expect(drawer).toContain("draftLine.addEventListener('click', () => options.openStatecraft(), { signal });");
  });

  it('puts the keyboard back on the banner when it closes with the keyboard on a row', () => {
    const setOpen = braceBody(drawer, 'function setOpen(');
    expect(setOpen).toContain('const heldKeyboard = drawer.contains(document.activeElement);');
    expect(setOpen).toContain('panel.focus({ preventScroll: true });');
  });

  it('wraps Tab inside the whole card while it is open', () => {
    expect(drawer).toContain('corner.querySelectorAll<HTMLElement>(FOCUSABLE)');
    expect(drawer).toContain("if (!open || event.key !== 'Tab') return;");
  });

  it('closes on a press outside the card, and through the registry', () => {
    expect(drawer).toContain('if (target !== null && corner.contains(target)) return;');
    expect(drawer).toContain('close,');
  });

  it('opens each mark’s own screen, unless the door is greyed', () => {
    expect(drawer).toContain('if (gate !== null) options.onGreyed?.(stripRefs(gate.line));');
    expect(drawer).toContain('else options.openQuick[name]();');
    expect(QUICK_BUTTONS).toEqual(['diplomacy', 'routes', 'faith', 'standings']);
  });

  it('binds every listener to one controller that dispose aborts', () => {
    const binds = [...code.matchAll(/addEventListener\(/g)].length;
    // The options object closing an `addEventListener` call, not the destructuring.
    const signalled = [...code.matchAll(/\{ (capture: true, )?signal \},?\s*\)/g)].length;
    expect(binds).toBeGreaterThan(5);
    expect(signalled).toBe(binds);
    expect(braceBody(drawer, '    dispose(): void {')).toContain('listening.abort();');
    expect(code).not.toContain('createPopover');
  });

  it('opens nothing on a card that is not drawn, as on the city screen', () => {
    expect(braceBody(drawer, 'function toggle(')).toContain('if (!open && !shown()) return;');
  });

  it('redraws on the state, the revision and the seat, not on every pointer move', () => {
    const render = braceBody(drawer, 'function render(');
    expect(render).toContain('state === drawnState && state.revision === drawnRevision && seatId === drawnSeat');
  });
});

describe('main.ts', () => {
  const main = uiSource('main.ts');

  it('registers the card as a card, and says it is opening when it opens', () => {
    expect(main).toContain("screens.register(held('drawer', 'card', () => empireDrawer));");
    expect(main).toContain("onOpen: () => screens.opening('drawer'),");
  });

  it('disposes it with the boot and refreshes it with the HUD', () => {
    expect(main).toContain('gameDisposers.push(() => empireDrawer?.dispose());');
    expect(main).toContain('empireDrawer?.render();');
  });

  it('wires every line, mark and row to the screen it names', () => {
    for (const door of [
      'openStatecraft: () => statecraft?.open(),',
      'openLeader: () => leaderSheet?.open(),',
      'openWager: () => wagerSheet?.open(),',
      'diplomacy: () => diplomacy?.open(),',
      'routes: () => trade?.open(),',
      'faith: () => religion?.open(),',
      'standings: () => victory?.open(),',
      'statusCard: researchSection,',
    ]) {
      expect(main, door).toContain(door);
    }
  });

  it('makes each mark and the draft line the one door its sheet gives the keyboard back to', () => {
    for (const trigger of [
      'trigger: quickFaithButton,',
      'trigger: quickRoutesButton,',
      'trigger: quickDiplomacyButton,',
      'trigger: quickStandingsButton,',
      'trigger: draftLineButton,',
    ]) {
      expect(main, trigger).toContain(trigger);
    }
    // One door each: no sheet keeps a second door in the bar.
    expect(main).not.toContain('doors: () => [');
    const shell = uiSource('modalShell.ts');
    expect(shell).toContain('returnTo = allDoors().find((door) => door === active) ?? trigger ?? null;');
    expect(shell).toContain('returnTo?.focus({ preventScroll: true });');
  });

  it('has taken the three tabs out of the bar and the Statecraft row out of the menu', () => {
    const bar = uiSource('topBar.ts');
    for (const gone of ['diplomacyTab', 'tradeTab', 'standingsTab', 'onOpenDiplomacy', 'onOpenTrade', 'onOpenStandings']) {
      expect(bar, gone).not.toContain(gone);
    }
    expect(main).not.toContain('civYields.diplomacyTab');
    expect(main).not.toContain('menuStatecraftButton');
    const html = uiSource('index.html');
    expect(html).not.toContain('id="topbar-tabs"');
    expect(html).not.toContain('id="menu-statecraft"');
  });

  it('re-places the tutorial’s ring when the card opens or closes', () => {
    expect(main).toContain('onChange: () => tutorial.refresh(),');
  });

  it('mounts the commission chips after the card, so the keyboard reaches them last', () => {
    expect(main).toContain('else empireCornerEl.after(commissionRail.root);');
  });
});

describe('the Q, L and S keys', () => {
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

  it('binds S to the standings sheet, and leaves Cmd + S and Ctrl + S to the browser', () => {
    const at = main.indexOf('const onStandingsKey = (event: KeyboardEvent): void => {');
    expect(at).toBeGreaterThan(-1);
    const handler = main.slice(at, main.indexOf('\n  };', at));
    expect(handler).toContain("if (event.key !== 's' && event.key !== 'S') return;");
    expect(handler).toContain('if (event.ctrlKey || event.metaKey || event.altKey) return;');
    expect(handler).toContain('if (isInputBlocked()) return;');
    expect(handler).toContain('else victory?.open();');
    expect(main).toContain("gameDisposers.push(() => window.removeEventListener('keydown', onStandingsKey));");
    // Nothing else binds S: the board's own switch has no branch for it.
    expect(controls).not.toContain("event.key === 's'");
    expect(controls).not.toContain("event.key === 'S'");
  });

  it('lists all three on the ? card', () => {
    const html = uiSource('index.html');
    const help = html.slice(html.indexOf('id="help-overlay"'), html.indexOf('id="help-compendium"'));
    expect(help).toContain('<kbd>Q</kbd>');
    expect(help).toContain('<kbd>L</kbd> your leader');
    expect(help).toContain('<kbd>S</kbd> the Standings');
  });
});
