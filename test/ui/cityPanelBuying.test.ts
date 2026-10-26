/**
 * Buying on the city screen (batch UX5, the user's A1 ruling of 2026-10-12),
 * held as data. `buildListModel` is everything the add list prints, and the
 * panel draws it without deciding anything (`cityPanel.ts`).
 *
 * The core claim is the one the city audit asked for: no build row the list
 * leaves pressable is refused by `buildError`, and no price it leaves pressable
 * is refused by `purchaseError`. It is checked the strongest way available: each
 * pressable row and each pressable price is sent to the reducer, on a copy of
 * the state, as exactly the command a press sends, and the reducer must take
 * it. That is the check that would have caught the Trader row, which looked
 * pressable and was refused every time.
 *
 * The rest are the batch's other promises: a shared refusal said once, a queued
 * building kept in the list at full price, no retired row, caravans as a line
 * to the trade sheet, a Faith shelf, the treasury in the band, and a refused
 * command said in the work rail.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { type Command, type CommandResult, applyCommand } from '../../src/sim/commands';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { getTileAt } from '../../src/sim/map';
import {
  type PurchasableItem,
  explainPurchaseCost,
  purchaseError,
} from '../../src/sim/purchase';
import {
  type City,
  type GameState,
  type QueueItem,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { buildError } from '../../src/sim/tech';
import { TECH_IDS } from '../../src/sim/techData';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import {
  type BuildListRow,
  type BuildListShelf,
  banksInView,
  buildListModel,
  cultureCaption,
  ordinalWord,
  queueWithAdded,
  queuedMark,
} from '../../src/ui/cityPanel';
import { SHARED_SUBJECT } from '../../src/ui/refusalLine';
import { RULES } from '../../src/sim/rulesData';
import { HAMMER, YIELD_GLYPH } from '../../src/ui/figures';
import { braceBody, uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

// --- towns ------------------------------------------------------------------

/** Seat 0's capital on the first turn, the settler spent founding it. The scout stays on the hex. */
function firstTurn(): { state: GameState; city: City } {
  const { state } = createGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const settler = state.units.find((u) => u.ownerId === 0 && unitDef(u.type).foundsCity)!;
  const city = foundCityAt(state, 0, getTileAt(state.map, settler.col, settler.row)!);
  state.units = state.units.filter((u) => u.id !== settler.id);
  const player = playerById(state, 0)!;
  player.gold = 100;
  player.faithPool = 30;
  bumpRevision(state);
  return { state, city };
}

/**
 * The same capital grown up: every technology, eight citizens, a full purse, a
 * queue with a building at the front and one further back, hammers banked, and
 * a warrior standing in the town.
 */
function developed(): { state: GameState; city: City } {
  const { state, city } = firstTurn();
  state.units = state.units.filter((u) => !(u.col === city.col && u.row === city.row));
  const player = playerById(state, 0)!;
  player.techsResearched = [...TECH_IDS];
  player.gold = 900;
  player.faithPool = 100;
  city.population = 8;
  city.queue = [
    { kind: 'building', id: 'granary' },
    { kind: 'unit', id: 'worker' },
    { kind: 'building', id: 'library' },
  ];
  city.hammerBasket = 30;
  createUnit(state, 0, 'warrior', city.col, city.row);
  bumpRevision(state);
  return { state, city };
}

/** The wonder `magnificent()` builds. */
const FRONT_WONDER = 'theOracle' as const;

/**
 * The developed town building a wonder at the front of its queue, with
 * Magnificence seated and the draft pool holding enough culture to buy it
 * (Magisterial batch MG11).
 */
function magnificent(): { state: GameState; city: City } {
  const { state, city } = developed();
  city.queue = [{ kind: 'building', id: FRONT_WONDER }, ...city.queue];
  const player = playerById(state, 0)!;
  const card = 'magnificence' as OrderId;
  player.statecraft.orders.push(card);
  player.statecraft.slots.push({ card, sealedUntil: state.turn });
  player.culturePool = 5000;
  bumpRevision(state);
  return { state, city };
}

/** The developed town, taken by force and not yet annexed. */
function puppet(): { state: GameState; city: City } {
  const town = developed();
  town.city.puppet = true;
  bumpRevision(town.state);
  return town;
}

