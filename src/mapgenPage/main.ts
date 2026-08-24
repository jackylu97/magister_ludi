/**
 * Entry point for the mapgen inspection page — a whole generated game, judged at
 * a glance.
 *
 * The fourth dev page beside `proto3d.html`, `pieces.html` and `abacus.html`,
 * and the same bargain each of those makes: one question, answered with the real
 * thing. The question here is *what did the generator actually deal* — how much
 * of each resource, where the continents fell, and what the four or eight seats
 * are looking at when the game starts. Every one of those is answerable from a
 * `GameState` today; none of them is readable while playing, because a player
 * has fog, one seat's technologies, and no reason to be shown a census.
 *
 * A consumer of the simulation, never a back door
 * ----------------------------------------------
 * Two rules keep this page honest, and both are load-bearing rather than tidy:
 *
 *   1. **The capitals are founded with the real command.** Each seat's starting
 *      settler is handed to `dispatch` as a `foundCity`, so the board shows the
 *      territory, the cleared ground and the borders a game would show, and it
 *      shows them because the reducer put them there. A page that wrote cities
 *      into the state directly would be a page whose picture nobody could trust.
 *   2. **Every figure comes from `src/dev/mapReport.ts`**, which is pure over a
 *      `GameState` and asks the simulation's own evaluators. Nothing is counted
 *      in this file. See that module's docblock.
 *
 * Beyond those `foundCity` commands the page mutates nothing: it generates,
 * founds, reads and draws.
 *
 * The two view-level liberties it does take
 * -----------------------------------------
 * Both are *view* switches with no simulation behind them, and both exist
 * because the viewer here is a spectator rather than a seat:
 *
 *   · `setFogSeat(null)` — the existing omniscient mode, which every gallery
 *     already uses. No seat, no fog.
 *   · `revealResources` on the lens (`LensView`) — roundels on every resource
 *     whatever anybody has researched. The board has always drawn the diorama
 *     props for every resource to everybody; this says the same of the labels,
 *     for a viewer who is nobody. Nothing a player looks through sets it.
 *
 * The hover card
 * --------------
 * Hovering a hex prints the game's own readout — terrain, feature, hills,
 * yields, resource, improvement — because those rows now live in
 * `src/ui/tileReadout.ts` rather than inside `src/main.ts`, and both pages speak
 * the one vocabulary. Two rows are added that only make sense here: the carved
 * continent the hex belongs to with the hand growing on it, and the elevation
 * and moisture the generator read its terrain off. See `showTile`.
 *
 * The camera needed nothing: `DioramaCamera.frameBoard` already raises its own
 * zoom-out limit to whatever framing the board demands, and `setMap` calls it,
 * so a fresh map opens whole.
 */

import './style.css';

import { type Game, createGame, dispatch } from '../sim/game';
import type { PlayerSpec } from '../sim/state';
import { RULES } from '../sim/rulesData';
import { unitDef } from '../sim/unitData';
import { tileIndex } from '../sim/map';
import { isWaterTerrain } from '../sim/terrainData';
import { type MapReport, continentAt, mapReport } from '../dev/mapReport';
import { Renderer3D } from '../render3d/renderer3d';
import type { HoverInfo } from '../ui/mapView';
import {
  describeImprovement,
  describeTile,
  resourceRowNode,
  tileYieldNodes,
} from '../ui/tileReadout';
import { type TileTint, partitionColor } from '../render3d/tint3d';
import { playerPieceColor } from '../render3d/lookData';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const canvas = requireElement<HTMLCanvasElement>('gl');
const seedInput = requireElement<HTMLInputElement>('seed');
const seedPrevButton = requireElement<HTMLButtonElement>('seed-prev');
const seedNextButton = requireElement<HTMLButtonElement>('seed-next');
const seedRandomButton = requireElement<HTMLButtonElement>('seed-random');
const seatsSelect = requireElement<HTMLSelectElement>('seats');
const regenerateButton = requireElement<HTMLButtonElement>('regenerate');
const continentsToggle = requireElement<HTMLInputElement>('continents-toggle');
const yieldsToggle = requireElement<HTMLInputElement>('yields-toggle');
const resourcesToggle = requireElement<HTMLInputElement>('resources-toggle');
const timingEl = requireElement<HTMLElement>('timing');
const sectionsEl = requireElement<HTMLElement>('sections');
const tileCardEl = requireElement<HTMLElement>('tile-card');
const tileTerrainEl = requireElement<HTMLElement>('tile-terrain');
const tileWhereEl = requireElement<HTMLElement>('tile-where');
const tileYieldsEl = requireElement<HTMLElement>('tile-yields');
const tileResourceEl = requireElement<HTMLElement>('tile-resource');
const tileImprovementEl = requireElement<HTMLElement>('tile-improvement');
const tileContinentEl = requireElement<HTMLElement>('tile-continent');
const tileFieldsEl = requireElement<HTMLElement>('tile-fields');

