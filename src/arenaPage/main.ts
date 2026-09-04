/**
 * **The arena page: five games nobody watches, and what the average says.**
 *
 * The eighth root page, and the one the bot's tuning is done on (ruled
 * 2026-09-04: *"let me configure these values how i want (with all further bot
 * changes adding to this page) and i can run a simulation for X turns … It
 * should simulate 5 games and print the average yields across the 5 games"*).
 *
 * The spectate page answers *why did the bot do that* one decision at a time.
 * This one answers the question underneath it — *is the sheet any good* — and
 * that question cannot be answered from one game: a seed decides whether a seat
 * opens on a river with three luxuries, and a single run of a retuned weight
 * proves nothing about the weight. So the unit of evidence here is **five games
 * on five seeds, averaged per seat position**.
 *
 * Three properties are the design, and each is load-bearing:
 *
 *   1. **The panel is generated, never listed.** Every control is walked out of
 *      the configuration itself (`panel.ts` over `knobs.ts`), so a knob added to
 *      `data/ai.json` tomorrow appears here with no edit to any file on this
 *      page — there is not one knob name in either module. The requirement was
 *      *"with all further bot changes adding to this page"*, and a page that
 *      needed maintaining to keep that promise would not keep it.
 *   2. **The games are played by the real driver, in workers.** `runArenaGame`
 *      (`run.ts`) calls `driveBots` — the loop the product plays its bots with —
 *      and each game runs in its own thread, so five of them are five seconds
 *      rather than half a minute of a frozen page.
 *   3. **Nothing is counted on this page.** Every figure comes off the
 *      simulation's own evaluators inside the worker; this file formats them and
 *      takes one mean.
 *
 * Runs **stack**, newest first, each captioned with the knobs it was run with.
 * A tuning session is a comparison, and a table that wiped itself when the
 * configuration changed would be a table nobody could compare anything against.
 */

import './style.css';

import { DEFAULT_PERSONA, PERSONA_IDS, personaLabel } from '../ai/aiConfig';
import { type KnobEdit, describeEdit, sheetOfEdits } from './knobs';
import { buildKnobPanel } from './panel';
import { READING_COLUMNS, type ArenaSeat, type GameReading, type ReadingColumn } from './run';
import type { ArenaMessage, ArenaTask } from './protocol';
import { MAP_SIZE_NAMES } from '../sim/mapgenData';
import { RULES } from '../sim/rulesData';
import { playerPieceColor } from '../render3d/lookData';

// --- the furniture ------------------------------------------------------------

function need<T extends Element>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`arena: #${id} is missing from arena.html`);
  return element as unknown as T;
}

const turnsInput = need<HTMLInputElement>('turns');
const gamesInput = need<HTMLInputElement>('games');
const seedInput = need<HTMLInputElement>('seed');
const sizeSelect = need<HTMLSelectElement>('size');
const seatsSelect = need<HTMLSelectElement>('seats');
const barbariansToggle = need<HTMLInputElement>('barbarians');
const seatPersonasEl = need<HTMLElement>('seat-personas');
const startButton = need<HTMLButtonElement>('run-start');
const cancelButton = need<HTMLButtonElement>('run-cancel');
const statusEl = need<HTMLElement>('run-status');
const progressEl = need<HTMLElement>('progress');
const dirtyEl = need<HTMLElement>('dirty');
const runsEl = need<HTMLElement>('runs');
const panelGroupsEl = need<HTMLElement>('panel-groups');
const panelResetButton = need<HTMLButtonElement>('panel-reset');
const panelStatusEl = need<HTMLElement>('panel-status');

/** The game's own two inks first, the renderer's palette after — spectate's rule. */
const GAME_SEAT_COLORS: readonly string[] = ['#d4502e', '#1f8a85'];
const SEAT_NAMES = ['Crimson', 'Teal', 'Amber', 'Indigo', 'Moss', 'Slate', 'Rust', 'Bone'];

function seatColor(index: number): string {
  return GAME_SEAT_COLORS[index] ?? `#${playerPieceColor('', index).toString(16).padStart(6, '0')}`;
}

function seatName(index: number): string {
  return SEAT_NAMES[index] ?? `Seat ${index + 1}`;
}

/** Every figure on this page, to one decimal. A column of means is read down. */
function figure(value: number): string {
  return value.toFixed(1);
}

function element<T extends HTMLElement>(tag: string, className?: string, text?: string): T {
  const made = document.createElement(tag);
  if (className !== undefined) made.className = className;
  if (text !== undefined) made.textContent = text;
  return made as T;
}

// --- the run controls ---------------------------------------------------------

for (const name of MAP_SIZE_NAMES) {
  const option = element<HTMLOptionElement>('option', undefined, name);
  option.value = name;
  sizeSelect.append(option);
}
sizeSelect.value = MAP_SIZE_NAMES.includes('standard') ? 'standard' : (MAP_SIZE_NAMES[0] ?? '');

for (let seats = Math.max(2, RULES.game.minPlayers); seats <= RULES.game.maxPlayers; seats++) {
  const option = element<HTMLOptionElement>('option', undefined, String(seats));
  option.value = String(seats);
  seatsSelect.append(option);
}
seatsSelect.value = '2';