// --- helpers ----------------------------------------------------------------

/** What the reducer says to a command, asked of a copy so the town is untouched. */
function sent(state: GameState, command: Command): CommandResult {
  return applyCommand(structuredClone(state), command);
}

function verdict(result: CommandResult): string {
  return result.ok ? 'taken' : result.error;
}

function queueItemOf(row: BuildListRow): QueueItem | null {
  if (row.kind === 'unit') return { kind: 'unit', id: row.id };
  if (row.kind === 'building') return { kind: 'building', id: row.id };
  if (row.kind === 'project') return { kind: 'project', id: row.id };
  return null;
}

function purchasableOf(row: BuildListRow): PurchasableItem | null {
  if (row.kind === 'building') return { kind: 'building', id: row.id };
  if (row.kind === 'project') return null;
  return { kind: 'unit', id: row.id };
}

function shelf(shelves: readonly BuildListShelf[], which: BuildListShelf['shelf']): BuildListShelf {
  const found = shelves.find((entry) => entry.shelf === which);
  if (found === undefined) throw new Error(`no ${String(which)} shelf`);
  return found;
}

/** The rows a shelf shows: the ones the town can use, read as queued, or buy. */
function rows(shelves: readonly BuildListShelf[]): BuildListRow[] {
  return shelves.flatMap((entry) => entry.rows);
}

/** Every row a shelf holds, the ones folded under "Not yet" included. */
function everyRow(shelves: readonly BuildListShelf[]): BuildListRow[] {
  return shelves.flatMap((entry) => [...entry.rows, ...entry.notYet.map((folded) => folded.row)]);
}

// --- the core claim -----------------------------------------------------------

describe('nothing the list leaves pressable is refused', () => {
  /**
   * Sends every pressable row and price in one town to the reducer and counts
   * the looks, so the test below can check it was not vacuous.
   */
  function check(label: string, state: GameState, city: City): Record<string, number> {
    const locked = city.puppet === true;
    const counts = { enabled: 0, buy: 0, short: 0, none: 0 };
    const shelves = buildListModel(state, city, 0, 'all', locked);
    // A folded row is drawn without a build button or a price, so nothing in
    // it can be pressed; the model folds a row only when no price of it could
    // be (batch UX7).
    for (const { row } of shelves.flatMap((entry) => entry.notYet)) {
      for (const cell of row.cells) expect(cell.look.look, `${label}: ${row.name} folded`).toBe('none');
    }
    for (const row of rows(shelves)) {
      const item = queueItemOf(row);
      if (item !== null && row.kind !== 'offer' && row.enabled) {
        counts.enabled += 1;
        expect(buildError(state, 0, item.kind, item.id, city), `${label}: ${row.name}`).toBeNull();
        const command: Command = {
          type: 'setCityProduction',
          playerId: 0,
          cityId: city.id,
          queue: queueWithAdded(city.queue, item),
        };
        expect(verdict(sent(state, command)), `${label}: queue ${row.name}`).toBe('taken');
      }
      const bought = purchasableOf(row);
      for (const cell of row.cells) {
        expect(bought, `${label}: ${row.name} has a price but nothing to buy`).not.toBeNull();
        const refusal = purchaseError(state, 0, city.id, bought, cell.look.bank);
        const command: Command = {
          type: 'purchaseItem',
          playerId: 0,
          cityId: city.id,
          item: bought!,
          currency: cell.look.bank,
        };
        if (cell.look.look === 'buy') {
          counts.buy += 1;
          expect(refusal, `${label}: buy ${row.name}`).toBeNull();
          expect(verdict(sent(state, command)), `${label}: buy ${row.name}`).toBe('taken');
        } else if (cell.look.look === 'short') {
          counts.short += 1;
          expect(refusal, `${label}: ${row.name} short`).not.toBeNull();
          expect(sent(state, command).ok, `${label}: ${row.name} short`).toBe(false);
        } else {
          counts.none += 1;
          // The dash carries the gate's own sentence to the line that says it.
          expect(cell.look.refusal, `${label}: ${row.name}`).toBe(refusal);
        }
      }
    }
    return counts;
  }

  it('has every pressable build row and price taken by the reducer, in four towns', () => {
    const totals = { enabled: 0, buy: 0, short: 0, none: 0 };
    for (const [label, town] of [
      ['first turn', firstTurn()],
      ['developed', developed()],
      ['puppet', puppet()],
      // A wonder at the front of the queue, with a culture price on it.
      ['magnificent', magnificent()],
    ] as const) {
      const counts = check(label, town.state, town.city);
      for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += counts[key];
    }
    // Not vacuous: every look appears, and many rows are pressable.
    expect(totals.enabled).toBeGreaterThan(10);
    expect(totals.buy).toBeGreaterThan(3);
    expect(totals.short).toBeGreaterThan(0);
    expect(totals.none).toBeGreaterThan(10);
  });

  it('presses nothing in a puppet: it chooses for itself, and spends nothing', () => {
    const { state, city } = puppet();
    for (const row of everyRow(buildListModel(state, city, 0, 'all', true))) {
      if (row.kind !== 'offer') expect(row.enabled, row.name).toBe(false);
      for (const cell of row.cells) expect(cell.look.look, row.name).toBe('none');
    }
  });

  it('greys a build row only with a reason the screen prints', () => {
    // Every refusal is on screen (batch UX5: never only in a native tooltip).
    // Since batch UX7 a row that cannot be queued and cannot be bought folds
    // under "Not yet" with its reason; one the list keeps greyed is a row that
    // can still be bought, or a building already in the queue, and the panel
    // prints its build refusal on a line under it (`buildReason`).
    let folded = 0;
    for (const town of [firstTurn(), developed()]) {
      const shelves = buildListModel(town.state, town.city, 0, 'all', false);
      for (const { row, reason } of shelves.flatMap((entry) => entry.notYet)) {
        folded += 1;
        if (reason.kind === 'text') expect(reason.text, row.name).not.toBe('');
        else expect(reason.resources.length, row.name).toBeGreaterThan(0);
      }
      for (const row of rows(shelves)) {
        if (row.kind === 'unit' && !row.enabled) {
          // Kept although it cannot be queued: it can be bought.
          expect(row.cells.some((cell) => cell.look.look !== 'none'), row.name).toBe(true);
        }
        if (row.kind === 'building' && !row.enabled) {
          expect(row.blocked !== null || row.queued !== null, row.name).toBe(true);
        }
      }
    }
    expect(folded).toBeGreaterThan(0);
    const list = braceBody(uiSource('cityPanel.ts'), 'function renderBuildables(');
    expect(list).toContain('const why = buildReason(row);');
  });
});