/** Standard, always. The size the balance is tuned against and the one worth judging. */
const SIZE_NAME = 'standard';

/**
 * Four seats, because four is the number that makes the resource deal a
 * question. One seat cannot be treated unfairly, two can only be compared to
 * each other, and four is where "who got the good half of the map" starts being
 * a thing you can see.
 */
const DEFAULT_SEATS = 4;

/**
 * A roster deep enough for the rules' maximum. The game itself seats two named
 * players (`src/main.ts`); this page needs twelve chairs to ask what a crowded
 * map does, and their names are ordinals because nobody is role-playing here.
 *
 * Every seat's colour is **derived from the ink it will actually be drawn in**,
 * and that is a correction rather than a tidy-up. This page used to hand each
 * seat a hand-picked CSS hex, none of which `players.byColor` knew — so all
 * twelve fell through to `playerPieceColor`'s index fallback, the twelve hexes
 * were decoration, and the seat swatch in the ledger agreed with the flag on the
 * board only by coincidence. Worse, two of the hexes chosen *were* the fallback
 * inks for their own seats, and those inks were `pine` and `wheat`: seats 3 and
 * 4 flew flags the exact colour of forest and plains, which is why four founded
 * capitals looked like two. The inks are fixed in `data/view3d.json` (see
 * `playerPieceColor`); what is fixed here is that there is one source for them.
 *
 * The first two seats keep the game's own CSS colours, because those *are* in
 * `byColor` and resolve to the same first two inks — so seats 1 and 2 are the
 * crimson and teal every other surface in the product shows them in.
 */
const GAME_SEAT_COLORS: readonly string[] = ['#d4502e', '#1f8a85'];

function seatColor(index: number): string {
  return (
    GAME_SEAT_COLORS[index] ??
    `#${playerPieceColor('', index).toString(16).padStart(6, '0')}`
  );
}

const ROSTER: PlayerSpec[] = Array.from({ length: RULES.game.maxPlayers }, (_, index) => ({
  name: `Seat ${index + 1}`,
  color: seatColor(index),
  isHuman: true,
}));

for (let seats = RULES.game.minPlayers; seats <= RULES.game.maxPlayers; seats++) {
  const option = document.createElement('option');
  option.value = String(seats);
  option.textContent = `${seats}`;
  seatsSelect.append(option);
}
seatsSelect.value = String(DEFAULT_SEATS);

const renderer = new Renderer3D(canvas);
// No seat: the spectator board every gallery already draws. Nothing is fogged,
// and the seat-filtered layers (units, cities, territory) draw everybody's.
renderer.setFogSeat(null);

/** The live game and its reading, held so the toggles can redraw without regenerating. */
let game: Game | null = null;
let report: MapReport | null = null;

// --- generation --------------------------------------------------------------

