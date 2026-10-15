/**
 * The build list, shortened (batch UX7; the user's rulings of 2026-10-12 in
 * `docs/plans/hud-ux-decisions.md`, "Shortening the build list" and the hover
 * rule).
 *
 * What a row is and where it goes is `buildListModel`'s answer, pure, so most of
 * this is asked of the model: a row this town can never build or buy is hidden,
 * a row blocked for a reason the player can fix folds under "Not yet" with that
 * reason, and a row that can still be bought stays in the list whatever its
 * build says. "Now" is checked the way `cityPanelBuying.test.ts` checks every
 * pressable row: each press is sent to the reducer and must be taken.
 *
 * The rest is the panel's wiring, read off the source because this suite has
 * no document: the Supply strip, the one yield mark, the folded Faith shelf, the
 * tab kept per seat, the work rail's card, the Faith card, Escape, the scroll,
 * and that no native tooltip is left.
 */

import { describe, expect, it } from 'vitest';

import { type TileOffer, foundCityAt } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { getTileAt } from '../../src/sim/map';
import { purchaseError } from '../../src/sim/purchase';
import { readCity } from '../../src/sim/readings';
import {
  type City,
  type GameState,
  type QueueItem,
  bumpRevision,
  playerById,
} from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { buildError, isUnlocked, requiredResource, upgradeTargetForType } from '../../src/sim/tech';
import { TECH_IDS } from '../../src/sim/techData';
import { UNIT_TYPE_IDS, isNaval, unitDef } from '../../src/sim/unitData';
import {
  type BuildListRow,
  type BuildListShelf,
  addTabFor,
  buildListModel,
  buildingNeverHere,
  chipLedgerRows,
  mainYieldOf,
  queueWithFront,
  unitRowShown,
} from '../../src/ui/cityPanel';
import { tilePlateLook } from '../../src/ui/tilePriceTags';
import { braceBody, uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

// --- towns ------------------------------------------------------------------

/** Seat 0's capital on the first turn, the settler spent founding it. */
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

/** The same capital grown up: every technology, eight citizens, a full purse, a queue. */
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
  bumpRevision(state);
  return { state, city };
}