/** One persona picker per seat. Rebuilt on a seat-count change, choices kept. */
function buildSeatPickers(): void {
  const wanted = Number(seatsSelect.value) || 2;
  const held = [...seatPersonasEl.querySelectorAll('select')].map((select) => select.value);
  seatPersonasEl.replaceChildren();
  for (let index = 0; index < wanted; index++) {
    const field = element<HTMLLabelElement>('label', 'field seat-field');
    const label = element('span', 'field-label', seatName(index));
    (label as HTMLElement).style.setProperty('--seat-ink', seatColor(index));
    label.classList.add('seat-label');
    const select = element<HTMLSelectElement>('select');
    // The persona ids, in the data file's own order — this page reads the sheet
    // itself, so there is nothing to launder them through.
    for (const id of PERSONA_IDS) {
      const option = element<HTMLOptionElement>('option', undefined, personaLabel(id));
      option.value = id;
      select.append(option);
    }
    select.value = held[index] ?? DEFAULT_PERSONA;
    field.append(label, select);
    seatPersonasEl.append(field);
  }
}

seatsSelect.addEventListener('change', () => buildSeatPickers());
buildSeatPickers();

function seatSpecs(): ArenaSeat[] {
  return [...seatPersonasEl.querySelectorAll('select')].map((select, index) => ({
    name: seatName(index),
    color: seatColor(index),
    persona: select.value,
  }));
}

// --- the generated panel ------------------------------------------------------

/**
 * The panel builds itself out of the sheet (`panel.ts`); this half owns only the
 * two things that are about *this page* rather than about a knob — the marker
 * that says the configuration is not the data file any more, and the button that
 * puts it back.
 */
const panel = buildKnobPanel(panelGroupsEl, () => refreshPanel());

function currentEdits(): KnobEdit[] {
  return panel.edits();
}

/** The reset button live or not, the count, and the deltas listed in full. */
function refreshPanel(): void {
  const edits = currentEdits();
  panelResetButton.disabled = edits.length === 0;
  panelStatusEl.textContent =
    edits.length === 0 ? 'at data' : `${edits.length} edit${edits.length === 1 ? '' : 's'}`;
  showDirty(edits);
}

/**
 * The marker: *this is not `data/ai.json`*, and here is exactly how it differs.
 *
 * The list is the tool. A run whose sheet nobody can state is a run nobody can
 * repeat, so the deltas are printed in full rather than counted.
 */
function showDirty(edits: readonly KnobEdit[]): void {
  dirtyEl.replaceChildren();
  dirtyEl.hidden = edits.length === 0;
  if (edits.length === 0) return;
  dirtyEl.append(element('p', 'dirty-head', 'Configuration differs from data/ai.json'));
  const list = element('ul', 'dirty-list');
  for (const edit of edits) list.append(element('li', undefined, describeEdit(edit)));
  dirtyEl.append(list);
}

panelResetButton.addEventListener('click', () => {
  panel.reset();
  refreshPanel();
});
refreshPanel();

// --- the run ------------------------------------------------------------------

/** Live workers, so Cancel has something to terminate. */
let live: Worker[] = [];
/** Readings for the run in flight, by game index; `null` until one lands. */
let landed: (GameReading | null)[] = [];
let outstanding = 0;

function setRunning(running: boolean): void {
  startButton.disabled = running;
  cancelButton.disabled = !running;
}

function start(): void {
  cancel(false);

  const turns = Math.max(1, Math.trunc(Number(turnsInput.value) || 1));
  const games = Math.max(1, Math.trunc(Number(gamesInput.value) || 1));
  const baseSeed = Math.trunc(Number(seedInput.value) || 0);
  const seats = seatSpecs();
  const edits = currentEdits();
  const tuning = sheetOfEdits(edits);
  const started = performance.now();

  landed = Array.from({ length: games }, () => null);
  outstanding = games;
  setRunning(true);
  statusEl.textContent = `running ${games} × ${turns} turns`;
  progressEl.replaceChildren();

  for (let index = 0; index < games; index++) {
    // Game i is seed base + i, and the seed is printed on every row it produced:
    // a run that cannot be pointed back at its seeds is not evidence.
    const seed = baseSeed + index;
    const line = element('p', 'progress-line', `game ${index + 1} · seed ${seed} — turn 0/${turns}`);
    progressEl.append(line);

    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    live.push(worker);
    worker.addEventListener('message', (event: MessageEvent<ArenaMessage>) => {
      const message = event.data;
      if (message.kind === 'progress') {
        line.textContent = `game ${index + 1} · seed ${seed} — turn ${message.turn}/${turns}`;
        return;
      }
      if (message.kind === 'failed') {
        line.classList.add('is-bad');
        line.textContent = `game ${index + 1} · seed ${seed} — failed: ${message.error}`;
      } else {
        landed[index] = message.reading;
        line.textContent =
          `game ${index + 1} · seed ${seed} — ${message.reading.turnsPlayed} turns` +
          ` in ${(message.reading.ms / 1000).toFixed(1)}s` +
          (message.reading.warnings > 0 ? ` · ${message.reading.warnings} refused` : '');
      }
      worker.terminate();
      outstanding -= 1;
      if (outstanding === 0) {
        setRunning(false);
        live = [];
        statusEl.textContent = `done in ${((performance.now() - started) / 1000).toFixed(1)}s`;
        publish({ turns, games, baseSeed, seats, edits, wall: performance.now() - started });
      }
    });
    const task: ArenaTask = {
      index,
      // Structured-clone safe by construction — every field is JSON.
      spec: {
        seed,
        sizeName: sizeSelect.value,
        turns,
        seats,
        barbarians: barbariansToggle.checked,
        tuning,
      },
      progressEvery: 3,
    };
    worker.postMessage(task);
  }
}