function currentSeed(): number {
  const raw = Number(seedInput.value);
  return Number.isFinite(raw) ? Math.trunc(raw) : 0;
}

/**
 * Founds every seat's capital, through the reducer, and **asserts every one**.
 *
 * `foundsCity` rather than the string `"settler"`, which is the rule the whole
 * of `src/sim/` follows (see `unitData.ts`): what founds a city is a property of
 * the type, not its name.
 *
 * Every refusal is collected and handed back, and the caller prints them in the
 * banner in crimson. A `console.warn` was not enough and the reason is the whole
 * story of the "only two of four capitals appear" report: the capitals were all
 * four founded, the warning line never fired, and what was actually wrong was
 * two flags painted in board inks. A page whose only failure channel is a
 * console nobody has open cannot be used to *rule a cause out*, which is most of
 * what an inspection page is for. It is still not fatal — a map that seats a
 * settler somewhere illegal is a map worth looking at, and looking at it is how
 * you find out why — but it can no longer be silent.
 */
interface FoundingReport {
  founded: number;
  /** One line per seat that could not plant, in seat order. Empty is the promise. */
  refusals: string[];
}

function foundCapitals(session: Game): FoundingReport {
  let founded = 0;
  const refusals: string[] = [];
  for (const player of session.state.players) {
    const settler = session.state.units.find(
      (unit) => unit.ownerId === player.id && unitDef(unit.type).foundsCity,
    );
    if (!settler) {
      refusals.push(`seat ${player.id + 1}: no settler was seated`);
      continue;
    }
    const result = dispatch(session, {
      type: 'foundCity',
      playerId: player.id,
      settlerUnitId: settler.id,
    });
    if (result.ok) founded += 1;
    else refusals.push(`seat ${player.id + 1} at ${settler.col},${settler.row}: ${result.error}`);
  }
  return { founded, refusals };
}

/**
 * A fresh map, its capitals, its reading and its picture.
 *
 * The three costs are timed separately because they answer different questions:
 * generation is the generator's, founding is the reducer's, and the report is
 * this page's own (it re-runs `carveContinents`, which is several BFS sweeps).
 * Only the first is a number anybody tuning `mapgen.json` cares about.
 */
function generate(): void {
  const seats = Number(seatsSelect.value) || DEFAULT_SEATS;

  const startedGen = performance.now();
  const session = createGame({
    seed: currentSeed(),
    sizeName: SIZE_NAME,
    players: ROSTER.slice(0, seats),
  });
  const genMs = performance.now() - startedGen;

  const startedFound = performance.now();
  const founding = foundCapitals(session);
  const foundMs = performance.now() - startedFound;

  const startedReport = performance.now();
  const reading = mapReport(session.state);
  const reportMs = performance.now() - startedReport;

  game = session;
  report = reading;

  // Resize first, frame after, and do both explicitly. `setMap` frames the board
  // itself, but it frames it against whatever viewport the camera currently
  // believes in — and on the very first generation the stylesheet may not have
  // been applied yet, so the canvas is still the 300×150 element the platform
  // hands out and the whole map is framed to it. Asking for the size and then
  // for the framing, in that order, is a hundred microseconds and removes the
  // race outright. It is also what this page wants on *every* generation: a new
  // map opens whole, because that is the question being asked of it.
  renderer.resize();
  renderer.setGameState(session.state);
  renderer.fitToViewport();
  applyLens();
  applyContinentOverlay();
  renderSections(reading);

  const land = reading.census.landTiles;
  const water = reading.width * reading.height - land;
  timingEl.textContent =
    `${reading.width}×${reading.height} · ${land} land · ${water} sea · ` +
    `${reading.continents.count} continents · ${founding.founded}/${seats} capitals\n` +
    `generate ${genMs.toFixed(0)} ms · found ${foundMs.toFixed(0)} ms · ` +
    `report ${reportMs.toFixed(0)} ms`;
  // The assertion, said out loud. See `foundCapitals`.
  for (const line of founding.refusals) {
    const alarm = document.createElement('span');
    alarm.className = 'alarm';
    alarm.textContent = `capital refused — ${line}`;
    timingEl.append(alarm);
    console.error(`[mapgen] capital refused — ${line}`);
  }

  showTile(null);
}