// --- a wonder bought with culture ------------------------------------------------

describe('a wonder bought with culture (Magisterial batch MG11)', () => {
  it('prices only the wonder at the front of the queue in culture, at the gate’s own figure', () => {
    const { state, city } = magnificent();
    const shelves = buildListModel(state, city, 0, 'all', false);
    const cultured = everyRow(shelves).filter((row) =>
      row.cells.some((cell) => cell.look.bank === 'culture'),
    );
    expect(cultured.map((row) => row.name)).toEqual([buildingDef(FRONT_WONDER).name]);
    const cell = cultured[0]!.cells.find((entry) => entry.look.bank === 'culture')!;
    const price = explainPurchaseCost(state, 0, city.id, { kind: 'building', id: FRONT_WONDER }, 'culture')!;
    expect(cell.look).toEqual({ look: 'buy', bank: 'culture', price: price.total });
  });

  it('names the culture held in the column’s heading, after gold', () => {
    const { state, city } = magnificent();
    const shelves = buildListModel(state, city, 0, 'all', false).filter(
      (entry) => entry.shelf !== 'faith',
    );
    expect(banksInView(shelves)).toEqual(['gold', 'culture']);
  });

  it('draws no culture price without the card', () => {
    const { state, city } = developed();
    city.queue = [{ kind: 'building', id: FRONT_WONDER }, ...city.queue];
    playerById(state, 0)!.culturePool = 5000;
    bumpRevision(state);
    const cells = everyRow(buildListModel(state, city, 0, 'all', false)).flatMap((row) => row.cells);
    expect(cells.some((cell) => cell.look.bank === 'culture')).toBe(false);
  });

  it('says in the caption that a culture price is what is left, at the rules’ rate', () => {
    expect(cultureCaption()).toBe(
      `Culture prices are what a wonder still needs, at ${RULES.production.culturePerHammer}` +
        `${YIELD_GLYPH.culture} per ${HAMMER}. The hammers it has banked are used, and the ` +
        'culture comes from what you are saving for your next Order hand.',
    );
    const list = braceBody(uiSource('cityPanel.ts'), 'function renderBuildables(');
    expect(list).toContain("if (ordinary.includes('culture')) {");
  });
});