function cancel(say = true): void {
  for (const worker of live) worker.terminate();
  live = [];
  outstanding = 0;
  setRunning(false);
  if (say) statusEl.textContent = 'cancelled';
}

startButton.addEventListener('click', () => start());
cancelButton.addEventListener('click', () => cancel());

// --- the table ----------------------------------------------------------------

interface RunHeader {
  turns: number;
  games: number;
  baseSeed: number;
  seats: readonly ArenaSeat[];
  edits: readonly KnobEdit[];
  wall: number;
}

/** The short heads the table wears. Reading columns, not knobs — see `run.ts`. */
const COLUMN_LABELS: Record<ReadingColumn, string> = {
  cities: 'cities',
  population: 'pop',
  food: 'food',
  production: 'prod',
  gold: 'gold',
  goldPerTurn: 'gold/t',
  science: 'sci',
  culture: 'cul',
  faith: 'faith',
  units: 'units',
  soldiers: 'army',
  scouts: 'scouts',
  workers: 'work',
  techs: 'techs',
  beads: 'beads',
};

/** How many runs stay on the page. Enough to compare a session's tunings by eye. */
const KEPT_RUNS = 6;

function publish(header: RunHeader): void {
  const readings = landed.filter((reading): reading is GameReading => reading !== null);
  const block = element('div', 'run-block');

  const caption = element('h3', 'run-caption');
  caption.append(
    element(
      'span',
      'run-title',
      `${readings.length}/${header.games} games · ${header.turns} turns · seeds ` +
        `${header.baseSeed}–${header.baseSeed + header.games - 1} · ${sizeSelect.value}`,
    ),
  );
  caption.append(element('span', 'run-wall', `${(header.wall / 1000).toFixed(1)}s`));
  block.append(caption);

  const sheet = element(
    'p',
    header.edits.length === 0 ? 'run-sheet' : 'run-sheet is-dirty',
    header.edits.length === 0
      ? 'data/ai.json, untouched'
      : header.edits.map(describeEdit).join(' · '),
  );
  block.append(sheet);

  if (readings.length === 0) {
    block.append(element('p', 'note', 'No game finished.'));
  } else {
    block.append(table(readings, header));
  }

  runsEl.prepend(block);
  while (runsEl.children.length > KEPT_RUNS) runsEl.lastElementChild?.remove();
}

function table(readings: readonly GameReading[], header: RunHeader): HTMLElement {
  const made = element<HTMLTableElement>('table');

  const head = element('tr');
  head.append(element('th', undefined, 'seed'));
  head.append(element('th', undefined, 'seat'));
  for (const column of READING_COLUMNS) {
    head.append(element('th', 'num', COLUMN_LABELS[column]));
  }
  made.append(head);

  for (const reading of readings) {
    for (const seat of reading.seats) {
      const row = element('tr', seat.eliminated ? 'is-out' : undefined);
      row.append(element('td', 'seed', String(reading.seed)));
      row.append(seatCell(seat.name, seat.persona, seat.color));
      for (const column of READING_COLUMNS) {
        row.append(element('td', 'num', figure(seat[column])));
      }
      made.append(row);
    }
  }

  // The averages, per **seat position** — seat 0 across the seeds, seat 1 across
  // the seeds. Averaging over seats instead would answer a different question
  // (what a game produces) than the one the page is for (what a seat's sheet
  // produces), and the two personas in a run are usually not the same sheet.
  for (let index = 0; index < header.seats.length; index++) {
    const seats = readings
      .map((reading) => reading.seats[index])
      .filter((seat): seat is NonNullable<typeof seat> => seat !== undefined);
    if (seats.length === 0) continue;
    const row = element('tr', 'is-average');
    row.append(element('td', 'seed', 'mean'));
    row.append(seatCell(seats[0]!.name, seats[0]!.persona, seats[0]!.color));
    for (const column of READING_COLUMNS) {
      const total = seats.reduce((sum, seat) => sum + seat[column], 0);
      row.append(element('td', 'num', figure(total / seats.length)));
    }
    made.append(row);
  }
  return made;
}

function seatCell(name: string, persona: string, color: string): HTMLElement {
  const cell = element('td', 'seat-cell');
  const swatch = element('span', 'swatch');
  swatch.style.background = color;
  cell.append(swatch, document.createTextNode(name));
  cell.append(element('span', 'persona', persona));
  return cell;
}