// --- the board's two switches -------------------------------------------------

/**
 * The lens: roundels and glyphs, with the reveal on.
 *
 * `playerId: 0` is a formality — the settler wash is the only half that reads
 * it, and this page never puts that lens up. The roundels are drawn for
 * everybody by `revealResources`, which is the point.
 */
function applyLens(): void {
  renderer.setLens({
    mode: 'none',
    cells: null,
    resources: resourcesToggle.checked,
    resourceCells: null,
    yields: yieldsToggle.checked,
    yieldCells: null,
    playerId: 0,
    revealResources: true,
  });
}

/**
 * The continent overlay: one hue per carved continent, over the whole map.
 *
 * Land is washed harder than sea, and both are washed. Every tile has a
 * continent — the fringe sea is attached to whichever carved land is nearest
 * (see `carveContinents`), and that attachment is what decides which coastline a
 * pearl bed's luxury belongs to — so hiding the water would hide half of what
 * the lens is for. Reading it is still terrain-first, which is why the ink is
 * thin and keeps the depth test (`tint3d.ts`).
 */
function applyContinentOverlay(): void {
  if (!game || !report || !continentsToggle.checked) {
    renderer.setTileTints(null);
    return;
  }
  const { map } = game.state;
  const tints: TileTint[] = [];
  for (const tile of map.tiles) {
    const id = report.continentOf[tileIndex(map, tile.col, tile.row)] ?? -1;
    if (id < 0) continue;
    tints.push({
      col: tile.col,
      row: tile.row,
      color: partitionColor(id, report.continents.count),
      opacity: isWaterTerrain(tile.terrain) ? 0.17 : 0.4,
    });
  }
  renderer.setTileTints(tints);
}

// --- the tile readout ---------------------------------------------------------

/**
 * What is under the pointer, in the game's own words.
 *
 * The four describers come from `src/ui/tileReadout.ts` — the module the game's
 * info card was refactored into when this page asked for the same rows — so the
 * two surfaces cannot describe the same hex two ways. What this page supplies is
 * the *seat* the yields and the resource are asked through, and its answer is
 * seat 0: an inspection page is a spectator, and a spectator has to look through
 * somebody's eyes to be told what a tile is worth at all. Seat 0 has the opening
 * technologies and nothing else, so what the card prints is the ground as the
 * game *begins* — which is the question this page asks about everything else on
 * it too. (`revealResources` on the lens is the same liberty one register out:
 * the roundels are drawn for everybody, so the card must not then refuse to name
 * one.)
 *
 * Two rows are this page's own and could not appear in the game's card: the
 * carved continent, because it is the unit the luxury deal works in and is
 * invisible on the board without the overlay, and the two noise fields the
 * terrain was read off. Both are why somebody hovers a hex *here* rather than in
 * a game.
 */
const SPECTATOR_SEAT = 0;