/** Seats a card in seat 0's slots, as a held Order. */
function seat(state: GameState, card: string): void {
  const sc = playerById(state, 0)!.statecraft;
  sc.orders.push(card as OrderId);
  sc.slots.push({ card: card as OrderId, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Puts the sea on one side of the town. */
function onTheCoast(state: GameState, city: City): void {
  getTileAt(state.map, city.col + 1, city.row)!.terrain = 'coast';
  bumpRevision(state);
}

function shelf(shelves: readonly BuildListShelf[], which: BuildListShelf['shelf']): BuildListShelf {
  const found = shelves.find((entry) => entry.shelf === which);
  if (found === undefined) throw new Error(`no ${String(which)} shelf`);
  return found;
}

function everyRow(shelves: readonly BuildListShelf[]): BuildListRow[] {
  return shelves.flatMap((entry) => [...entry.rows, ...entry.notYet.map((folded) => folded.row)]);
}

// --- hidden -------------------------------------------------------------------

describe('a row this town can never build or buy is hidden', () => {
  it('hides a ship inland and shows it on the coast', () => {
    const { state, city } = developed();
    const ships = UNIT_TYPE_IDS.filter(
      (id) =>
        isNaval(unitDef(id)) &&
        unitDef(id).awaitsTech !== true &&
        unitDef(id).retired !== true &&
        isUnlocked(state, 0, 'unit', id) &&
        upgradeTargetForType(state, 0, id) === null,
    );
    // Not vacuous: with every technology, some hull is open to the empire.
    expect(ships.length).toBeGreaterThan(0);
    for (const id of ships) expect(unitRowShown(state, city, id), `${id} inland`).toBe(false);
    expect(everyRow(buildListModel(state, city, 0, 'unit', false)).some((row) => ships.includes(row.id as never))).toBe(false);
    onTheCoast(state, city);
    for (const id of ships) expect(unitRowShown(state, city, id), `${id} on the coast`).toBe(true);
  });

  it('hides a withdrawn unit, whatever the empire knows', () => {
    const { state, city } = developed();
    expect(unitDef('cataphract').retired).toBe(true);
    expect(unitRowShown(state, city, 'cataphract')).toBe(false);
  });

  it('hides a building whose site the town will never have, and keeps one it could meet', () => {
    const { state, city } = developed();
    // A harbour wants the coast, and the ground does not move.
    expect(buildingNeverHere(state, city, 'harbour')).toBe(true);
    onTheCoast(state, city);
    expect(buildingNeverHere(state, city, 'harbour')).toBe(false);
    // A courthouse is for a town taken by force, which a town founded never was.
    expect(buildingNeverHere(state, city, 'courthouse')).toBe(true);
    // A stable wants a pasture or a camp worked, which a worker can lay: it
    // folds under "Not yet" instead, with the queue's own sentence.
    expect(buildingNeverHere(state, city, 'stable')).toBe(false);
    const buildings = shelf(buildListModel(state, city, 0, 'all', false), 'building');
    expect(buildings.notYet.find(({ row }) => row.id === 'stable')?.reason).toEqual({
      kind: 'text',
      text: buildError(state, 0, 'building', 'stable', city),
    });
  });

  it('hides a once-per-realm building that stands in another of the empire’s towns', () => {
    const { state, city } = developed();
    const second = foundCityAt(state, 0, getTileAt(state.map, city.col + 4, city.row + 2)!);
    bumpRevision(state);
    expect(buildingNeverHere(state, second, 'heroicEpic')).toBe(false);
    city.buildings.push('heroicEpic');
    bumpRevision(state);
    expect(buildingNeverHere(state, second, 'heroicEpic')).toBe(true);
    expect(everyRow(buildListModel(state, second, 0, 'all', false)).some((row) => row.id === 'heroicEpic')).toBe(false);
  });

  it('hides a piece only a card or another realm’s leader opens, until it is opened', () => {
    const { state, city } = developed();
    const offers = everyRow(buildListModel(state, city, 0, 'all', false)).map((row) => row.id);
    expect(unitDef('knightsTemplar').unlockedByCard).toBe(true);
    expect(unitDef('canoness').unlockedByLeader).toBe(true);
    expect(offers).not.toContain('knightsTemplar');
    expect(offers).not.toContain('canoness');
  });
});

// --- "Not yet" ------------------------------------------------------------------

describe('a row blocked for a reason the player can fix folds under “Not yet”', () => {
  it('folds a unit with no spare horses, with the requirement as its reason', () => {
    const { state, city } = developed();
    const units = shelf(buildListModel(state, city, 0, 'all', false), 'unit');
    const horseman = units.notYet.find(({ row }) => row.id === 'horseman');
    expect(horseman?.reason).toEqual({ kind: 'resource', resources: requiredResource('unit', 'horseman') });
    expect(units.rows.some((row) => row.id === 'horseman')).toBe(false);
  });

  it('folds a unit the town is too small for, said in plain words', () => {
    const { state, city } = firstTurn();
    const units = shelf(buildListModel(state, city, 0, 'all', false), 'unit');
    expect(units.notYet.find(({ row }) => row.id === 'settler')?.reason).toEqual({
      kind: 'text',
      text: `Settler needs a city of ${unitDef('settler').minCityPop}; ${city.name} has 1`,
    });
  });

  it('folds a building that needs another standing first, in the queue’s own words', () => {
    const { state, city } = developed();
    const buildings = shelf(buildListModel(state, city, 0, 'all', false), 'building');
    expect(buildings.notYet.find(({ row }) => row.id === 'university')?.reason).toEqual({
      kind: 'text',
      text: buildError(state, 0, 'building', 'university', city),
    });
  });

  it('folds what a technology will open on the Faith shelf, in the purchase gate’s words', () => {
    const { state, city } = firstTurn();
    const faith = shelf(buildListModel(state, city, 0, 'all', false), 'faith');
    expect(faith.rows).toEqual([]);
    expect(faith.notYet.find(({ row }) => row.id === 'prophet')?.reason).toEqual({
      kind: 'text',
      text: purchaseError(state, 0, city.id, { kind: 'unit', id: 'prophet' }, 'faith'),
    });
  });

  it('keeps a row in the list while it can still be bought', () => {
    // Foreign Procurement lets a bought unit skip its strategic resource, so the
    // horseman cannot be queued but can be bought: it stays in the list, greyed,
    // with its price pressable and its reason on a line under it.
    const { state, city } = developed();
    seat(state, 'foreignProcurement');
    const units = shelf(buildListModel(state, city, 0, 'all', false), 'unit');
    const horseman = units.rows.find((row) => row.kind === 'unit' && row.id === 'horseman');
    expect(horseman).toMatchObject({ enabled: false, wantsResource: true });
    expect(horseman?.cells[0]?.look.look).toBe('buy');
    expect(units.notYet.some(({ row }) => row.id === 'horseman')).toBe(false);
  });

  it('draws a folded row without a button or a price, and remembers the fold', () => {
    const list = braceBody(uiSource('cityPanel.ts'), 'function renderBuildables(');
    expect(list).toContain("const fold = element('details', 'city-not-yet');");
    expect(list).toContain("line.append(reasonLine(reason, 'city-not-yet-why wanting'));");
    expect(list).toContain('rememberOpen(fold, `Not yet · ${shelf.word}`, false);');
  });
});

// --- "Now" and the queue ----------------------------------------------------------

describe('“Now” and the queue’s arrows', () => {
  it('puts a new row at the front, and moves a queued building there rather than twice', () => {
    const queue: QueueItem[] = [
      { kind: 'building', id: 'granary' },
      { kind: 'unit', id: 'worker' },
      { kind: 'building', id: 'library' },
    ];
    expect(queueWithFront(queue, { kind: 'unit', id: 'warrior' })).toEqual([
      { kind: 'unit', id: 'warrior' },
      ...queue,
    ]);
    expect(queueWithFront(queue, { kind: 'building', id: 'library' })).toEqual([
      { kind: 'building', id: 'library' },
      { kind: 'building', id: 'granary' },
      { kind: 'unit', id: 'worker' },
    ]);
    // A copy: the town's own queue is never the one edited.
    expect(queue).toHaveLength(3);
  });

  it('has every “Now” the list draws taken by the reducer', () => {
    let pressed = 0;
    for (const town of [firstTurn(), developed()]) {
      const { state, city } = town;
      for (const row of buildListModel(state, city, 0, 'all', false).flatMap((entry) => entry.rows)) {
        let item: QueueItem | null = null;
        if (row.kind === 'unit' && row.enabled) item = { kind: 'unit', id: row.id };
        if (row.kind === 'building' && !row.boughtOnly && (row.enabled || (row.queued ?? 0) > 1)) {
          item = { kind: 'building', id: row.id };
        }
        if (item === null) continue;
        pressed += 1;
        const command: Command = {
          type: 'setCityProduction',
          playerId: 0,
          cityId: city.id,
          queue: queueWithFront(city.queue, item),
        };
        const result = applyCommand(structuredClone(state), command);
        expect(result.ok ? 'taken' : result.error, `Now ${row.name}`).toBe('taken');
      }
    }
    expect(pressed).toBeGreaterThan(10);
  });

  it('draws “Now” on the same rows, never on a project, and Shift-click does the same', () => {
    const list = braceBody(uiSource('cityPanel.ts'), 'function renderBuildables(');
    expect(list).toContain("if (row.kind === 'unit' && row.enabled) item = { kind: 'unit', id: row.id };");
    expect(list).toContain("row.kind === 'building' && !row.boughtOnly && (row.enabled || (row.queued ?? 0) > 1)");
    expect(list).toContain('if (event.shiftKey) addNow(item);');
    expect(list).toContain('commit(city, queueWithFront(city.queue, item));');
  });

  it('puts ↓ beside ↑ and × on every queue row', () => {
    const queue = braceBody(uiSource('cityPanel.ts'), 'function renderQueue(');
    expect(queue).toContain("const down = element('button', 'city-icon-button', '↓');");
    expect(queue).toContain('down.disabled = locked || index === city.queue.length - 1;');
    expect(queue).toContain('row.append(up, down, remove);');
  });
});

// --- one-line rows ------------------------------------------------------------------

describe('one line a row', () => {
  it('marks a building with the largest thing it would add, and nothing when it adds nothing', () => {
    const zero = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
    expect(mainYieldOf({ ...zero, food: 2, gold: 1 })).toEqual({ key: 'food', amount: 2 });
    expect(mainYieldOf({ ...zero, science: 3, culture: 3 })).toEqual({ key: 'science', amount: 3 });
    // Rounded for the eye, so a sliver adds no mark.
    expect(mainYieldOf({ ...zero, faith: 0.3 })).toBeNull();
    expect(mainYieldOf(zero)).toBeNull();
    // Taking away is not what a row is marked with.
    expect(mainYieldOf({ ...zero, gold: -2 })).toBeNull();
  });
});

// --- the panel's wiring ----------------------------------------------------------------

describe('the Supply strip', () => {
  it('heads the build list with the empire’s own counts, and is where “No Iron spare” points', () => {
    const panel = uiSource('cityPanel.ts');
    const supply = braceBody(panel, 'function renderSupply(');
    expect(supply).toContain('strategicHoldings(getGame().state, localPlayerId())');
    expect(supply).toContain('copiesFigureNode(count)');
    expect(supply).toContain("anchors.set('supply', strip);");
    const list = braceBody(panel, 'function renderBuildables(');
    expect(list.indexOf('const supply = renderSupply();')).toBeLessThan(
      list.indexOf("box.append(element('h3', undefined, 'Add to queue'));"),
    );
    // It reads `resourceCopies.ts`, never the HUD's holdings rail.
    expect(panel).not.toContain('holdingsRail');
  });
});

describe('the Faith shelf and the tab', () => {
  it('folds the Faith shelf on the All tab unless something on it can be bought now', () => {
    const list = braceBody(uiSource('cityPanel.ts'), 'function renderBuildables(');
    expect(list).toContain("if (shelf.shelf === 'faith' && tab === 'all') {");
    expect(list).toContain("row.cells.some((cell) => cell.look.look === 'buy')");
    expect(list).toContain("rememberOpen(fold, 'Faith shelf', affordable);");
  });

  it('opens on All for every seat until that seat chooses', () => {
    expect(addTabFor(0)).toBe('all');
    expect(addTabFor(7)).toBe('all');
  });
});

describe('the work rail’s card and the Faith card', () => {
  it('raises a build row’s card over the work rail with its buy line', () => {
    const panel = uiSource('cityPanel.ts');
    expect(braceBody(panel, 'function buyLine(')).toContain(
      'setYieldText(line, `Buy outright · ${priceFigureText(look.bank, look.price)} · ${tail}`);',
    );
    // The queue rows and the thing being built raise the same card.
    expect(braceBody(panel, 'function renderQueue(')).toContain(
      'bindRowCard(name, () => itemCard(city, item, index));',
    );
    expect(braceBody(panel, 'function renderProduction(')).toContain(
      'bindRowCard(name, () => itemCard(city, item, 0));',
    );
  });

  it('prices the rites on the Faith card and links to every town’s rites when it can', () => {
    const card = braceBody(uiSource('cityPanel.ts'), 'function renderFaithCard(');
    // Spoken as the act it is, with the visible price left bare (batch UX7b).
    expect(card).toContain("spokenLabel: 'Start',");
    expect(card).not.toContain("setAttribute('aria-label'");
    expect(card).toContain('const openRites = options.onOpenRites;');
    expect(card).toContain("'Rites in every town →'");
  });
});

describe('no native tooltips, and Escape and scrolling', () => {
  it('leaves no title on the city screen or the levy menu', () => {
    // The city audit's problem 6: native tooltips take a second, cannot be
    // styled, and never show on keyboard focus or touch. Notes go through
    // `noteOn` (the panel's hover card), refusals onto lines.
    expect(uiSource('cityPanel.ts')).not.toMatch(/\.title = /);
    expect(uiSource('levyMenu.ts')).not.toMatch(/\.title = /);
    expect(braceBody(uiSource('cityPanel.ts'), 'function noteOn(')).toContain(
      'info.bind(anchor, () => noteNode(text));',
    );
  });

  it('takes a pinned list down before Escape leaves the town', () => {
    const panel = uiSource('cityPanel.ts');
    expect(braceBody(panel, 'function holdEscape(')).toContain(
      "document.addEventListener('keydown', onPinnedEscape, true);",
    );
    const escape = braceBody(panel, 'function onPinnedEscape(');
    expect(escape).toContain('event.stopPropagation();');
    expect(escape).toContain('unpinChip();');
  });

  it('keeps both rails where the player left them across a rebuild of the same town', () => {
    const render = braceBody(uiSource('cityPanel.ts'), 'function render(');
    expect(render.indexOf('const scrolled = railScroll(city);')).toBeLessThan(
      render.indexOf('container.replaceChildren();'),
    );
    expect(render).toContain('workRail.scrollTop = scrolled.work;');
    expect(render).toContain('townRail.scrollTop = scrolled.town;');
  });
});

describe('the labels in a yield list', () => {
  it('names a building’s own percentage once, not "Building · Forum · forum"', () => {
    const { state, city } = developed();
    city.buildings.push('forum');
    bumpRevision(state);
    const labels = chipLedgerRows(state, city, readCity(state, city), 'science').rows.map(
      (row) => row.label,
    );
    expect(labels.some((label) => label.startsWith('Building · Forum'))).toBe(true);
    expect(labels.some((label) => /Forum · forum/i.test(label))).toBe(false);
  });
});

// --- batch UX7b ---------------------------------------------------------------

describe('the board’s tile price plates, in the price column’s three looks', () => {
  const offer = (error: string | null, shortfall: number | null): TileOffer => ({
    col: 0,
    row: 0,
    price: 95,
    error,
    shortfall,
  });

  it('can buy, is short by what the treasury lacks, or is not here', () => {
    expect(tilePlateLook(offer(null, null))).toEqual({ look: 'buy', bank: 'gold', price: 95 });
    expect(tilePlateLook(offer('Costs 95 gold; you have 64', 31))).toEqual({
      look: 'short',
      bank: 'gold',
      price: 95,
      need: 31,
    });
    expect(tilePlateLook(offer('Borders frozen — authority is overdrawn', null))).toEqual({
      look: 'none',
      bank: 'gold',
      price: 95,
      refusal: 'Borders frozen — authority is overdrawn',
    });
  });

  it('draws "need N" under a short plate, a dash on one not here, and says why once', () => {
    const plates = uiSource('tilePriceTags.ts');
    expect(plates).toContain("text: look.look === 'none' ? '—' : price,");
    expect(plates).toContain("...(look.look === 'short' ? { need: look.need } : {}),");
    expect(plates).toContain("need.className = 'tile-price-need wanting';");
    const caption = braceBody(uiSource('cityPanel.ts'), 'function renderBoardCaption(');
    expect(caption).toContain('if (offer.error !== null && offer.shortfall === null) barred.add(offer.error);');
  });
});

describe('the Buy tiles button asks the simulation', () => {
  it('is greyed by the tile gate’s town-wide answer, which Purchased Prosperity lifts', () => {
    const borders = braceBody(uiSource('cityPanel.ts'), 'function renderBorders(');
    expect(borders).toContain('tileBuyingError(state, localPlayerId(), city.id)');
    expect(borders).not.toContain('growth.frozen\n        ?');
    expect(borders).toContain("if (refusal !== null) box.append(refusalLineElement(refusal, 'row'));");
  });
});

describe('“Now” beside the row, never over it', () => {
  it('makes room beside the build button, at least as wide as “Now”', () => {
    const css = uiSource('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = (selector: string): string => {
      const at = css.indexOf(`\n${selector} {`);
      if (at < 0) throw new Error(`no rule for ${selector}`);
      return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
    };
    const room = /padding-right:\s*(\d+)px/.exec(
      rule(
        '.city-buildable-row:hover > .city-buildable-lead.has-now,\n.city-buildable-row:focus-within > .city-buildable-lead.has-now',
      ),
    );
    const width = /width:\s*(\d+)px/.exec(rule('.city-now'));
    expect(Number(room?.[1])).toBeGreaterThanOrEqual(Number(width?.[1]));
    expect(rule('.city-now')).toMatch(/right:\s*0;/);
    expect(braceBody(uiSource('cityPanel.ts'), 'function renderBuildables(')).toContain(
      "left.classList.add('has-now');",
    );
  });
});

describe('the work rail’s button notes open over the rail', () => {
  it('raises the notes of ×, ↑, ↓, the contribute buttons and “Now” in the rail’s card', () => {
    const panel = uiSource('cityPanel.ts');
    for (const call of [
      "railNoteOn(drop, 'Stop building this', false);",
      "railNoteOn(up, 'Move up', false);",
      "railNoteOn(down, 'Move down', false);",
      "railNoteOn(remove, 'Remove', false);",
      'railNoteOn(button, blocker ?? promise, false);',
      "railNoteOn(now, 'Put it at the front of the queue. Shift-click on a row does the same.');",
    ]) {
      expect(`${call}: ${panel.includes(call)}`).toBe(`${call}: true`);
    }
    expect(braceBody(panel, 'function railNoteOn(')).toContain(
      'bindRowCard(anchor, () => noteNode(text), true);',
    );
  });
});

describe('the site sentence’s article', () => {
  it('says "wants The Alchemical Society", never "wants a The Alchemical Society"', () => {
    const { state, city } = developed();
    const refusal = buildError(state, 0, 'building', 'theAlchemicalCodex', city);
    expect(refusal).toContain('wants The Alchemical Society;');
    expect(refusal).not.toContain('a The ');
    // And a name that takes "a" still takes it.
    expect(buildError(state, 0, 'building', 'university', city)).toContain('needs a Library standing in');
  });
});