// --- where refusals are said ---------------------------------------------------

describe('a refusal is said once per reason', () => {
  it('says a reason several rows share once, at the head of the shelf', () => {
    // The scout stands in the town, so no soldier can be bought into it.
    const { state, city } = firstTurn();
    const units = shelf(buildListModel(state, city, 0, 'all', false), 'unit');
    const stands = `A Scout already stands in ${city.name} — move it first`;
    expect(units.refusals).toEqual([{ text: stands, mark: null }]);
    const covered = units.rows.filter((row) =>
      row.cells.some((cell) => cell.look.look === 'none' && cell.look.refusal === stands),
    );
    expect(covered.length).toBeGreaterThan(1);
    for (const row of covered) {
      expect(row.cells[0]!.place, row.name).toEqual({ at: 'head', mark: null });
    }
  });

  it('says a reason only one row has under that row', () => {
    // A worker stands in the town as well as the scout: of the rows the list
    // shows, only the Worker is refused for it (the Settler folds away, the
    // town being too small), so that reason is said under the Worker's row.
    const { state, city } = firstTurn();
    createUnit(state, 0, 'worker', city.col, city.row);
    bumpRevision(state);
    const units = shelf(buildListModel(state, city, 0, 'all', false), 'unit');
    const worker = units.rows.find((row) => row.kind === 'unit' && row.id === 'worker')!;
    expect(worker.cells[0]!.place).toEqual({
      at: 'row',
      text: purchaseError(state, 0, city.id, { kind: 'unit', id: 'worker' }, 'gold'),
    });
  });

  it('says every wonder’s refusal once, not once per wonder', () => {
    const { state, city } = developed();
    const wonders = shelf(buildListModel(state, city, 0, 'all', false), 'wonder');
    expect(wonders.rows.length).toBeGreaterThan(2);
    expect(wonders.refusals).toEqual([
      { text: `${SHARED_SUBJECT} is a wonder — it must be built, not bought`, mark: null },
    ]);
    for (const row of wonders.rows) {
      expect(row.cells.map((cell) => cell.place), row.name).toEqual([{ at: 'head', mark: null }]);
    }
  });

  it('adds nothing for a dash whose reason the row already says', () => {
    // A unit the empire has no spare horses for is refused by the queue and the
    // purchase gate in the same words. Since batch UX7 it folds under "Not yet"
    // with the requirement and its counts, and its dash never reaches the
    // shelf's head.
    const { state, city } = developed();
    const units = shelf(buildListModel(state, city, 0, 'all', false), 'unit');
    const horsed = units.notYet.filter(({ row }) => row.kind === 'unit' && row.wantsResource);
    expect(horsed.length).toBeGreaterThan(0);
    for (const { row, reason } of horsed) {
      if (row.kind !== 'unit') continue;
      expect(reason.kind, row.name).toBe('resource');
      expect(row.cells[0]!.look).toMatchObject({ look: 'none', refusal: row.blocked });
      expect(row.cells[0]!.place, row.name).toBeNull();
      expect(units.refusals.map((line) => line.text), row.name).not.toContain(row.blocked);
    }
  });
});

// --- the queue ---------------------------------------------------------------