function showTile(hover: HoverInfo | null): void {
  if (!hover || !game || !report) {
    tileCardEl.hidden = true;
    return;
  }
  const { tile } = hover;
  const described = describeTile(tile);
  const feature = tile.feature === 'none' ? '' : ` · ${described.feature}`;
  tileTerrainEl.textContent = `${described.terrain}${described.hills ? ' hills' : ''}${feature}`;
  tileWhereEl.textContent = `${tile.col},${tile.row} · q${hover.axial.q} r${hover.axial.r}`;

  const yields = tileYieldNodes(game.state, SPECTATOR_SEAT, tile);
  if (yields.length === 0) tileYieldsEl.textContent = '—';
  else tileYieldsEl.replaceChildren(...yields);

  tileResourceEl.replaceChildren(resourceRowNode(game.state, SPECTATOR_SEAT, tile));
  tileImprovementEl.textContent = describeImprovement(tile);

  const continent = continentAt(game.state.map, report.continentOf, tile.col, tile.row);
  const row = continent >= 0 ? report.continents.rows[continent] : undefined;
  tileContinentEl.textContent =
    row === undefined
      ? '—'
      : `#${continent} · ${row.landTiles} land · ` +
        (row.luxuries.length === 0
          ? 'no luxuries'
          : row.luxuries.map((entry) => `${entry.name} ×${entry.copies}`).join(' · '));

  // The generator's two fields, which is the other thing only this page can say:
  // a tile is desert because its moisture rank fell under a cut, and saying the
  // rank is saying why.
  tileFieldsEl.textContent =
    `elev ${tile.elevation.toFixed(2)} · moist ${tile.moisture.toFixed(2)}` +
    (tile.freshwater ? ' · fresh' : '');

  tileCardEl.hidden = false;
}

// --- the ledger ---------------------------------------------------------------

