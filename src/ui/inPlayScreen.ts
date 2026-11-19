/**
 * **In play**: everything in force for your seat, on the dark cloth, in five
 * stacks. Stage 3 of the approved Council and In play board
 * (`docs/plans/mockups/scholars-study/council-and-in-play/council-and-in-play.html`,
 * frames I1 to I5, IH, D1 and A1 to A3). The rulings, in the user's words, are
 * in `docs/plans/ui-critique-2026-10-16.md`, from "Two tabs: Council and In
 * play" to the approval of the board, and "Happiness and authority on the
 * cards and in In play".
 *
 * The player reads here and moves nothing (the user: "one screen where you
 * play cards, and another where you see all cards in play").
 *
 * The layout
 * ----------
 *   - **The head**: the title, the link back to the Council screen (C), the
 *     totals line and the close hint, on one centre line. The totals line is
 *     the Council screen's form (frame N4): the six yields, a hairline, then
 *     happiness and authority. Its figures are what everything on this screen
 *     pays each turn: the books with all of it, less the books with none of it.
 *   - **The left column**: the leader's crest with the two abilities and what
 *     each pays, then the government with its Doctrines tucked under it, as on
 *     the Council screen.
 *   - **Five stacks**: The council, Wonders, Beliefs, Legacies and Temporary.
 *     Each has its name, its count and its total. The top piece is drawn in
 *     its own form (a wonder's plate, a belief's tablet, a legacy's medal, a
 *     temporary tag); every other piece is one tucked edge of one size. The
 *     council is all edges, one a chair. A stack shows eight edges and then a
 *     "more" edge (frame I5). What is in each stack is `inPlayPieces.ts`.
 *   - **The tray**: a click on a stack, or on any piece in it, opens the stack
 *     as a row of full pieces at the foot. One stack is open at a time. A click
 *     on a piece in the tray goes to it: a council card to its chair on the
 *     Council screen, a wonder to its town, a belief to the Faith sheet, a
 *     legacy to the Reliquary.
 *   - **A total clicked** (frame IH): the pieces that pay or cost that figure
 *     stay lit and the rest dim, and a plain sheet lists every source of it,
 *     ending in what does not come from In play, so it adds up to the empire's
 *     figure (`inPlayBreakdown`).
 *
 * Hover or focus on a piece shows its full text. Esc closes the sheet or the
 * tray first, then the screen.
 *
 * The figures are read once when the screen opens and again when the state
 * changes, never on a frame (`beginInPlayReading`). A late game has some
 * seventy pieces, so the totals come first and the pieces' figures fill in
 * over the next moments.
 *
 * The arrival (frames A2 and A3): a wonder finished or a belief chosen since
 * the seat last looked sits on top of its stack with a glow; the door's dot
 * goes when the screen closes (`InPlayArrivals`).
 */

import './inPlayScreen.css';

import { heraldryFor, heraldryMarkDataUri } from '../art/heraldryMarks';
import { seatInks } from '../art/seatInks';
import type { GreatPersonId } from '../sim/greatPeopleData';
import type { CityYieldKey } from '../sim/resourceData';
import { type GameState, playerById } from '../sim/state';
import { type GovernmentId, type OrderId, isOrderId } from '../sim/statecraftData';
import { roundYield } from '../sim/yieldFormat';
import { COUNCIL_VOICES, type CouncilVoice } from './councilTotals';
import { element } from './dom';
import { edgeNode, maliceCardNode, moreEdgeNode, topFormNode } from './inPlayForms';
import {
  BREAKDOWN_WORDS,
  IN_PLAY_WORDS,
  VOICE_WORDS,
  type InPlayArrivals,
  type InPlayEntry,
  type InPlayLayout,
  type InPlayReading,
  type InPlayStack,
  type InPlayStackId,
  arrivalsOnTop,
  beginInPlayReading,
  continueInPlayReading,
  inPlayBreakdown,
  inPlayCount,
  inPlayLayout,
} from './inPlayPieces';
import { createModalShell } from './modalShell';
import { type OrderFacePlate, type PlateFigure, dressOrderFace, fitOrderFace, plateFigureNode, plateFigureText, tuckedDoctrineNode } from './orderFace';
import { keyMark } from './ordersLayers';
import { showPreview } from './ordersMotion';

