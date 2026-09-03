/**
 * **The spectate page: a game played by nobody, one decision at a time.**
 *
 * Two halves, and only one of them is really the point.
 *
 * The board is the *cheap* half and is borrowed wholesale: `Renderer3D` with
 * `setFogSeat(null)`, which is the fogless spectator reading every gallery page
 * already draws (see `src/mapgenPage/main.ts`). No seat means nothing is hidden
 * — the right reading for a page whose subject is what a bot *knows*, since the
 * bot itself is omniscient by construction (`bot.ts`' creed, clause two).
 *
 * The decision feed is the product. Every step is one `BotDecision` off
 * `createBotStepper` — the same command the driver would have sent, carrying the
 * candidates the policy weighed and the labelled arithmetic behind each score.
 * The table is not a summary of the appraisal; it *is* the appraisal, folded by
 * `foldTerms` (see `src/ai/decision.ts`), which is what makes it safe to read
 * this page as evidence about how the bot plays.
 *
 * What this page deliberately does not do:
 *
 *   · **It never drives a seat itself.** Every command goes through
 *     `createBotStepper`, which is `driveBots` unrolled and pinned byte-identical
 *     to it (`test/sim/aiDecision.slow.test.ts`). A page with its own loop would
 *     be a page showing a game the product does not play.
 *   · **It holds no opinion.** Nothing here scores, sorts by anything but a
 *     score the bot produced, or paraphrases a reason. `rankedCandidates` is a
 *     reading order and says so.
 */

import './style.css';

import { DEFAULT_PERSONA, PERSONA_IDS, type BotStep, createBotStepper, personaLabel } from '../ai/stepper';
import { type BotCandidate, type ValueTerm, rankedCandidates } from '../ai/decision';
import { type Game, createGame } from '../sim/game';
import { MAP_SIZE_NAMES } from '../sim/mapgenData';
import { RULES } from '../sim/rulesData';
import { type PlayerSpec, realPlayers } from '../sim/state';
import { empireRateReading } from '../sim/cities';
import { Renderer3D } from '../render3d/renderer3d';
import { playerPieceColor } from '../render3d/lookData';

// --- the furniture ------------------------------------------------------------

function need<T extends Element>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`spectate: #${id} is missing from spectate.html`);
  return element as unknown as T;
}

const canvas = need<HTMLCanvasElement>('gl');
const seedInput = need<HTMLInputElement>('seed');
const seedRandom = need<HTMLButtonElement>('seed-random');
const sizeSelect = need<HTMLSelectElement>('size');
const seatsSelect = need<HTMLSelectElement>('seats');
const personaSelect = need<HTMLSelectElement>('persona');
const startButton = need<HTMLButtonElement>('start');
const nextButton = need<HTMLButtonElement>('next-action');
const playTurnButton = need<HTMLButtonElement>('play-turn');
const clockEl = need<HTMLElement>('clock');
const seatsStrip = need<HTMLElement>('seats-strip');
const feedEl = need<HTMLElement>('feed');
const feedCount = need<HTMLElement>('feed-count');

/**
 * The first two seats keep the game's own inks so a spectator recognises them;
 * the rest fall back to the renderer's own palette, which is `mapgenPage`'s
 * bargain and for its reason.
 */
const GAME_SEAT_COLORS: readonly string[] = ['#d4502e', '#1f8a85'];

function seatColor(index: number): string {
  return (
    GAME_SEAT_COLORS[index] ?? `#${playerPieceColor('', index).toString(16).padStart(6, '0')}`
  );
}

const SEAT_NAMES = ['Crimson', 'Teal', 'Amber', 'Indigo', 'Moss', 'Slate', 'Rust', 'Bone'];

const ROSTER: PlayerSpec[] = Array.from({ length: RULES.game.maxPlayers }, (_, index) => ({
  name: SEAT_NAMES[index] ?? `Seat ${index + 1}`,
  color: seatColor(index),
  // `isHuman` is left off, which is exactly what makes a chair a bot
  // (`normalizeConfig` defaults it to false) — the same absence the landing
  // screen writes for a rival seat.
}));

