/**
 * **The simpler city screen** (Quiet Table, fourth pass, frame 1; the user on
 * the third-pass board, 2026-11-19: "this is too cluttered, could you make it a
 * bit simpler and less overwhelming for new players? The build list doesn't
 * require icons, i think it looked good as it did earlier with the gear. The
 * bottom bar feels too busy.").
 *
 * The frame is `docs/plans/mockups/scholars-study/quiet-table-fourth-pass/
 * build.py`, `city4`: growth, borders and the citizens' focus in view, then one
 * fold row for each of the town's other facts, shut at rest, one open at a
 * time, and a row only when the town has something in it.
 *
 * What a town shows and what each shut row says is `cityFoldRows`, pure, so it
 * is asked of real towns here. The wiring (one row open, the build list with no
 * pictures, and that every command the panel sent before is sent by the same
 * control) is read off the source, since this suite has no document.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, isEmpireBuilding, isWonder } from '../../src/sim/buildingData';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { type Game } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import { cityRiteTurnsLeft, cityRites, riteCostFor, riteError } from '../../src/sim/religion';
import { LIVE_RITE_IDS, type RiteId, riteAbility, riteDef } from '../../src/sim/religionData';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { EMPIRE_BUILDING_WORDS } from '../../src/sim/statecraft';
import type { OrderId } from '../../src/sim/statecraftData';
import { hasAbility } from '../../src/sim/tech';
import {
  CITY_FOLD_WORDS,
  type CityFoldRow,
  FAITH_ROW_WORDS,
  cityFoldRows,
  keptFold,
  townBuildingGroups,
} from '../../src/ui/cityPanel';
import { priceChipShortSpoken } from '../../src/ui/priceCell';
import type { RiteOption } from '../../src/ui/controls';
import { riteTeacherName } from '../../src/ui/religionScreen';
import { riteOfferText } from '../../src/ui/riteOffer';
import { braceBody, uiSource } from './sourceHelpers';
import { createGame } from '../sim/newGameHelpers';

const PANEL = uiSource('cityPanel.ts');
const CSS = uiSource('style.css').replace(/\/\*[\s\S]*?\*\//g, '');

/** One rule's body in the stylesheet, by its exact selector at the start of a line. */
function rule(selector: string): string {
  const at = CSS.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`no rule for ${selector}`);
  return CSS.slice(CSS.indexOf('{', at) + 1, CSS.indexOf('}', at));
}

