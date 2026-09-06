/**
 * The Ledger — where this turn's yield comes from, and where the curve goes.
 *
 * `docs/loop-review.md` §3, bands 1 and 2 (band 3 is a labelled hole until the
 * lifetime tally has a schema field). Three kinds of test, and the split is this
 * suite's usual one (`reliquaryScreen.test.ts` says why): the **reading** is a
 * fold over the state and is driven for real, the **register** is a walk over
 * every id the game can hand a breakdown line, and the drawing lives in
 * browser-only code with no jsdom here, so it is asserted by reading the source
 * and the stylesheet.
 *
 * What is guarded here is not cosmetic. Four things render perfectly and are
 * wrong:
 *
 *   1. **The bands disagreeing with the chip that opened them.** The sheet is
 *      reached from the yield strip, so a total that is not `civYields`' total
 *      is a sheet contradicting the number the player clicked. Pinned voice by
 *      voice on a real bench.
 *   2. **A source quietly falling to "other".** A card class nobody classified,
 *      or a maintenance label the simulation renamed, does not throw — it grows
 *      the grey slice and tells nobody. So every id in every table is walked,
 *      and every label `explainEmpireGold` can emit is read out of its own
 *      source.
 *   3. **A summand added to `cityQuote` and not here.** `cityFlatsByClass` is a
 *      deliberate mirror of that function; the mirror is pinned by folding it
 *      and comparing against `CityQuote.flats` itself.
 *   4. **A leaked window listener, or a curve carried into the next game.**
 *      Entry LVII's bug in a new costume, and the ring buffer's own version of
 *      it.
 */

import { describe, expect, it } from 'vitest';

import {
  EMPIRE_GOLD_CLASS,
  LEDGER_BAND3_EYEBROW,
  LEDGER_BAND3_NOTE,
  LEDGER_CLASSES,
  LEDGER_CLASS_NAME,
  LEDGER_CURVE_FOOTNOTE,
  LEDGER_HISTORY_CAP,
  type LedgerClass,
  type LedgerSample,
  cityFlatsByClass,
  classifyCard,
  classifyEmpireGold,
  createLedgerHistory,
  foldLedgerBag,
  ledgerCaption,
  ledgerReading,
  ledgerSample,
  netFigure,
  shareOut,
  sparkPoints,
} from '../../src/ui/ledgerScreen';
import { civYields } from '../../src/ui/topBar';
import { cityQuote } from '../../src/sim/cities';
import type { CardId } from '../../src/sim/statecraftData';
import { DOCTRINE_IDS, GOVERNMENT_IDS, ORDER_IDS } from '../../src/sim/statecraftData';
import { ALL_BELIEF_IDS, CONSECRATION_IDS, RITE_IDS } from '../../src/sim/religionData';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { BUILDING_IDS, isWonder } from '../../src/sim/buildingData';
import { TECH_IDS } from '../../src/sim/techData';
import {
  BEAD_ENDEAVOUR_IDS,
  BEAD_FEAT_IDS,
  BEAD_GRANT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RECKONING_IDS,
} from '../../src/sim/beadData';
import type { GameState } from '../../src/sim/state';
import { playerById } from '../../src/sim/state';
import { found, game } from '../sim/statecraftHelpers';

const SOURCES = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/{main.ts,style.css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/sim/empireGold.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../index.html', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

function raw(file: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(`/${file}`));
  if (key === undefined) throw new Error(`${file} was not globbed`);
  return SOURCES[key]!;
}