for (const name of MAP_SIZE_NAMES) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  sizeSelect.append(option);
}
sizeSelect.value = MAP_SIZE_NAMES.includes('duel') ? 'duel' : (MAP_SIZE_NAMES[0] ?? '');

// Two to four chairs: below two there is nobody to play against, and above four
// a decision feed stops being readable long before the simulation minds.
for (let seats = Math.max(2, RULES.game.minPlayers); seats <= Math.min(4, RULES.game.maxPlayers); seats++) {
  const option = document.createElement('option');
  option.value = String(seats);
  option.textContent = String(seats);
  seatsSelect.append(option);
}
seatsSelect.value = '2';

// The personas, in the data file's own order. The names come through the
// stepper rather than off the tuning surface — see its re-export's docblock:
// this page may know what a persona is *called* and must never know what it is
// worth.
for (const id of PERSONA_IDS) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = personaLabel(id);
  personaSelect.append(option);
}
personaSelect.value = DEFAULT_PERSONA;

const renderer = new Renderer3D(canvas);
// No seat: the spectator board every gallery already draws. Nothing is fogged,
// and the seat-filtered layers (units, cities, territory) draw everybody's.
renderer.setFogSeat(null);

// --- the game -----------------------------------------------------------------

let game: Game | null = null;
let stepper: ReturnType<typeof createBotStepper> | null = null;
let taken = 0;

/**
 * A fresh all-bot game.
 *
 * An ordinary `createGame` with an all-bot roster and nothing else — no founding
 * pass, no seeding, no nudge. The bots found their own capitals on the first
 * turn, which is itself one of the decisions worth watching.
 */
function start(): void {
  const seed = Number.parseInt(seedInput.value, 10);
  // The persona rides on every seat's spec, which is where it belongs: it is
  // config, so the save this page's game would write replays with the same
  // seats playing the same way. Balanced is written as *no key at all*, so a
  // balanced spectacle is byte-identical to one from before personas existed.
  const persona = personaSelect.value;
  const seated = ROSTER.slice(0, Number(seatsSelect.value) || 2).map((spec) =>
    persona === DEFAULT_PERSONA ? spec : { ...spec, persona },
  );
  const config = {
    seed: Number.isFinite(seed) ? seed : 1,
    sizeName: sizeSelect.value,
    players: seated,
    barbarians: true,
  };
  const session = createGame(config);
  game = session;
  stepper = createBotStepper(session);
  taken = 0;

  feedEl.replaceChildren();
  // Resize first, frame after, and both explicitly — `mapgenPage`'s note: on the
  // very first render the canvas may still be the platform's 300×150 element.
  renderer.resize();
  renderer.setGameState(session.state);
  renderer.fitToViewport();
  refreshChrome();
}

/** One decision, applied and printed. */
function stepOnce(): BotStep | null {
  if (stepper === null || game === null) return null;
  const step = stepper.step();
  if (step === null) {
    refreshChrome();
    return null;
  }
  taken += 1;
  renderer.setGameState(game.state);
  renderer.noteStateChanged();
  if (step.decision.focus) renderer.panToCells([step.decision.focus], true);
  feedEl.prepend(entryFor(step));
  refreshChrome();
  return step;
}

/** Every decision left in this turn, printed in the order they were taken. */
function playTurn(): void {
  if (stepper === null) return;
  for (let guard = 0; guard < 4000; guard++) {
    const step = stepOnce();
    if (step === null || step.turnResolved) return;
  }
}

// --- the chrome ---------------------------------------------------------------