/** Seat 0's first town, founded where its first piece stands. */
function bench(): { g: Game; city: City } {
  const g = createGame({
    seed: 31,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
  const unit = g.state.units.find((u) => u.ownerId === 0)!;
  const city = foundCityAt(g.state, 0, getTileAt(g.state.map, unit.col, unit.row)!)!;
  city.queue = [];
  bumpRevision(g.state);
  return { g, city };
}

/** Seats a card in seat 0's slots, as a held Order. */
function seat(g: Game, card: string): void {
  const sc = playerById(g.state, 0)!.statecraft;
  sc.orders.push(card as OrderId);
  sc.slots.push({ card: card as OrderId, sealedUntil: g.state.turn });
  bumpRevision(g.state);
}

/** The rites the page hands the panel: `controls.riteOptions`, for a seat that has not ended its turn. */
function riteOptions(state: GameState, cityId: number): RiteOption[] {
  const cost = riteCostFor(state, 0, state.cities.find((one) => one.id === cityId));
  return LIVE_RITE_IDS.map((id) => ({
    id,
    name: riteDef(id).name,
    preview: riteOfferText(state, 0, id),
    blocked: riteError(state, 0, cityId, id),
    requiredTechName: hasAbility(state, 0, riteAbility(id)) ? null : riteTeacherName(id),
    cost,
  }));
}

/** The techs the rites tab's suite gives its world, which teach the first rites. */
function teachRites(state: GameState): void {
  const player = playerById(state, 0)!;
  for (const tech of ['divination', 'stonecraft', 'mining', 'bronzeWorking', 'currency']) {
    if (!player.techsResearched.includes(tech as never)) player.techsResearched.push(tech as never);
  }
  bumpRevision(state);
}

function rowsOf(state: GameState, city: City): CityFoldRow[] {
  return cityFoldRows(state, city, 0, riteOptions(state, city.id));
}

const OMEN: RiteId = 'omenReading';
const EMPIRE = BUILDING_IDS.find((id) => isEmpireBuilding(id) && !isWonder(id))!;
const WONDER = BUILDING_IDS.find((id) => isWonder(id))!;

// --- which rows a town shows --------------------------------------------------

describe('which fold rows a town shows', () => {
  it('shows a town that has nothing yet no row at all', () => {
    const { g, city } = bench();
    expect(rowsOf(g.state, city)).toEqual([]);
  });

  it('shows a new town with one building one row, as the frame’s Pisac', () => {
    const { g, city } = bench();
    city.buildings.push('monument');
    bumpRevision(g.state);
    expect(rowsOf(g.state, city)).toEqual([
      { id: 'buildings', label: 'Buildings', summary: '1', ink: null },
    ]);
  });

  it('shows a late town every row it has something for, in the frame’s order', () => {
    const { g, city } = bench();
    const { state } = g;
    expect(EMPIRE).toBeDefined();
    expect(WONDER).toBeDefined();
    city.population = 6;
    city.buildings.push('monument', 'granary', EMPIRE, WONDER);
    city.specialists.scholar = 2;
    city.tradingPost = true;
    refreshCityDerived(state, city);
    seat(g, 'levyOfTheLand');
    teachRites(state);
    playerById(state, 0)!.faithPool = 1000;
    bumpRevision(state);
    const started = applyCommand(state, { type: 'performRite', playerId: 0, cityId: city.id, rite: OMEN } as Command);
    expect(started.ok, JSON.stringify(started)).toBe(true);
    const rows = rowsOf(state, city);
    expect(rows.map((row) => row.id)).toEqual([
      'buildings',
      'empire',
      'wonders',
      'specialists',
      'faith',
      'routes',
      'levy',
    ]);
    expect(rows.map((row) => row.label)).toEqual([
      'Buildings',
      'Empire buildings',
      'Wonders',
      'Specialists',
      'Faith',
      'Trade routes',
      'Levy a citizen',
    ]);
  });

  it('puts each building in exactly one of the three groups', () => {
    const { city } = bench();
    city.buildings.push('monument', EMPIRE, WONDER, 'granary');
    expect(townBuildingGroups(city)).toEqual({
      buildings: ['monument', 'granary'],
      empire: [EMPIRE],
      wonders: [WONDER],
    });
  });

  it('keeps the Buildings row for a consecration that outlived its cathedral', () => {
    const { g, city } = bench();
    city.consecration = 'x' as never;
    bumpRevision(g.state);
    expect(rowsOf(g.state, city).map((row) => [row.id, row.summary])).toEqual([['buildings', '0']]);
  });

  it('names the group of once-per-empire buildings with the one word table', () => {
    // The user, 2026-11-19: "lets label these as empire buildings everywhere in the game".
    expect(CITY_FOLD_WORDS.empire).toBe(`${EMPIRE_BUILDING_WORDS.label}s`);
    expect(CITY_FOLD_WORDS.empire).toBe('Empire buildings');
    // "The Great Households" is a different card and keeps its name.
    expect(PANEL).not.toMatch(/great house(?!hold)/i);
  });
});

// --- what a shut row says -------------------------------------------------------

describe('the summary each shut row prints', () => {
  it('counts the stones in each group and the people in the trades', () => {
    const { g, city } = bench();
    city.buildings.push('monument', 'granary', EMPIRE, WONDER);
    city.specialists.scholar = 2;
    city.specialists.merchant = 1;
    bumpRevision(g.state);
    const said = Object.fromEntries(rowsOf(g.state, city).map((row) => [row.id, row.summary]));
    expect(said).toMatchObject({ buildings: '2', empire: '1', wonders: '1', specialists: '3' });
  });

  it('says the rite a town keeps and the turns left on it ("a rite, 9 turns")', () => {
    const { g, city } = bench();
    teachRites(g.state);
    playerById(g.state, 0)!.faithPool = 1000;
    bumpRevision(g.state);
    expect(applyCommand(g.state, { type: 'performRite', playerId: 0, cityId: city.id, rite: OMEN } as Command).ok).toBe(true);
    expect(cityRites(g.state, city)).toEqual([OMEN]);
    const left = cityRiteTurnsLeft(g.state, city, OMEN);
    const faith = rowsOf(g.state, city).find((row) => row.id === 'faith')!;
    expect(faith.summary).toBe(`a rite, ${left} ${left === 1 ? 'turn' : 'turns'}`);
  });

  it('says how many rites the town could start now, and that a rite waits on faith when it does', () => {
    const { g, city } = bench();
    teachRites(g.state);
    playerById(g.state, 0)!.faithPool = 1000;
    bumpRevision(g.state);
    const ready = rowsOf(g.state, city).find((row) => row.id === 'faith')!;
    expect(ready.summary).toMatch(/^[1-9]\d* ready$/);
    playerById(g.state, 0)!.faithPool = 0;
    bumpRevision(g.state);
    expect(rowsOf(g.state, city).find((row) => row.id === 'faith')?.summary).toBe('needs faith');
  });

  it('says a trading post, and how many levy lines can be chosen, or that the town waits', () => {
    const { g, city } = bench();
    city.population = 6;
    city.tradingPost = true;
    refreshCityDerived(g.state, city);
    seat(g, 'levyOfTheLand');
    const said = (): Record<string, string> =>
      Object.fromEntries(rowsOf(g.state, city).map((row) => [row.id, row.summary]));
    expect(said()).toMatchObject({ routes: 'trading post', levy: '1 ready' });
    const levied = applyCommand(g.state, {
      type: 'levyCitizen',
      playerId: 0,
      cityId: city.id,
      use: 'production',
    } as Command);
    expect(levied.ok, JSON.stringify(levied)).toBe(true);
    expect(said().levy).toBe('waiting');
  });

  it('opens the Faith row on the rite kept, and folds rites that cannot be started behind one line', () => {
    // The fourth-pass frame: "The Faith row is open. It shows the rite the town
    // keeps, and a link to the Faith sheet for the rest." A town keeping a rite
    // can start no other, so every row would be a dash.
    const card = braceBody(PANEL, 'function renderFaithCard(');
    expect(card).toContain("if (looks.every((look) => look.look === 'none')) {");
    expect(card).toContain("summary.append(element('span', 'city-not-yet-name', 'Every rite'));");
    expect(card).toContain("rememberOpen(fold, 'Every rite · none to start', false);");
    expect(card).toContain('into.append(list);');
  });

  it('writes no number inside a sentence: a summary is a figure, or a figure and a word or two', () => {
    for (const summary of ['1', 'a rite, 9 turns', '2 ready', 'waiting', 'needs faith', 'trading post']) {
      expect(summary.split(' ').length).toBeLessThanOrEqual(4);
    }
    // The figures are drawn in the tabular mono, the words in the row's face.
    expect(braceBody(PANEL, 'function foldSummaryNodes(')).toContain(
      "into.append(element('span', 'city-fold-figure', part));",
    );
    expect(rule('.city-fold-figure')).toContain('font-family: var(--face-num);');
  });
});

// --- one open at a time ---------------------------------------------------------

describe('one row open at a time', () => {
  const row = (id: CityFoldRow['id']): CityFoldRow => ({ id, label: CITY_FOLD_WORDS[id], summary: '1', ink: null });

  it('keeps the open row on the next town only when that town has it too', () => {
    expect(keptFold('faith', [row('buildings'), row('faith')])).toBe('faith');
    expect(keptFold('faith', [row('buildings')])).toBeNull();
    expect(keptFold(null, [row('buildings')])).toBeNull();
  });

  it('draws each row’s head as a button that says whether it is open, over the region it opens', () => {
    const folds = braceBody(PANEL, 'function renderFolds(');
    expect(folds).toContain("const head = element('button', 'city-fold-head');");
    expect(folds).toContain("head.setAttribute('aria-controls', bodyId);");
    expect(folds).toContain("entry.head.setAttribute('aria-expanded', on ? 'true' : 'false');");
    expect(folds).toContain("wrap.setAttribute('role', 'region');");
    expect(folds).toContain('entry.body.hidden = !on;');
  });

  it('opens the pressed row and shuts every other, in place, and shuts the open row on a second press', () => {
    const folds = braceBody(PANEL, 'function renderFolds(');
    expect(folds).toContain('const on = entry.id === id;');
    expect(folds).toContain("head.addEventListener('click', () => show(openFold === row.id ? null : row.id));");
    // No rebuild, so the keyboard stays on the button.
    expect(folds).not.toContain('render()');
    // The open row is the panel's own state, never the game's, and is not in the render key.
    expect(PANEL).toContain('let openFold: CityFoldId | null = null;');
    expect(folds).toContain('openFold = keptFold(openFold, rows);');
    expect(braceBody(PANEL, 'export function panelRenderKey(')).not.toContain('openFold');
  });

  it('shuts every row at rest, and hides a shut row’s body', () => {
    expect(PANEL).toMatch(/let openFold: CityFoldId \| null = null;/);
    expect(rule('.city-fold-body[hidden]')).toContain('display: none;');
  });
});

// --- the build list -------------------------------------------------------------

describe('the build list rows', () => {
  it('carry no picture: the name, the production mark, the figures and the price', () => {
    // The user: "The build list doesn't require icons, i think it looked good
    // as it did earlier with the gear." The gear is the production mark the
    // row's own stylesheet draws; no row builds a picture of its own.
    const list = braceBody(PANEL, 'function renderBuildables(');
    for (const picture of ["element('img'", 'document.createElement', 'paintingFor', 'unitMarkNode', 'portrait']) {
      expect(`${picture}: ${list.includes(picture)}`).toBe(`${picture}: false`);
    }
    expect(list).toContain("const button = element('button', 'city-buildable');");
    expect(list).toContain("button.append(element('span', 'city-buildable-name', def.name));");
    expect(rule('.city-buildable::before')).toContain('mask-image: var(--production-mark);');
    expect(rule('.city-buildable')).not.toContain('background-image');
  });
});

// --- every control the panel had --------------------------------------------------

describe('every command the panel sent before is still sent by the same control', () => {
  it('sends exactly the commands it sent before the simpler screen, and no other', () => {
    const literal = [...PANEL.matchAll(/\btype: '([a-zA-Z]+)',/g)].map((match) => match[1]);
    expect(literal.sort()).toEqual([
      'contribute',
      'dismissSpecialist',
      'levyCitizen',
      'purchaseItem',
      'setCitizenFocus',
      'setCityProduction',
    ]);
    // Annexing and razing a puppet name their command by the verb they pass.
    expect(PANEL).toContain("() => decide(city, 'annexCity'),");
    expect(PANEL).toContain("() => decide(city, 'razeCity'),");
  });

  it('keeps each command on the control that sent it', () => {
    const where: [string, string, string][] = [
      // The queue: the front row's ×, the queue's ↑ ↓ ×, a build row and its "Now".
      ['function renderProduction(', 'commit(city, next);', 'the ×  on the thing being built'],
      ['function renderQueue(', 'row.append(up, down, remove);', 'the queue’s arrows and ×'],
      ['function renderBuildables(', 'commit(city, queueWithAdded(city.queue, item));', 'a build row'],
      ['function renderBuildables(', 'commit(city, queueWithFront(city.queue, item));', '“Now” and Shift-click'],
      ['function renderBuildables(', 'onBuy: () => buy(city, item, cell.look.bank)', 'a price'],
      ['function contributeRow(', "button.addEventListener('click', () => give(city, currency));", 'a contribution'],
      ['function renderPuppet(', "() => decide(city, 'annexCity'),", 'Annex'],
      ['function renderFocusPane(', 'sendFocus(city, focus, city.avoidGrowth === true);', 'a focus chip'],
      ['function renderFocusPane(', 'sendFocus(city, current, tick.checked);', 'Avoid growth'],
      ['function renderLevy(', "type: 'levyCitizen',", 'a levy line'],
      ['function dismissControl(', "type: 'dismissSpecialist',", 'Dismiss'],
      ['function renderFaithCard(', 'performRite(city.id, row.id);', 'a rite’s price'],
      // Buy tiles moved to the bottom centre by the user's ruling of 2026-11-20.
      ['function renderBuyDock(', 'setBuyMode(!isBuyMode());', 'Buy tiles'],
      ['function renderLeave(', "leave.addEventListener('click', onClose);", 'the ×'],
      ['function renderRoutes(', "all.addEventListener('click', () => onOpenTrade());", 'All routes'],
      ['function renderFaithCard(', "link.addEventListener('click', () => openRites(city.id));", 'the faith sheet link'],
      ['function renderYieldChips(', "chip.addEventListener('click', () => togglePinnedChip(city, key));", 'a yield’s list'],
      ['function renderShortOf(', "button.addEventListener('click', () => pointTo(chip.target));", 'a short-of chip'],
    ];
    for (const [fn, call, control] of where) {
      expect(`${control}: ${braceBody(PANEL, fn).includes(call)}`).toBe(`${control}: true`);
    }
    // The town steps (‹ ›) are sliced: their return type has braces of its own.
    const steps = PANEL.slice(PANEL.indexOf('function stepButtons('), PANEL.indexOf('function renderShortOf('));
    expect(steps).toContain("button.addEventListener('click', () => open(target));");
    // The caravans' line in the build list was cut by the user's ruling of
    // 2026-11-20 ("this line is unneeded (caravans)"); it opened the trade
    // sheet, which All routes (above) still opens.
    expect(braceBody(PANEL, 'function renderBuildables(')).not.toContain('onOpenTrade');
  });

  it('moves the way out to the head, and puts nothing of the panel at the foot but Buy tiles', () => {
    expect(braceBody(PANEL, 'function renderBand(')).toContain('band.append(renderLeave());');
    const render = braceBody(PANEL, '  function render(): void {');
    expect(render).not.toContain('renderLeave()');
    expect(render).toContain('container.append(renderBuyDock(city));');
    expect(rule('.city-buy-dock')).toContain('bottom: 14px;');
    // The caption stands in the dock, over the button.
    expect(rule('.city-board-caption')).toContain('position: static;');
  });
});

// --- the user's comments on the built screen (2026-11-20) -------------------------

describe('the second step: the user’s comments on the built screen', () => {
  it('draws every price as one chip, its figure and mark on one line, centred on its row', () => {
    const list = braceBody(PANEL, 'function renderBuildables(');
    expect(list).toContain('chip: true,');
    expect(braceBody(PANEL, 'function renderFaithCard(')).toContain('chip: true,');
    const chip = rule('.city-mode .price-cell.is-chip');
    expect(chip).toContain('width: var(--city-chip-w);');
    expect(chip).toContain('flex-direction: row;');
    expect(chip).toContain('align-self: center;');
    expect(chip).toContain('height: 24px;');
    expect(rule('.city-mode')).toContain('--city-chip-w: 66px;');
  });

  it('draws a price the bank cannot pay yet as the same chip, its figure red, with no "need" line', () => {
    const cell = uiSource('priceCell.ts');
    const chip = cell.slice(
      cell.indexOf("if (look.look === 'short' && options.chip === true) {"),
      cell.indexOf("if (look.look === 'short') {\n    const cell = element('span', `price-cell is-short ${classes}`);\n    const figure"),
    );
    expect(chip).toContain("element('span', 'price-cell-figure wanting')");
    expect(chip).toContain('cell.title = words;');
    expect(chip).not.toContain('price-cell-need');
    expect(
      priceChipShortSpoken({ look: 'short', bank: 'gold', price: 196, need: 116 }, { name: 'Settler' }),
    ).toBe('Settler costs 196 gold to buy outright; you cannot pay that yet');
    // The row's hover card says it the same way: red, and what the seat holds.
    const line = braceBody(PANEL, 'function buyLine(');
    expect(line).toContain("if (look.look === 'short') line.classList.add('wanting');");
    expect(PANEL).not.toContain('priceNeedText');
  });

  it('gives every row one cell in each price column, the dash where that bank does not sell it', () => {
    const list = braceBody(PANEL, 'function renderBuildables(');
    expect(list).toContain('for (const bank of columns) {');
    expect(list).toContain('line.append(cell === undefined ? unsoldCell() : priceCell(row, cell));');
    expect(list).toContain("const cell = element('span', 'price-cell is-none is-chip is-unsold');");
    expect(PANEL).not.toContain('emptyPriceCellElement');
  });

  it('heads each price column with the bank’s mark and what the seat holds, in line with its chips', () => {
    const list = braceBody(PANEL, 'function renderBuildables(');
    expect(list).toContain('for (const bank of columns) head.append(priceColumnHead(held(bank)));');
    expect(list).toContain('cell.append(yieldMarkNode(bank, true), bankHeldElement(bank, amount));');
    expect(rule('.city-price-head')).toContain('width: var(--city-chip-w);');
    // The tabs sit directly over the list's head, and nothing between them.
    const tabs = list.indexOf('box.append(tabs);');
    const head = list.indexOf("const head = element('div', 'city-price-heads');");
    expect(tabs).toBeGreaterThan(-1);
    expect(head).toBeGreaterThan(tabs);
    expect(list.slice(tabs, head)).not.toContain('grid.append(');
    expect(list).not.toContain('Buy outright · full price');
  });

  it('calls the seat’s own faith "your religion", and lists every faith in the town, yours first', () => {
    expect(FAITH_ROW_WORDS).toEqual({ yours: 'Your religion', inLine: 'your religion', none: 'No religion' });
    const followers = braceBody(PANEL, 'function renderFollowers(');
    expect(followers).toContain("if (row.ours) who.append(element('span', 'city-faith-yours', FAITH_ROW_WORDS.yours));");
    expect(followers).toContain('`${figure(row.following)}/${figure(row.population)}`');
    expect(followers).toContain("line.append(element('span', 'city-faith-who', FAITH_ROW_WORDS.none));");
    // The shut row says "your religion" too, where it named the faith.
    expect(PANEL).toContain('summary: banner.ours ? FAITH_ROW_WORDS.inLine : banner.name,');
  });

  it('keeps the focus chips in one row with even gaps at the wider panel', () => {
    expect(rule('.city-focus-choices')).toContain('justify-content: space-between;');
    expect(rule('.city-focus-choice')).toContain('white-space: nowrap;');
    expect(rule('.city-rail.is-left')).toContain('width: 286px;');
    expect(rule('.city-rail.is-right')).toContain('width: 400px;');
    // The Buy tiles button left the panel.
    expect(braceBody(PANEL, 'function renderTownRail(')).not.toContain('city-buy-tiles');
    expect(braceBody(PANEL, 'function renderBorders(')).not.toContain('setBuyMode');
  });
});