describe('a queued building stays in the add list', () => {
  it('keeps its row, marked by its place, at the full price', () => {
    const { state, city } = developed();
    const buildings = shelf(buildListModel(state, city, 0, 'all', false), 'building');
    const granary = buildings.rows.find((row) => row.kind === 'building' && row.id === 'granary');
    const library = buildings.rows.find((row) => row.kind === 'building' && row.id === 'library');
    expect(granary).toMatchObject({ queued: 1, enabled: false });
    expect(library).toMatchObject({ queued: 3, enabled: false });
    // The figure is the whole price, as a copy nobody has started would show.
    const fresh = structuredClone(state);
    const freshCity = fresh.cities.find((entry) => entry.id === city.id)!;
    freshCity.queue = [];
    freshCity.hammerBasket = 0;
    bumpRevision(fresh);
    for (const id of ['granary', 'library'] as const) {
      const row = buildings.rows.find((entry) => entry.kind === 'building' && entry.id === id)!;
      const whole = explainPurchaseCost(fresh, 0, city.id, { kind: 'building', id }, 'gold')!.total;
      expect(row.cells[0]!.look, id).toEqual({ look: 'buy', bank: 'gold', price: whole });
    }
  });

  it('marks the place in plain ordinals', () => {
    expect(queuedMark(1)).toBe('in queue · 1st');
    expect(queuedMark(3)).toBe('in queue · 3rd');
    expect([2, 4, 11, 12, 13, 21, 22, 101].map(ordinalWord)).toEqual([
      '2nd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '101st',
    ]);
  });

  it('buys the current build in one press: struck from the queue, its hammers passed on', () => {
    const { state, city } = developed();
    const command: Command = {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: { kind: 'building', id: 'granary' },
      currency: 'gold',
    };
    expect(verdict(applyCommand(state, command))).toBe('taken');
    // What the panel repaints from: the granary stands, the worker is being
    // built now with the banked hammers, and the list no longer offers it.
    expect(city.buildings).toContain('granary');
    expect(city.queue[0]).toEqual({ kind: 'unit', id: 'worker' });
    expect(city.hammerBasket).toBe(30);
    const after = everyRow(buildListModel(state, city, 0, 'all', false));
    expect(after.some((row) => row.kind === 'building' && row.id === 'granary')).toBe(false);
    expect(after.find((row) => row.kind === 'building' && row.id === 'library')).toMatchObject({
      queued: 2,
    });
  });

  it('puts a new row in front of any standing project', () => {
    const queue: QueueItem[] = [
      { kind: 'building', id: 'granary' },
      { kind: 'project', id: 'tithes' },
    ];
    expect(queueWithAdded(queue, { kind: 'unit', id: 'worker' })).toEqual([
      { kind: 'building', id: 'granary' },
      { kind: 'unit', id: 'worker' },
      { kind: 'project', id: 'tithes' },
    ]);
    // A copy: the town's own queue is never the one edited.
    expect(queue).toHaveLength(2);
  });
});

// --- which rows exist -----------------------------------------------------------