export interface InPlayScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /** The state changed. Redraws if the screen is up; cheap enough to call always. */
  refresh(): void;
  dispose(): void;
}

interface InPlayScreenOptions {
  /** The full-screen overlay. Hidden with the `hidden` attribute while closed. */
  overlay: HTMLElement;
  /** The element the sheet's body is built into. */
  body: HTMLElement;
  /** The overlay's own close button. Drawn here as the "Esc closes" hint. */
  closeButton: HTMLElement;
  /** The corner panel's door, for the `aria-expanded` mirror. */
  trigger?: HTMLElement | null;
  /** The other doors: the Council screen's link. */
  doors?: () => readonly (HTMLElement | null | undefined)[];
  getState: () => GameState;
  getPlayerId: () => number;
  /** What arrived since the seat last looked. Shared with the door. */
  arrivals: InPlayArrivals;
  /** The Council screen, at a card's chair when one is named. */
  openCouncil: (card: OrderId | null) => void;
  openCity: (cityId: number) => void;
  /** The Faith sheet, at a town's rites when one is named. */
  openFaith: (cityId: number | null) => void;
  openReliquary: (person: GreatPersonId | null) => void;
  openLeader: () => void;
  openLedger: (voice: CityYieldKey) => void;
  /** Called when this screen opens, so the others can close. */
  onOpen?: () => void;
  /** The seat has seen its arrivals: the door's dot goes. */
  onSeen?: () => void;
}

/** How many edges a stack shows before its "more" edge (frame I5). */
const EDGES_SHOWN = 8;

/** How long one turn of reading pieces may take, in milliseconds. */
const READ_SLICE_MS = 24;

/** The pieces whose full text shows on hover or focus: the stacks, the tucked Doctrines and the abilities. */
const PREVIEWED = '.ip-pile [data-key], .council-tucks [data-key], .ip-ability[data-key]';