/** `<td>` with a class and text, which is most of what this file builds. */
function cell(tag: 'td' | 'th', className: string, text: string): HTMLTableCellElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function row(...cells: HTMLElement[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.append(...cells);
  return tr;
}

function section(title: string, note: string): HTMLElement {
  const el = document.createElement('section');
  const h2 = document.createElement('h2');
  h2.textContent = title;
  const p = document.createElement('p');
  p.className = 'note';
  p.textContent = note;
  el.append(h2, p);
  return el;
}

/**
 * A table with its header row. `tight` on a column is "exactly as wide as its
 * contents": the figures claim what they need and the prose column — a luxury
 * hand, which is the one thing on this page that genuinely wants to wrap — takes
 * everything left over.
 */
function table(headers: readonly { label: string; className?: string }[]): {
  el: HTMLTableElement;
  body: HTMLTableSectionElement;
} {
  const el = document.createElement('table');
  const head = document.createElement('thead');
  head.append(...[row(...headers.map((h) => cell('th', h.className ?? '', h.label)))]);
  const body = document.createElement('tbody');
  el.append(head, body);
  return { el, body };
}

/** A luxury hand as "Wine ×3 · Silk ×2", or an honest nothing. */
function handNode(list: readonly { name: string; copies: number }[]): HTMLElement {
  const span = document.createElement('span');
  span.className = 'hand';
  if (list.length === 0) {
    const none = document.createElement('span');
    none.className = 'none';
    none.textContent = 'none';
    span.append(none);
    return span;
  }
  list.forEach((entry, index) => {
    if (index > 0) span.append(document.createTextNode(' · '));
    span.append(document.createTextNode(`${entry.name} `));
    const copies = document.createElement('span');
    copies.className = 'copies';
    copies.textContent = `×${entry.copies}`;
    span.append(copies);
  });
  return span;
}

function swatchNode(color: number, round: boolean): HTMLElement {
  const el = document.createElement('span');
  el.className = round ? 'swatch seat-swatch' : 'swatch';
  el.style.background = `#${color.toString(16).padStart(6, '0')}`;
  return el;
}

/**
 * The census: every resource in the table, grouped by kind, with the density
 * line each group's budget is written in.
 *
 * Zero rows are kept and greyed rather than dropped. A luxury the deal never
 * reached is the single most useful thing on this page and it is invisible in a
 * list that only prints what turned up.
 */
function censusSection(reading: MapReport): HTMLElement {
  const el = section(
    'Resource census',
    `Tiles carrying each resource, and the group density in tiles per 1000 land ` +
      `— the unit data/mapgen.json budgets in. ${reading.census.landTiles} land tiles.`,
  );
  const { el: tableEl, body } = table([
    { label: 'Resource' },
    { label: 'Tiles', className: 'num tight' },
    { label: '/1000 land', className: 'num tight' },
  ]);

  for (const group of reading.census.groups) {
    for (const entry of group.rows) {
      const name = cell('td', '', entry.name);
      const tiles = cell('td', 'num tight', String(entry.tiles));
      const share = cell(
        'td',
        'num tight density',
        ((entry.tiles * 1000) / Math.max(1, reading.census.landTiles)).toFixed(1),
      );
      if (entry.tiles === 0) {
        name.classList.add('is-zero');
        tiles.classList.add('is-zero');
        share.classList.add('is-zero');
      }
      body.append(row(name, tiles, share));
    }
    body.append(
      row(
        cell('td', 'kind', group.kind),
        cell('td', 'num tight', String(group.tiles)),
        cell('td', 'num tight', group.perThousandLand.toFixed(1)),
      ),
    );
    body.lastElementChild?.classList.add('total');
  }

  el.append(tableEl);
  return el;
}

/** The continent table: size, and the hand as placed. One row per continent. */
function continentSection(reading: MapReport): HTMLElement {
  const el = section(
    'Continents',
    'Carved chunks of land, not landmasses — the unit a luxury hand is dealt to. ' +
      'The hand shown is what is actually growing there, counted off the ground.',
  );
  const { el: tableEl, body } = table([
    { label: '#', className: 'tight' },
    { label: 'Land', className: 'num tight' },
    { label: 'Luxuries' },
  ]);

  for (const continent of reading.continents.rows) {
    const label = cell('td', 'tight', '');
    label.append(swatchNode(partitionColor(continent.id, reading.continents.count), false));
    const number = document.createElement('span');
    number.className = 'coords';
    number.textContent = String(continent.id);
    label.append(number);

    const hand = document.createElement('td');
    hand.append(handNode(continent.luxuries));

    body.append(row(label, cell('td', 'num tight', String(continent.landTiles)), hand));
  }

  el.append(tableEl);
  return el;
}

/**
 * The start table: what each seat can feed and build, and what it can trade.
 *
 * The two figures are `scoreStartSite`'s own `ringFood` and `ringProduction` —
 * the numbers the chooser's two hard floors are read off — so a thin-looking
 * start is thin by the generator's measure and not by a second one.
 */
function startSection(reading: MapReport): HTMLElement {
  const el = section(
    'Starts',
    `Rings 1–2 workable food and production, read off the start scorer itself. ` +
      `Luxuries are the kinds within ${reading.starts.luxuryRadius} hexes — the ` +
      `radius the guarantee pass works to.`,
  );
  const { el: tableEl, body } = table([
    { label: 'Seat' },
    { label: 'Food', className: 'num tight' },
    { label: 'Prod', className: 'num tight' },
  ]);

  for (const start of reading.starts.rows) {
    const who = document.createElement('td');
    who.append(swatchNode(playerPieceColor('', start.playerId), true));
    const name = document.createElement('span');
    name.className = 'start-name';
    name.textContent = start.name;
    who.append(name);
    const at = document.createElement('span');
    at.className = 'coords';
    at.textContent = ` ${start.col},${start.row}`;
    who.append(at);
    body.append(
      row(
        who,
        cell('td', 'num tight', String(start.ringFood)),
        cell('td', 'num tight', String(start.ringProduction)),
      ),
    );

    // The detail line under each seat: its two site flags, its luxuries, and —
    // loudly — the scorer's refusal if it had one.
    const detail = document.createElement('tr');
    const holder = document.createElement('td');
    holder.colSpan = 3;
    // It is the row's first cell, and the first cell never wraps — but this one
    // is a paragraph of hand and flags, so it says otherwise for itself.
    holder.className = 'wrap';
    const flags = document.createElement('span');
    flags.className = 'flags';
    const fresh = document.createElement('span');
    fresh.className = start.freshwater ? 'on' : '';
    fresh.textContent = start.freshwater ? 'fresh' : 'dry';
    const coast = document.createElement('span');
    coast.className = start.coast ? 'on' : '';
    coast.textContent = start.coast ? 'coast' : 'inland';
    flags.append(fresh, document.createTextNode(' · '), coast, document.createTextNode(' · '));
    holder.append(flags, handNode(start.luxuries));
    if (start.reject !== null) {
      const why = document.createElement('span');
      why.className = 'reject';
      why.textContent = `refused site: ${start.reject}`;
      holder.append(why);
    }
    detail.append(holder);
    body.append(detail);
  }

  el.append(tableEl);
  return el;
}

function renderSections(reading: MapReport): void {
  sectionsEl.replaceChildren(
    censusSection(reading),
    continentSection(reading),
    startSection(reading),
  );
}

// --- input --------------------------------------------------------------------

function stepSeed(by: number): void {
  seedInput.value = String(currentSeed() + by);
  generate();
}

seedInput.addEventListener('change', generate);
seedPrevButton.addEventListener('click', () => stepSeed(-1));
seedNextButton.addEventListener('click', () => stepSeed(1));
seedRandomButton.addEventListener('click', () => {
  // UI-side only: the simulation itself never calls Math.random().
  seedInput.value = String(Math.floor(Math.random() * 1_000_000));
  generate();
});
seatsSelect.addEventListener('change', generate);
regenerateButton.addEventListener('click', generate);
continentsToggle.addEventListener('change', applyContinentOverlay);
yieldsToggle.addEventListener('change', applyLens);
resourcesToggle.addEventListener('change', applyLens);

/**
 * The camera, driven straight rather than through `src/ui/controls.ts`.
 *
 * That module is the *game's* input layer — selection, orders, move mode — and
 * none of it means anything here. What is left is drag to pan and wheel to zoom,
 * which is a dozen lines against the renderer's own two verbs.
 */
let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (dragging) {
    renderer.panByScreen(event.clientX - lastX, event.clientY - lastY);
    lastX = event.clientX;
    lastY = event.clientY;
    return;
  }
  // Picking is against the *canvas*, not the window: this page's canvas is
  // inset from the viewport by nothing on the left and by the sidebar on the
  // right, but stating the rect is what keeps that true if either moves.
  const rect = canvas.getBoundingClientRect();
  const hover = renderer.pick(event.clientX - rect.left, event.clientY - rect.top);
  // The renderer draws the hex outline; the card says what is inside it. Both
  // take the same `HoverInfo`, so they cannot point at different tiles.
  renderer.setHover(hover);
  showTile(hover);
});

canvas.addEventListener('pointerleave', () => {
  renderer.setHover(null);
  showTile(null);
});
canvas.addEventListener('pointerup', (event) => {
  dragging = false;
  canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    renderer.zoomBy(
      Math.exp(-event.deltaY * 0.0015),
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  },
  { passive: false },
);

window.addEventListener('keydown', (event) => {
  // A seed field with focus owns its own arrow keys; nothing else on the page
  // wants a keystroke while somebody is typing a number into it.
  const typing = document.activeElement instanceof HTMLInputElement;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === 'ArrowLeft' && !typing) stepSeed(-1);
  else if (event.key === 'ArrowRight' && !typing) stepSeed(1);
  else if (event.key === 'r' || event.key === 'R') seedRandomButton.click();
  else if (event.key === 'c' || event.key === 'C') {
    continentsToggle.checked = !continentsToggle.checked;
    applyContinentOverlay();
  } else if (event.key === 'y' || event.key === 'Y') {
    yieldsToggle.checked = !yieldsToggle.checked;
    applyLens();
  } else if (event.key === 'f' || event.key === 'F') renderer.fitToViewport();
  else return;
  event.preventDefault();
});

window.addEventListener('resize', () => renderer.resize());

generate();