function refreshChrome(): void {
  const session = game;
  const running = session !== null && stepper !== null && !stepper.stalled();
  nextButton.disabled = !running;
  playTurnButton.disabled = !running;
  if (session === null) {
    clockEl.textContent = '—';
    seatsStrip.replaceChildren();
    feedCount.textContent = '—';
    return;
  }
  const winner = session.state.winnerId;
  clockEl.textContent =
    winner === null ? `turn ${session.state.turn}` : `turn ${session.state.turn} · decided`;
  feedCount.textContent = `${taken} taken`;
  seatsStrip.replaceChildren(...realPlayers(session.state).map((player) => seatRow(player.id)));
}

/**
 * One seat's line: what the feed's numbers are numbers *about*.
 *
 * Read off the simulation's own books — `empireRateReading` is the very fold
 * `collectYields` banks, and it is the reading `goldPressure` swings on, so the
 * treasury printed here is the treasury the bot appraised against.
 */
function seatRow(playerId: number): HTMLElement {
  const session = game!;
  const player = session.state.players[playerId]!;
  const rate = empireRateReading(session.state, playerId);
  const cities = session.state.cities.filter((city) => city.ownerId === playerId).length;
  const units = session.state.units.filter((unit) => unit.ownerId === playerId).length;

  const row = document.createElement('div');
  row.className = player.eliminated ? 'seat out' : 'seat';
  row.append(swatch(playerId));
  row.append(span('who', player.name));
  row.append(span('stat', `${cities}⌂  ${units}⚔`));
  row.append(span('stat', `${player.gold}💰 ${signed(rate.goldPerTurn ?? 0)}/t`));
  row.append(span('stat', `${player.faithPool}✝ ${signed(rate.faithPerTurn ?? 0)}/t`));
  row.append(span('stat', `${player.techsResearched.length}🔬  ${player.beads.length}●`));
  return row;
}

function swatch(playerId: number): HTMLElement {
  const mark = document.createElement('span');
  mark.className = 'swatch';
  mark.style.background = game?.state.players[playerId]?.color ?? '#000';
  return mark;
}