export function createInPlayScreen(options: InPlayScreenOptions): InPlayScreen {
  const { overlay, body, closeButton } = options;
  const sheetNode = overlay.querySelector<HTMLElement>('.statecraft-sheet');
  const head = overlay.querySelector<HTMLElement>('.statecraft-head');
  sheetNode?.classList.add('inplay-sheet');
  body.classList.add('inplay-body');

  /** The stack open as a tray, or none. Not state: what the player is looking at. */
  let openStack: InPlayStackId | null = null;
  /** The voice whose sources are shown (frame IH), or none. */
  let openVoice: CouncilVoice | null = null;
  /** The pending turn of reading, so a close or a new draw can stop it. */
  let readTimer: ReturnType<typeof setTimeout> | null = null;
  /** The full piece shown on hover or focus. */
  let preview: HTMLElement | null = null;
  /** This draw's layout and reading. */
  let layout: InPlayLayout | null = null;
  let reading: InPlayReading | null = null;
  /** The keys that arrived since the seat last looked, for this visit. */
  let fresh: ReadonlySet<string> = new Set();

  // The head: the link to the Council screen, the totals line and the close hint.
  const councilLink = element('button', 'ip-link') as HTMLButtonElement;
  councilLink.type = 'button';
  councilLink.append(element('span', undefined, `← ${IN_PLAY_WORDS.toCouncil}`), keyMark('C'));
  councilLink.addEventListener('click', () => options.openCouncil(null));
  const note = element('span', 'ip-readonly', IN_PLAY_WORDS.readOnly);
  const totalsNode = element('div', 'council-totals ip-totals');
  totalsNode.setAttribute('role', 'group');
  totalsNode.setAttribute('aria-label', IN_PLAY_WORDS.totalsLabel);
  totalsNode.title = IN_PLAY_WORDS.totalsTitle;
  const totalCells = new Map<CouncilVoice, HTMLButtonElement>();
  COUNCIL_VOICES.forEach((voice, index) => {
    if (index === 6) totalsNode.append(element('span', 'council-totals-rule'));
    const cell = element('button', 'council-total ip-total') as HTMLButtonElement;
    cell.type = 'button';
    cell.dataset.voice = voice;
    cell.append(plateFigureNode({ voice, amount: 0 }, 'council-total-fig'));
    cell.addEventListener('click', () => {
      openVoice = openVoice === voice ? null : voice;
      paint();
    });
    totalsNode.append(cell);
    totalCells.set(voice, cell);
  });
  closeButton.replaceChildren(keyMark('Esc'), ' closes');
  closeButton.classList.add('council-close');
  const headExtras = [councilLink, totalsNode];
  if (head !== null) {
    const titles = head.querySelector('.statecraft-head-titles');
    titles?.after(councilLink);
    head.insertBefore(totalsNode, closeButton);
    head.append(note);
  }

  /** Stops the reading in progress. */
  function stopReading(): void {
    if (readTimer !== null) clearTimeout(readTimer);
    readTimer = null;
  }

  /** Reads the next pieces, and paints once every figure is in. */
  function readOn(state: GameState, seat: number): void {
    readTimer = setTimeout(() => {
      readTimer = null;
      if (!shell.isOpen || options.getState() !== state) return;
      if (continueInPlayReading(state, seat, READ_SLICE_MS)) paint();
      else readOn(state, seat);
    }, 0);
  }

  function draw(): void {
    stopReading();
    const state = options.getState();
    const seat = options.getPlayerId();
    layout = inPlayLayout(state, seat);
    options.arrivals.note(seat, layout);
    fresh = options.arrivals.fresh(seat);
    reading = beginInPlayReading(state, seat, layout);
    paint();
    if (!reading.done) readOn(state, seat);
  }

  /** The plate a piece shows: its figures, or undefined while they are read. */
  function plateOf(entry: InPlayEntry): PlateFigure[] | undefined {
    return reading?.plates.get(entry.key);
  }

  function paintHead(): void {
    if (reading === null) return;
    for (const voice of COUNCIL_VOICES) {
      const cell = totalCells.get(voice)!;
      const amount = roundYield(reading.total[voice]);
      const figure = cell.querySelector<HTMLElement>('.council-total-fig');
      const number = figure?.querySelector('b');
      if (number) number.textContent = plateFigureText(amount);
      if (figure) {
        if (amount < 0) figure.dataset.sign = 'minus';
        else delete figure.dataset.sign;
      }
      cell.classList.toggle('is-on', openVoice === voice);
      cell.setAttribute('aria-pressed', String(openVoice === voice));
      cell.title = BREAKDOWN_WORDS.heading(VOICE_WORDS[voice]);
    }
  }

  function paint(): void {
    hidePreview();
    if (layout === null || reading === null) return;
    const active = document.activeElement;
    const focusKey = active instanceof HTMLElement && body.contains(active) ? (active.dataset.key ?? active.dataset.stack ?? null) : null;
    body.replaceChildren();
    paintHead();
    const breakdown = openVoice === null ? null : inPlayBreakdown(options.getState(), options.getPlayerId(), layout, reading, openVoice);
    sheetNode?.toggleAttribute('data-voice-open', breakdown !== null);

    const cloth = element('div', 'ip-cloth');
    cloth.append(drawLeft(layout, reading));
    const stacks = element('div', 'ip-stacks');
    for (const stack of layout.stacks) stacks.append(drawStack(stack));
    cloth.append(stacks);
    body.append(cloth);
    if (openStack !== null) {
      const stack = layout.stacks.find((entry) => entry.id === openStack);
      if (stack !== undefined) body.append(drawTray(stack));
    }
    if (breakdown !== null) {
      for (const node of body.querySelectorAll<HTMLElement>('[data-key]')) {
        node.classList.toggle('is-lit', breakdown.lit.has(node.dataset.key!));
        node.classList.toggle('is-dim', !breakdown.lit.has(node.dataset.key!));
      }
      body.append(drawBreakdown(breakdown));
    }
    for (const face of body.querySelectorAll<HTMLElement>('.order-face')) fitOrderFace(face);
    if (focusKey !== null) {
      body.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"], [data-stack="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
    }
  }

  // --- the left column: the crest, the government and its Doctrines ---------

  function drawLeft(layout: InPlayLayout, reading: InPlayReading): HTMLElement {
    const column = element('section', 'ip-left');
    if (layout.leader !== null) column.append(drawCrest(layout));
    const gov = element('div', 'council-gov ip-gov');
    const label = element('div', 'council-label');
    label.append(element('span', undefined, IN_PLAY_WORDS.government));
    if (layout.government.length > 1) label.append(element('span', undefined, IN_PLAY_WORDS.doctrineCount(layout.government.length - 1)));
    gov.append(label);
    const [law, ...doctrines] = layout.government;
    if (law !== undefined) {
      const card = element('div', 'council-gov-card ip-piece');
      card.dataset.key = law.key;
      card.tabIndex = 0;
      const face = element('div');
      const figures = reading.plates.get(law.key);
      const plate: OrderFacePlate | undefined = figures === undefined || figures.length === 0 ? undefined : { kind: 'pays', figures };
      dressOrderFace(face, law.card as GovernmentId, plate === undefined ? { where: 'played' } : { where: 'played', plate });
      card.append(face);
      card.setAttribute('aria-label', `${law.name}, ${IN_PLAY_WORDS.government}`);
      card.addEventListener('click', () => options.openCouncil(null));
      gov.append(card);
    }
    const tucks = element('div', 'council-tucks');
    doctrines.forEach((entry, index) => {
      const figures = reading.plates.get(entry.key);
      const strip = tuckedDoctrineNode(entry.card!, figures === undefined || figures.length === 0 ? null : { kind: 'pays', figures });
      strip.classList.add('council-tuck', 'ip-piece');
      strip.style.setProperty('--tuck', String(index + 1));
      strip.style.zIndex = String(doctrines.length - index);
      strip.dataset.key = entry.key;
      strip.tabIndex = 0;
      strip.setAttribute('aria-label', `${entry.name}, Doctrine`);
      strip.addEventListener('click', () => options.openCouncil(null));
      tucks.append(strip);
    });
    gov.append(tucks);
    column.append(gov);
    return column;
  }

  /** The leader's crest: the pennant with the seat's charge, the name, and each ability with its figure. */
  function drawCrest(layout: InPlayLayout): HTMLElement {
    const state = options.getState();
    const seat = options.getPlayerId();
    const player = playerById(state, seat);
    const crest = element('button', 'ip-crest') as HTMLButtonElement;
    crest.type = 'button';
    crest.addEventListener('click', () => options.openLeader());
    const inks = seatInks(player);
    const pennant = element('span', 'ip-pennant');
    pennant.style.setProperty('--pennant', inks.primary);
    const charge = element('i', 'ip-charge');
    charge.style.setProperty('--charge', `url("${heraldryMarkDataUri(heraldryFor(seat, player?.charge, player?.leader), '#000')}")`);
    pennant.append(charge);
    pennant.setAttribute('aria-hidden', 'true');
    crest.append(pennant, element('b', 'ip-crest-name', layout.leader ?? ''));
    for (const entry of layout.crest) {
      const row = element('span', 'ip-ability');
      row.dataset.key = entry.key;
      row.append(element('span', 'ip-ability-name', entry.name));
      const figures = element('span', 'ip-fig');
      for (const figure of reading?.plates.get(entry.key) ?? []) figures.append(plateFigureNode(figure));
      row.append(figures);
      crest.append(row);
    }
    return crest;
  }

  // --- the stacks ------------------------------------------------------------

  /** The stack's head: its name, its count and its total. */
  function stackHead(stack: InPlayStack): HTMLElement {
    const legend = element('button', 'ip-legend') as HTMLButtonElement;
    legend.type = 'button';
    const title = element('span', 'ip-legend-title');
    title.append(element('span', 'ip-legend-name', stack.name), element('span', 'ip-legend-count', String(stack.count)));
    legend.append(title);
    const total = element('span', 'ip-fig');
    if (reading !== null) {
      for (const voice of COUNCIL_VOICES) {
        const amount = roundYield(reading.stacks[stack.id][voice]);
        if (amount !== 0) total.append(plateFigureNode({ voice, amount }));
      }
    }
    legend.append(total);
    legend.dataset.stack = stack.id;
    legend.setAttribute('aria-expanded', String(openStack === stack.id));
    legend.addEventListener('click', () => toggleStack(stack.id));
    return legend;
  }

  function toggleStack(id: InPlayStackId): void {
    openStack = openStack === id ? null : id;
    paint();
  }

  function drawStack(stack: InPlayStack): HTMLElement {
    const column = element('section', 'ip-stack');
    column.dataset.stack = stack.id;
    column.classList.toggle('is-open', openStack === stack.id);
    column.setAttribute('aria-label', stack.name);
    column.append(stackHead(stack));
    const entries = arrivalsOnTop(stack.entries, fresh);
    const pile = element('div', 'ip-pile');
    if (entries.length === 0) {
      pile.append(element('div', 'ip-empty', IN_PLAY_WORDS.noneYet));
      column.append(pile);
      return column;
    }
    let shown = entries;
    let z = entries.length + 2;
    if (stack.id !== 'council') {
      const [top, ...rest] = entries;
      const form = topFormNode(top!, plateOf(top!), { fresh: fresh.has(top!.key) });
      form.classList.add('ip-top', 'ip-piece');
      form.style.zIndex = String(z--);
      pile.append(pieceButton(form, top!, stack.id));
      shown = rest;
    }
    const visible = shown.slice(0, EDGES_SHOWN);
    visible.forEach((entry, index) => {
      const edge = edgeNode(entry, plateOf(entry), { fresh: fresh.has(entry.key), first: stack.id === 'council' && index === 0 });
      edge.classList.add('ip-piece');
      edge.style.zIndex = String(z--);
      pile.append(pieceButton(edge, entry, stack.id));
    });
    if (shown.length > visible.length) {
      const more = moreEdgeNode(shown.length - visible.length);
      more.style.zIndex = String(z--);
      more.tabIndex = 0;
      more.setAttribute('role', 'button');
      more.addEventListener('click', () => toggleStack(stack.id));
      pile.append(more);
    }
    column.append(pile);
    return column;
  }

  /** A piece on a stack opens the stack's tray; it holds the keyboard as a button. */
  function pieceButton(node: HTMLElement, entry: InPlayEntry, stack: InPlayStackId): HTMLElement {
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', entry.name);
    node.addEventListener('click', () => toggleStack(stack));
    node.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleStack(stack);
    });
    return node;
  }

  // --- the tray --------------------------------------------------------------

  function drawTray(stack: InPlayStack): HTMLElement {
    const tray = element('section', 'ip-tray');
    tray.setAttribute('aria-label', IN_PLAY_WORDS.expanded(stack.name));
    const legend = element('div', 'ip-tray-head');
    legend.append(element('b', undefined, IN_PLAY_WORDS.expanded(stack.name)));
    legend.append(element('span', undefined, stack.id === 'council' ? IN_PLAY_WORDS.trayHintCouncil : IN_PLAY_WORDS.trayHint));
    tray.append(legend);
    const row = element('div', 'ip-tray-row');
    for (const entry of arrivalsOnTop(stack.entries, fresh)) {
      if (entry.form === 'chair') continue;
      const piece = trayPiece(entry);
      piece.classList.add('ip-tray-piece');
      if (entry.link !== null) {
        piece.tabIndex = 0;
        piece.setAttribute('role', 'button');
        piece.addEventListener('click', () => follow(entry));
        piece.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          follow(entry);
        });
      }
      row.append(piece);
    }
    tray.append(row);
    return tray;
  }

  /** A piece in the tray: a council card's full face, or the piece's own form with its text. */
  function trayPiece(entry: InPlayEntry): HTMLElement {
    const plate = plateOf(entry);
    const card = entry.card;
    const faced = (entry.form === 'order' && card !== null && isOrderId(card)) || entry.form === 'doctrine' || entry.form === 'government';
    if (faced && card !== null) {
      const face = element('article');
      const state: Parameters<typeof dressOrderFace>[2] =
        plate === undefined || plate.length === 0 ? { where: 'played' } : { where: 'played', plate: { kind: 'pays', figures: plate } };
      dressOrderFace(face, card as Parameters<typeof dressOrderFace>[1], state);
      face.dataset.key = entry.key;
      return face;
    }
    if (entry.form === 'malice') return maliceCardNode(entry, plate);
    return topFormNode(entry, plate, { text: true, fresh: fresh.has(entry.key) });
  }

  /** Goes where a piece leads. The screen closes, as every door out of it does. */
  function follow(entry: InPlayEntry): void {
    const link = entry.link;
    if (link === null) return;
    shell.close();
    switch (link.kind) {
      case 'council':
        options.openCouncil(link.card);
        return;
      case 'city':
        options.openCity(link.cityId);
        return;
      case 'faith':
        options.openFaith(link.cityId);
        return;
      case 'reliquary':
        options.openReliquary(link.person);
        return;
      case 'leader':
        options.openLeader();
        return;
    }
  }

  // --- a total clicked (frame IH) ---------------------------------------------

  function drawBreakdown(breakdown: ReturnType<typeof inPlayBreakdown>): HTMLElement {
    const sheet = element('section', 'ip-breakdown');
    sheet.setAttribute('role', 'dialog');
    const voice = VOICE_WORDS[breakdown.voice];
    sheet.setAttribute('aria-label', BREAKDOWN_WORDS.heading(voice));
    const top = element('div', 'ip-bd-head');
    top.append(element('h3', undefined, BREAKDOWN_WORDS.heading(voice)));
    top.append(plateFigureNode({ voice: breakdown.voice, amount: breakdown.empire }));
    sheet.append(top);
    const columns = element('div', 'ip-bd-columns');
    for (const section of breakdown.sections) {
      const part = element('div', 'ip-bd-section');
      part.append(element('h4', undefined, section.heading));
      let aloneSaid = false;
      for (const row of section.rows) {
        if (row.alone === true && !aloneSaid) {
          part.append(element('p', 'ip-bd-alone', BREAKDOWN_WORDS.aloneNote));
          aloneSaid = true;
        }
        const line = element('div', row.alone === true ? 'ip-bd-row is-alone' : 'ip-bd-row');
        const label = element('span', 'ip-bd-label', row.label);
        if (row.note !== undefined) label.append(element('small', undefined, ` ${row.note}`));
        line.append(label, plateFigureNode({ voice: breakdown.voice, amount: row.amount }));
        part.append(line);
      }
      columns.append(part);
    }
    sheet.append(columns);
    const foot = element('div', 'ip-bd-foot');
    if (breakdown.voice !== 'happiness' && breakdown.voice !== 'authority') {
      const ledger = element('button', 'ip-bd-link', `${BREAKDOWN_WORDS.ledger} →`) as HTMLButtonElement;
      ledger.type = 'button';
      const key = breakdown.voice as CityYieldKey;
      ledger.addEventListener('click', () => {
        shell.close();
        options.openLedger(key);
      });
      foot.append(ledger);
    }
    const close = element('button', 'ip-bd-close') as HTMLButtonElement;
    close.type = 'button';
    close.append(keyMark('Esc'));
    close.setAttribute('aria-label', BREAKDOWN_WORDS.close);
    close.addEventListener('click', () => {
      openVoice = null;
      paint();
    });
    foot.append(close);
    sheet.append(foot);
    return sheet;
  }

  // --- the full text on hover or focus -----------------------------------------

  function hidePreview(): void {
    preview?.remove();
    preview = null;
  }

  function entryOf(key: string): InPlayEntry | null {
    if (layout === null) return null;
    for (const entry of [...layout.government, ...layout.crest, ...layout.stacks.flatMap((stack) => stack.entries)]) {
      if (entry.key === key) return entry;
    }
    return null;
  }

  function onPreviewEnter(event: Event): void {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(PREVIEWED) : null;
    if (target === null || sheetNode === null) return;
    const entry = entryOf(target.dataset.key!);
    if (entry === null || entry.form === 'chair') return;
    hidePreview();
    let face: HTMLElement;
    if ((entry.form === 'order' || entry.form === 'doctrine' || entry.form === 'government') && entry.card !== null) {
      face = trayPiece(entry);
    } else {
      face = topFormNode(entry, plateOf(entry), { text: true });
    }
    face.classList.add('ip-preview-piece');
    preview = showPreview(sheetNode, target.getBoundingClientRect(), face, 'beside');
    preview.classList.add('ip-preview');
    for (const card of preview.querySelectorAll<HTMLElement>('.order-face')) fitOrderFace(card);
  }

  function onPreviewLeave(event: Event): void {
    const target = event.target instanceof Element ? event.target.closest(PREVIEWED) : null;
    if (target === null) return;
    const related = (event as PointerEvent | FocusEvent).relatedTarget;
    if (related instanceof Node && target.contains(related)) return;
    hidePreview();
  }

  body.addEventListener('pointerover', onPreviewEnter);
  body.addEventListener('pointerout', onPreviewLeave);
  body.addEventListener('focusin', onPreviewEnter);
  body.addEventListener('focusout', onPreviewLeave);

  /** Esc closes the sheet of sources, then the tray, then the screen. C goes to the Council, I closes. */
  function onKey(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (event.key === 'Escape') {
      if (openVoice !== null) {
        openVoice = null;
        paint();
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      if (openStack !== null) {
        openStack = null;
        paint();
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    }
    const target = event.target;
    if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return false;
    if (event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      event.stopPropagation();
      shell.close();
      options.openCouncil(null);
      return true;
    }
    if (event.key === 'i' || event.key === 'I') {
      event.preventDefault();
      event.stopPropagation();
      shell.close();
      return true;
    }
    return false;
  }

  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger: options.trigger ?? null,
    ...(options.doors === undefined ? {} : { doors: options.doors }),
    onOpen: () => options.onOpen?.(),
    onShow: () => {
      openStack = null;
      openVoice = null;
    },
    draw,
    onKey,
    onClose: () => {
      stopReading();
      hidePreview();
      openStack = null;
      openVoice = null;
      // The arrivals have been seen: the glow and the door's dot go.
      options.arrivals.seen(options.getPlayerId());
      fresh = new Set();
      options.onSeen?.();
    },
    onDispose: () => {
      stopReading();
      hidePreview();
      body.removeEventListener('pointerover', onPreviewEnter);
      body.removeEventListener('pointerout', onPreviewLeave);
      body.removeEventListener('focusin', onPreviewEnter);
      body.removeEventListener('focusout', onPreviewLeave);
      for (const node of headExtras) node.remove();
      note.remove();
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}

/** How many pieces the door counts, for the corner panel and the Council screen's link. */
export function inPlayDoorCount(state: GameState, seat: number): number {
  return inPlayCount(inPlayLayout(state, seat));
}