describe('which rows print', () => {
  it('prints no retired row, the augur included', () => {
    expect(unitDef('augur').retired).toBe(true);
    const retiredUnits = new Set(UNIT_TYPE_IDS.filter((id) => unitDef(id).retired === true));
    const retiredBuildings = new Set(BUILDING_IDS.filter((id) => buildingDef(id).retired === true));
    for (const town of [firstTurn(), developed()]) {
      for (const row of everyRow(buildListModel(town.state, town.city, 0, 'all', false))) {
        if (row.kind === 'unit' || row.kind === 'offer') {
          expect(retiredUnits.has(row.id), row.id).toBe(false);
        }
        if (row.kind === 'building') expect(retiredBuildings.has(row.id), row.id).toBe(false);
      }
    }
  });

  it('turns caravans into a line to the trade sheet, never a build row', () => {
    const { state, city } = developed();
    const units = shelf(buildListModel(state, city, 0, 'all', false), 'unit');
    expect(units.caravans).toBe(true);
    for (const row of units.rows) {
      if (row.kind === 'unit') expect(unitDef(row.id).routeOnly === true, row.id).toBe(false);
    }
    // No caravan is open on the first turn, so no line either.
    const early = firstTurn();
    expect(shelf(buildListModel(early.state, early.city, 0, 'all', false), 'unit').caravans).toBe(
      false,
    );
    // The line opens the trade sheet through the panel's existing option.
    const list = braceBody(uiSource('cityPanel.ts'), 'function renderBuildables(');
    expect(list).toContain("'Caravans are hired on the trade sheet →'");
    expect(list).toContain("link.addEventListener('click', () => onOpenTrade());");
    expect(list).toContain('if (shelf.caravans) into.append(tradeSheetLine());');
  });

  it('gathers what is bought with faith on a Faith shelf, priced in faith', () => {
    const { state, city } = developed();
    const shelves = buildListModel(state, city, 0, 'all', false);
    const faith = shelf(shelves, 'faith');
    expect(faith.rows.length).toBeGreaterThan(0);
    for (const row of faith.rows) {
      expect(row.kind, row.name).toBe('offer');
      expect(row.cells.map((cell) => cell.look.bank), row.name).toEqual(['faith']);
    }
    // A thing bought with gold and never built stays with the units, beside
    // the bank it draws on — once something has opened it for this empire. The
    // Company Guard is a card's to open (batch UX7: hidden until it is); with
    // the card held it is a row of the units, waiting on a Barracks here.
    const units = shelf(shelves, 'unit');
    expect(unitDef('companyGuard').unlockedByCard).toBe(true);
    expect(everyRow([units]).some((row) => row.id === 'companyGuard')).toBe(false);
    const carded = developed();
    const sc = playerById(carded.state, 0)!.statecraft;
    sc.orders.push('theCharteredCompany' as OrderId);
    sc.slots.push({ card: 'theCharteredCompany' as OrderId, sealedUntil: carded.state.turn });
    bumpRevision(carded.state);
    // No Barracks here yet: it waits under "Not yet", in the gate's own words.
    const waiting = shelf(buildListModel(carded.state, carded.city, 0, 'unit', false), 'unit');
    const folded = waiting.notYet.find(({ row }) => row.id === 'companyGuard');
    expect(folded?.reason).toEqual({
      kind: 'text',
      text: purchaseError(carded.state, 0, carded.city.id, { kind: 'unit', id: 'companyGuard' }, 'gold'),
    });
    // With one, it is a row of the units, priced in gold.
    carded.city.buildings.push('barracks');
    bumpRevision(carded.state);
    const open = shelf(buildListModel(carded.state, carded.city, 0, 'unit', false), 'unit');
    const guard = open.rows.find((row) => row.kind === 'offer' && row.id === 'companyGuard');
    expect(guard?.cells.map((cell) => cell.look.bank)).toEqual(['gold']);
    // Each tab shows its own shelf and nothing else.
    expect(buildListModel(state, city, 0, 'faith', false).map((entry) => entry.shelf)).toEqual([
      'faith',
    ]);
    expect(buildListModel(state, city, 0, 'unit', false).map((entry) => entry.shelf)).toEqual([
      'unit',
    ]);
    // And it heads its column with the faith bank.
    expect(braceBody(uiSource('cityPanel.ts'), 'function renderBuildables(')).toContain(
      "if (shelf.shelf === 'faith') into.append(priceHeadElement([held('faith')]));",
    );
  });
});

// --- the band and the work rail --------------------------------------------------

describe('the band and the work rail', () => {
  it('shows the treasury in the band, just left of the six chips', () => {
    const band = braceBody(uiSource('cityPanel.ts'), 'function renderBand(');
    const banks = band.indexOf('band.append(bankLineElement(readBanks(state, localPlayerId())));');
    expect(banks).toBeGreaterThan(band.indexOf('band.append(title);'));
    expect(band.indexOf('band.append(renderYieldChips(city, quote));')).toBeGreaterThan(banks);
  });

  it('says a refused command in the work rail, in the reducer’s words', () => {
    const panel = uiSource('cityPanel.ts');
    const report = braceBody(panel, 'function report(command: Command, result: CommandResult)');
    expect(report).toContain('text: result.error,');
    expect(report).toContain('revision: getGame().state.revision,');
    expect(report).toContain('render();');
    // Every command the work rail sends ends on that reporter.
    for (const verb of ['function commit(', 'function buy(', 'function give(']) {
      expect(braceBody(panel, verb), verb).toContain('if (!report(command, dispatch(getGame(), command)).ok) return;');
    }
    const rail = braceBody(panel, 'function renderWorkRail(');
    expect(rail).toContain("if (notice !== null) rail.append(refusalLineElement(notice, 'command'));");
    expect(rail.indexOf("refusalLineElement(notice, 'command')")).toBeLessThan(
      rail.indexOf('renderProduction(city, locked, quote)'),
    );
  });
});