function span(className: string, text: string): HTMLElement {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

// --- the feed -----------------------------------------------------------------

/**
 * One decision, as a row that opens into its whole candidate table.
 *
 * The head line is what a reader scans — turn, seat, subject, kind, the chosen
 * candidate's score — and the body is what they came for. Nothing in the body is
 * computed here: the scores, the terms and the refusals are all off the
 * `BotDecision`, which is off the policy that actually sent the command.
 */
function entryFor(step: BotStep): HTMLElement {
  const { decision } = step;
  const entry = document.createElement('details');
  // The one thing that colours a row: the reducer said no. A refusal from this
  // bot is a bug rather than a strategy (`bot.ts`' creed), so it is worth
  // seeing from across the feed.
  entry.className = step.result.ok ? 'entry' : 'entry refused';

  const head = document.createElement('summary');
  head.append(span('turn', `t${step.turn}`));
  head.append(swatch(step.playerId));
  head.append(span('subject', decision.subject));
  head.append(span('kind', decision.kind));
  const chosen = decision.candidates.find((row) => row.chosen);
  if (chosen) head.append(span('score', figure(chosen.score)));
  if (!step.result.ok) head.append(span('score', 'refused'));
  entry.append(head);

  const why = document.createElement('p');
  why.className = 'why';
  why.textContent = step.result.ok
    ? decision.summary
    : `${decision.summary} — the reducer refused it: ${step.result.error}`;
  entry.append(why);

  const body = document.createElement('div');
  body.className = 'body';
  if (decision.candidates.length === 0) {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'Nothing was weighed here.';
    body.append(note);
  } else {
    body.append(candidateTable(decision.candidates));
  }
  const command = document.createElement('p');
  command.className = 'note';
  command.textContent = JSON.stringify(decision.command);
  body.append(command);
  entry.append(body);
  return entry;
}

/** Every candidate, best first, the chosen one marked, each with its arithmetic. */
function candidateTable(candidates: readonly BotCandidate[]): HTMLElement {
  const table = document.createElement('table');
  table.className = 'candidates';

  const header = document.createElement('tr');
  for (const [label, numeric] of [
    ['', false],
    ['candidate', false],
    ['score', true],
  ] as const) {
    const cell = document.createElement('th');
    if (numeric) cell.className = 'num';
    cell.textContent = label;
    header.append(cell);
  }
  table.append(header);

  for (const candidate of rankedCandidates(candidates)) {
    const row = document.createElement('tr');
    row.className = candidate.chosen ? 'picked' : candidate.rejected !== undefined ? 'struck' : '';

    const mark = document.createElement('td');
    mark.className = 'mark';
    mark.textContent = candidate.chosen ? '▸' : '';
    row.append(mark);

    const label = document.createElement('td');
    label.append(document.createTextNode(candidate.label));
    if (candidate.rejected !== undefined) {
      const reason = document.createElement('div');
      reason.className = 'reason';
      reason.textContent = candidate.rejected;
      label.append(reason);
    } else if (candidate.terms.length > 0) {
      label.append(termList(candidate.terms));
    }
    row.append(label);

    const score = document.createElement('td');
    score.className = 'num';
    score.textContent = candidate.rejected === undefined ? figure(candidate.score) : '—';
    row.append(score);

    table.append(row);
  }
  return table;
}

/**
 * A term list, in the order the fold takes it.
 *
 * The operator is printed on the value rather than inferred from the sign,
 * because that is what the fold does: `− 12` and `÷ 6` are two different things
 * happening to the accumulator and a reader working out why a score came to what
 * it did needs to see which. A term with `parts` opens into its own list.
 */
function termList(terms: readonly ValueTerm[]): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'terms';
  for (const term of terms) {
    const item = document.createElement('li');
    const value = `${prefix(term)}${figure(term.value)}`;
    if (term.parts !== undefined && term.parts.length > 0) {
      const nested = document.createElement('details');
      const head = document.createElement('summary');
      head.append(span('t-label', term.label));
      head.append(span('t-value', value));
      head.style.display = 'flex';
      head.style.gap = '6px';
      nested.append(head);
      nested.append(termList(term.parts));
      item.append(nested);
      item.style.display = 'block';
    } else {
      item.append(span('t-label', term.label));
      item.append(span('t-value', value));
    }
    list.append(item);
  }
  return list;
}

function prefix(term: ValueTerm): string {
  switch (term.op ?? 'add') {
    case 'sub':
      return '− ';
    case 'mul':
      return '× ';
    case 'div':
      return '÷ ';
    default:
      return '';
  }
}

/** Two decimal places at most, and no trailing zeros. Every figure is tabular. */
function figure(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded.toFixed(2));
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

// --- wiring -------------------------------------------------------------------

startButton.addEventListener('click', () => start());
seedRandom.addEventListener('click', () => {
  // The seed is the only place this page needs a number nobody chose, and it
  // never reaches the simulation as anything but a config field — `Math.random`
  // here is a text box being filled in, not a decision.
  seedInput.value = String(Math.floor(Math.random() * 1_000_000));
});
nextButton.addEventListener('click', () => stepOnce());
playTurnButton.addEventListener('click', () => playTurn());

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === 'n') stepOnce();
  if (event.key === 't') playTurn();
});

// The board's own gestures, exactly as the gallery pages wire them: drag to pan,
// scroll to zoom. Nothing here selects, targets or orders anything — a spectator
// has no seat.
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
  if (!dragging) return;
  renderer.panByScreen(event.clientX - lastX, event.clientY - lastY);
  lastX = event.clientX;
  lastY = event.clientY;
});
canvas.addEventListener('pointerup', () => {
  dragging = false;
});
canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    renderer.zoomBy(
      event.deltaY > 0 ? 0.9 : 1.1,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  },
  { passive: false },
);

window.addEventListener('resize', () => renderer.resize());

start();