/** One file's source with its comments taken out — the prose explains the rules. */
function source(file: string): string {
  return raw(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * A seat with a town, a market, a wonder, a slotted Order and a belief — one of
 * every class the bands split on, so "the parts sum to the total" is a claim
 * about a bar with something in every slice rather than about an empty one.
 */
function bench(): { state: GameState; playerId: number } {
  const made = game();
  const state = made.state;
  const city = found(state, 0);
  city.population = 4;
  city.buildings.push('monument', 'library');
  const wonder = BUILDING_IDS.find((id) => isWonder(id));
  if (wonder) city.buildings.push(wonder);
  const player = playerById(state, 0)!;
  const sc = player.statecraft;
  // An Order that pays a yield in every town — the point of the bench is a bar
  // with something in the deck's slice, not a bar with a war bonus in it.
  const order = 'weightsAndMeasures' as (typeof ORDER_IDS)[number];
  if (!sc.orders.includes(order)) sc.orders.push(order);
  sc.slots.push({ card: order, sealedUntil: state.turn });
  player.pantheon = { beliefs: [ALL_BELIEF_IDS[0]!], rungs: 1 };
  return { state, playerId: 0 };
}

// --- band 1: the fold -------------------------------------------------------

describe('the reading', () => {
  it('adds up, voice by voice, to the very figure the chip beside it prints', () => {
    // The whole bargain of the sheet: it is `civYields`' summands, never a
    // second derivation of `civYields`. A band that disagreed with the top bar
    // would be a band contradicting the number the player clicked to open it.
    const { state, playerId } = bench();
    const headline = civYields(state, playerId);
    for (const voice of ledgerReading(state, playerId)) {
      expect(voice.total, voice.key).toBe(headline[voice.key]);
      let parts = 0;
      for (const cls of LEDGER_CLASSES) parts += voice.byClass[cls];
      expect(parts, `${voice.key} parts`).toBe(voice.total);
    }
  });

  it('mirrors `cityQuote`’s own flats, summand for summand', () => {
    // `cityFlatsByClass` walks the same seven lists `cityQuote` folds. A source
    // added there and not here would not throw — it would quietly swell the
    // town's multiplied total into whichever classes happened to have weight.
    const { state } = bench();
    for (const city of state.cities) {
      if (city.ownerId !== 0) continue;
      const flats = foldLedgerBag(cityFlatsByClass(state, city));
      const quote = cityQuote(state, city);
      for (const key of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
        expect(flats[key], `${city.name} ${key}`).toBe(quote.flats[key]);
      }
    }
  });

  it('finds the deck’s own slice, and says so in the caption’s words', () => {
    const { state, playerId } = bench();
    const reading = ledgerReading(state, playerId);
    // Something, somewhere, is the deck's: the bench slots an Order and swears a
    // government, and a government always pays *something*.
    const deck = reading.reduce((sum, voice) => sum + voice.byClass.deck, 0);
    expect(deck).not.toBe(0);
    const science = reading.find((voice) => voice.key === 'science')!;
    const caption = ledgerCaption(science);
    expect(caption.startsWith('your deck makes')).toBe(true);
    expect(caption.endsWith('science')).toBe(true);
  });

  it('says “no science yet” rather than “0 of 0” for an empire with nothing', () => {
    const empty = { key: 'science' as const, total: 0, byClass: emptyClasses() };
    expect(ledgerCaption(empty)).toBe('your deck makes no science yet');
    const noDeck = { key: 'gold' as const, total: 9, byClass: { ...emptyClasses(), tiles: 9 } };
    expect(ledgerCaption(noDeck)).toBe('your deck makes none of your 9 gold');
    // A treasury in arrears keeps its sign: `figure` prints a magnitude, and an
    // empire paying twelve gold a turn more than it earns must not read as one
    // earning twelve.
    const owing = { key: 'gold' as const, total: -12, byClass: { ...emptyClasses(), other: -12 } };
    expect(netFigure(-12)).toBe('\u221212');
    expect(ledgerCaption(owing)).toContain('\u221212 gold');
  });
});

function emptyClasses(): Record<LedgerClass, number> {
  const bag = {} as Record<LedgerClass, number>;
  for (const cls of LEDGER_CLASSES) bag[cls] = 0;
  return bag;
}

// --- the register -----------------------------------------------------------

/**
 * **Every class of card, and where its slice lands.**
 *
 * The classification is by id and never by label (see the module docblock), so
 * this is a walk over the id tables themselves rather than over a run: a row
 * added to `data/statecraft.json` is classified the day it is added, and a
 * *class* added to `CardId` is a compile-time change that this list will not
 * cover — which is exactly the moment somebody has to decide which bar it
 * belongs in.
 */
/**
 * The ids two tables share, and which bar each resolves to.
 *
 * `CardId`'s docblock says the ten id spaces are disjoint and for four rows they
 * are not: three Doctrines carry the same name as a bead, and one building does
 * (`data/statecraft.json`, `data/beads.json`, `data/buildings.json`). Nothing
 * downstream can tell a breakdown line carrying one of them apart, so what
 * matters is that this file resolves it **the way `anyCardDef` already does** —
 * same arms, same order — or a figure would land in one bar with its name in
 * another. Held as a list so that the day the data is disentangled, this is the
 * test that points at it.
 */
const SHARED_IDS: readonly [string, LedgerClass][] = [
  // Doctrine vs bead endeavour, and Doctrine vs bead quest: the deck is asked
  // first in both files, so the deck wins.
  ['theEncyclopaedia', 'deck'],
  ['theTithe', 'deck'],
  ['theStandingArmy', 'deck'],
  // Building vs bead grant: the bead arm is asked before the building arm in
  // both files, so the bead wins — and a bead is "other".
  ['theTurningHeavens', 'other'],
];

const notShared = (id: string): boolean => !SHARED_IDS.some(([shared]) => shared === id);

const CARD_CLASSES: readonly [string, readonly string[], LedgerClass][] = [
  ['governments', GOVERNMENT_IDS, 'deck'],
  ['doctrines', DOCTRINE_IDS, 'deck'],
  ['orders', ORDER_IDS, 'deck'],
  ['beliefs', ALL_BELIEF_IDS, 'religion'],
  ['rites', RITE_IDS, 'religion'],
  ['consecrations', CONSECRATION_IDS, 'religion'],
  ['great people', GREAT_PERSON_IDS, 'people'],
  ['technologies', TECH_IDS, 'other'],
  ['bead feats', BEAD_FEAT_IDS.filter(notShared), 'other'],
  // Three bead rows share a name with a Doctrine (see `SHARED_IDS` below), so
  // they are lifted out of these rows rather than papered over: they are the
  // subject of their own test, and the day the collision is fixed that test is
  // what points at it.
  ['bead endeavours', BEAD_ENDEAVOUR_IDS.filter(notShared), 'other'],
  ['bead quests', BEAD_QUEST_IDS.filter(notShared), 'other'],
  ['bead reckonings', BEAD_RECKONING_IDS.filter(notShared), 'other'],
  ['bead grants', BEAD_GRANT_IDS.filter(notShared), 'other'],
];

/**
 * The two classes that land in **"other"** on purpose, written down rather than
 * discovered: a technology's card effects and a bead's cap. Neither is a source
 * a player goes looking for on this sheet — a technology is not a thing you
 * built and a bead is not a thing you own — and a ninth bar for two rows would
 * be a bar that is empty in nine games out of ten.
 */
const DELIBERATE_OTHERS: readonly string[] = ['technologies', 'beads'];

describe('the source register', () => {
  it('classifies every card in every table, and never by its spelling', () => {
    for (const [what, ids, expected] of CARD_CLASSES) {
      for (const id of ids) {
        expect(classifyCard(id as CardId), `${what} · ${id}`).toBe(expected);
      }
    }
  });

  it('resolves the ids two tables share exactly as `anyCardDef` does', () => {
    // Three tables, as plain strings — the point is which *names* two of them
    // both use, and a typed id would refuse to be compared across spaces that
    // are supposed to be disjoint.
    const tables: readonly string[][] = [
      [
        ...BEAD_FEAT_IDS,
        ...BEAD_ENDEAVOUR_IDS,
        ...BEAD_QUEST_IDS,
        ...BEAD_RECKONING_IDS,
        ...BEAD_GRANT_IDS,
      ],
      [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS],
      [...BUILDING_IDS],
    ];
    // The list is closed: a fifth collision is a data change nobody meant to
    // make, and it should be read here before it is read as a wrong slice.
    const everything = tables.flat();
    const collisions = [...new Set(everything)].filter(
      (id) => tables.filter((table) => table.includes(id)).length > 1,
    );
    expect(collisions.sort()).toEqual(SHARED_IDS.map(([id]) => id).sort());
    for (const [id, expected] of SHARED_IDS) {
      expect(classifyCard(id as CardId), id).toBe(expected);
    }
  });

  it('splits the stones: a wonder is its own bar, an ordinary building is not', () => {
    for (const id of BUILDING_IDS.filter(notShared)) {
      expect(classifyCard(id as CardId), id).toBe(isWonder(id) ? 'wonders' : 'buildings');
    }
  });

  it('names the classes that fall to “other” deliberately', () => {
    // The list is the point of the test: an "other" nobody wrote down is a slice
    // that grows as the game does and tells nobody.
    expect(DELIBERATE_OTHERS).toEqual(['technologies', 'beads']);
    for (const [what, , expected] of CARD_CLASSES) {
      if (expected !== 'other') continue;
      expect(DELIBERATE_OTHERS.some((name) => what.startsWith(name.slice(0, 4)))).toBe(true);
    }
  });

  it('gives every empire-gold line the simulation emits a bar of its own', () => {
    // `TradeGoldLine` offers no handle but its label, so the map is keyed on the
    // head of it — everything before the ` · count` tail, exactly as
    // `empireTradeLines` in `topBar.ts` keys its hover detail. The heads are read
    // out of `empireGold.ts` itself so a rename there fails here rather than
    // silently moving a bill into "the land".
    const emitted = new Set<string>();
    for (const match of source('empireGold.ts').matchAll(/source: `([^`·]+?)(?: ·|`)/g)) {
      emitted.add(match[1]!.trim());
    }
    expect(emitted.size).toBeGreaterThan(0);
    for (const head of emitted) {
      expect(Object.keys(EMPIRE_GOLD_CLASS), head).toContain(head);
    }
    // And the fallback is the land, because the one line with no fixed head is a
    // luxury's share of the connection gold.
    expect(classifyEmpireGold('Spices · city connections')).toBe('tiles');
    expect(classifyEmpireGold('Unit maintenance · 7 units')).toBe('other');
  });

  it('gives every class a plain name, with no identifier in it', () => {
    for (const cls of LEDGER_CLASSES) {
      const name = LEDGER_CLASS_NAME[cls];
      expect(name.length, cls).toBeGreaterThan(0);
      expect(name, cls).toBe(name.toLowerCase());
    }
    expect(LEDGER_CLASS_NAME.deck).toBe('your deck');
  });
});

// --- the arithmetic ---------------------------------------------------------

describe('sharing a multiplied total back out', () => {
  it('always hands out exactly the total, however the rounding falls', () => {
    for (const total of [0, 1, 7, 96, -12, 1001]) {
      for (const weights of [[1, 1, 1], [3, 0, 1], [7, 11, 13, 17], [1]]) {
        const shares = shareOut(total, weights);
        expect(shares.reduce((sum, part) => sum + part, 0), `${total} over ${weights}`).toBe(total);
      }
    }
  });

  it('hands a weightless basket’s figure to the last slot', () => {
    // Which callers make `other` — a number with no earner is what that class is
    // for, and dropping it would make the parts stop summing to the total.
    expect(shareOut(5, [0, 0, 0])).toEqual([0, 0, 5]);
    expect(shareOut(0, [])).toEqual([]);
  });

  it('keeps a share roughly proportional to what earned it', () => {
    expect(shareOut(100, [1, 3])).toEqual([25, 75]);
  });
});

describe('the sparkline', () => {
  it('spans the box, first sample at the left and last at the right', () => {
    const points = sparkPoints([0, 5, 10], 100, 40, 0, 10);
    expect(points[0]).toEqual([0, 40]);
    expect(points[2]).toEqual([100, 0]);
  });

  it('draws one sample as a reading, not as a dot in the corner', () => {
    expect(sparkPoints([4], 100, 40, 0, 10)).toEqual([[100, 24]]);
  });
});

// --- band 2: the session's curve --------------------------------------------

function sample(turn: number): LedgerSample {
  const zero = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
  return { turn, age: 1, totals: { ...zero }, deck: { ...zero } };
}

describe('the curve’s ring buffer', () => {
  it('keeps the newest turns and drops the oldest, at the cap', () => {
    const history = createLedgerHistory(4);
    for (let turn = 1; turn <= 9; turn += 1) history.push(sample(turn));
    expect(history.samples().map((entry) => entry.turn)).toEqual([6, 7, 8, 9]);
  });

  it('caps at a figure the module names, not one a screen made up', () => {
    expect(LEDGER_HISTORY_CAP).toBe(400);
    const history = createLedgerHistory();
    expect(history.cap).toBe(LEDGER_HISTORY_CAP);
  });

  it('empties on a new game — a curve belongs to the game that drew it', () => {
    const history = createLedgerHistory(4);
    history.push(sample(1));
    history.clear();
    expect(history.samples()).toEqual([]);
  });

  it('samples the six totals and the deck’s share of each', () => {
    const { state, playerId } = bench();
    const taken = ledgerSample(state, playerId);
    expect(taken.turn).toBe(state.turn);
    expect(taken.age).toBeGreaterThanOrEqual(1);
    const headline = civYields(state, playerId);
    for (const key of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      expect(taken.totals[key], key).toBe(headline[key]);
      expect(taken.deck[key], `deck ${key}`).toBeTypeOf('number');
    }
  });

  it('says out loud that the curve is the session’s and not the save’s', () => {
    expect(LEDGER_CURVE_FOOTNOTE).toContain('this page is open');
    expect(LEDGER_CURVE_FOOTNOTE).toContain('save');
    expect(LEDGER_CURVE_FOOTNOTE).not.toMatch(/\d/);
  });
});

// --- band 3: the labelled hole ----------------------------------------------

describe('the band that is not built yet', () => {
  it('carries the eyebrow the doc of record names', () => {
    expect(LEDGER_BAND3_EYEBROW).toBe('what the deck has produced');
    expect(source('ledgerScreen.ts')).toContain('LEDGER_BAND3_EYEBROW');
  });

  it('says the lifetime figures are not kept, and prints no number standing in', () => {
    // The Reliquary's ruling one screen over: an em dash where a figure should
    // be is a number the screen does not have, printed as though it did.
    expect(LEDGER_BAND3_NOTE).toContain('not kept yet');
    expect(LEDGER_BAND3_NOTE).not.toMatch(/\d/);
    expect(LEDGER_BAND3_NOTE).not.toContain('—');
  });
});

// --- the sheet, and the door ------------------------------------------------

describe('the eighth parchment sheet', () => {
  it('joins the one capped-overlay rule rather than growing a block of its own', () => {
    const css = raw('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const capped = css.match(/#statecraft-overlay,[\s\S]*?\{\s*overflow: hidden;/);
    expect(capped, 'the capped-overlay rule').not.toBeNull();
    expect(capped![0]).toContain('#ledger-overlay');
    // Both halves of it: the overlay and the sheet inside it.
    const sheets = css.match(/#statecraft-overlay \.statecraft-sheet,[\s\S]*?max-height: 100%/);
    expect(sheets, 'the capped sheet rule').not.toBeNull();
    expect(sheets![0]).toContain('#ledger-overlay .statecraft-sheet');
    // And it is named in exactly the two shared blocks — the cap and the
    // breakpoint that lifts it — and in no rule of its own. A third would be the
    // sheet growing a block that agreed with those two today.
    expect(css.match(/#ledger-overlay \.statecraft-sheet/g)).toHaveLength(2);
    for (const at of [...css.matchAll(/#ledger-overlay \.statecraft-sheet/g)]) {
      const list = css.slice(Math.max(0, (at.index ?? 0) - 400), at.index ?? 0);
      expect(list).toContain('#statecraft-overlay .statecraft-sheet');
    }
  });

  it('stacks its bands at the breakpoint the other sheets share', () => {
    const css = raw('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const queries = [...css.matchAll(/@media \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/g)].filter(
      ([, , body]) => body.includes('#statecraft-overlay'),
    );
    expect(queries).toHaveLength(1);
    expect(Number(queries[0]![1])).toBe(860);
    expect(queries[0]![2]).toContain('.ldg-sparks');
  });

  it('is a dialog on the page, with a close button the screen can focus', () => {
    const html = raw('index.html');
    expect(html).toContain('id="ledger-overlay"');
    expect(html).toContain('id="ledger-body"');
    expect(html).toContain('id="ledger-close"');
  });
});

describe('the door in the yield strip', () => {
  it('makes a yield chip a button, with the strip’s own four lines', () => {
    const bar = source('topBar.ts');
    expect(bar).toContain('onOpenLedger?: (key: YieldKey) => void;');
    // The affordance, the role, the click and the key — the culture chip's own
    // four, said again. A `role` without the class is a button that does not
    // look like one; the class without the keydown is a button a keyboard
    // cannot press.
    const at = bar.indexOf('onOpenLedger(key)');
    expect(at).toBeGreaterThan(-1);
    const window = bar.slice(Math.max(0, at - 800), at + 200);
    expect(window).toContain("classList.add('civ-yield-clickable')");
    expect(window).toContain("setAttribute('role', 'button')");
    expect(window).toContain('open the Ledger');
  });

  it('is wired from main, and hands the chip’s own voice through', () => {
    const main = source('main.ts');
    expect(main).toContain('onOpenLedger: (key) => {');
    expect(main).toContain('ledger?.open(key);');
  });

  it('pushes its disposer into the register every per-game screen joins', () => {
    // Entry LVII: the Ledger binds a capturing `keydown` on the window like
    // every other parchment sheet, so a leaked one would answer Escape for a
    // game that is over.
    expect(source('main.ts')).toContain('gameDisposers.push(() => ledger?.dispose());');
    const screen = source('ledgerScreen.ts');
    expect(screen).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(screen).toContain("window.removeEventListener('keydown', onKeyDown, true)");
  });

  it('samples the curve at the one clean moment, and empties it on a new game', () => {
    const main = source('main.ts');
    const at = main.indexOf('onTurnResolved: () => {');
    expect(at).toBeGreaterThan(-1);
    expect(main.slice(at, at + 900)).toContain('ledgerHistory.push(ledgerSample(');
    expect(main).toContain('ledgerHistory.clear();');
  });

  it('takes its turn in the one-sheet-at-a-time rule, both ways', () => {
    const main = source('main.ts');
    expect(main).toContain('(ledger?.isOpen ?? false)');
    expect(main).toContain('ledger?.close();');
    expect(main).toContain('ledger?.dispose();');
  });
});
