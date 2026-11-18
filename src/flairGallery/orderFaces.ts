/**
 * **The Order card's emblem face** (batch SS10, part 1), drawn by the game's
 * own builder (`src/ui/orderFace.ts`) for real rows.
 *
 * The board is `docs/plans/mockups/scholars-study/order-card-faces.html`,
 * "Face 1, the emblem". This section shows:
 *
 *   - the board's own sample cards, built. Their names are read from the
 *     board's file, so this page names no row;
 *   - a sample across the six decks, the four types and the three rarities,
 *     chosen from the data by what each row is;
 *   - the four frames and the states, at true size and at 2x;
 *   - the ten Orders with the longest effects, measured on the page;
 *   - every live card measured, on request, with the sizes they settle on;
 *   - the corner marks the face draws, at the usual three sizes.
 *
 * The live lines on these cards are samples, as they are on the board: the
 * face prints what the caller hands it and composes nothing itself.
 */

import './orderFaces.css';

import { ORDER_FACE_MARKS, type OrderFaceMarkId, orderFaceMarkUri } from '../art/orderFaceMarks';
import { commissionCounterWords, describeCard, stripRefs } from '../sim/statecraft';
import {
  CHAIR_TYPES,
  DECK_IDS,
  DOCTRINE_IDS,
  GOVERNMENT_IDS,
  ORDER_IDS,
  type OrderId,
  type OrderRarity,
  doctrineDef,
  isDoctrineId,
  orderDef,
  orderIsDealt,
  orderType,
} from '../sim/statecraftData';
import { stampOfYields, stampText } from '../ui/cardStamp';
import { counterFigure } from '../ui/goalCounter';
import {
  type OrderFaceCardId,
  type OrderFaceId,
  type OrderFacePlate,
  type OrderFaceState,
  type PlateFigure,
  chairTabNode,
  emptyChairFace,
  fitOrderFace,
  orderBackNode,
  orderFaceNode,
  registerFaceNode,
  tuckedDoctrineNode,
} from '../ui/orderFace';
import { fanPlacement } from '../ui/councilLayout';
import { block, button, controls, element, markCell, markGrid, slider } from './sheet';

/** A live Order: dealt, and not retired. */
function liveOrders(): OrderId[] {
  return ORDER_IDS.filter((id) => orderIsDealt(id));
}

/** A live Doctrine of a deck. */
function liveDoctrines(): OrderFaceCardId[] {
  return DOCTRINE_IDS.filter((id) => doctrineDef(id).retired !== true && doctrineDef(id).decks.length > 0);
}

/** A row's effect in plain words, the keyword clause left out. */
function effectWords(id: OrderFaceCardId): string {
  return describeCard(id)
    .filter((clause) => clause.keyword === undefined)
    .map((clause) => stripRefs(clause.text))
    .join(' ');
}

/** A sample "pays" line, from the card stamp's own composer. */
function paysLine(yields: Partial<Record<'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith', number>>) {
  const voices = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0, ...yields };
  return { kind: 'pays' as const, text: `pays ${stampText(stampOfYields(voices).figures)} this turn` };
}

/** A commission's first counter, in the game's own words, at a sample count. */
function counterLine(id: OrderId, have: number): OrderFaceState['liveLine'] {
  const goal = orderDef(id).commission?.goals[0];
  if (goal === undefined) return null;
  const need = goal.count;
  const done = Math.min(have, need);
  return {
    kind: 'counter',
    text: `${counterFigure({ label: '', have: done, need })} ${commissionCounterWords(goal)}`,
    progress: { done, of: need },
  };
}

/** A plate of cards on the board's lampblack, with a caption under each. */
function plate(into: HTMLElement, width?: number): HTMLElement {
  const node = element('div', 'of-plate5');
  if (width !== undefined) node.style.setProperty('--order-face-width', `${width}px`);
  into.append(node);
  return node;
}

/** One card on a plate, with its caption. Returns the card. */
function figure(into: HTMLElement, card: HTMLElement, caption: string): HTMLElement {
  const cell = element('figure', 'of-figure');
  cell.append(card, element('figcaption', undefined, caption));
  into.append(cell);
  return card;
}

/** Every card the section has drawn, so they can be fitted once the fonts are in. */
const drawnCards: HTMLElement[] = [];

function card(id: OrderFaceId, state: OrderFaceState): HTMLElement {
  const node = orderFaceNode(id, state);
  drawnCards.push(node);
  return node;
}

/** The fit a card settled on, in words, for its caption. */
function fitWords(node: HTMLElement): string {
  const fit = fitOrderFace(node);
  const parts = [`${fit.size} px`];
  if (fit.picture === 'short') parts.push('short picture');
  if (fit.name !== 'full') parts.push(`name ${fit.name}`);
  if (fit.colophon !== 'one') parts.push(`live line ${fit.colophon}`);
  if (fit.over) parts.push('does not fit');
  return parts.join(' · ');
}

// --- the board's own cards ---------------------------------------------------

/**
 * The board's sample cards, by the names its Face 1 section prints, looked up
 * in the data. The first five are the 2x plate; the sixth is the card the
 * board shows played and not confirmed.
 */
async function boardCardIds(): Promise<OrderFaceCardId[]> {
  const { default: html } = await import('../../docs/plans/mockups/scholars-study/order-card-faces.html?raw');
  const start = html.indexOf('<b>Face 1</b>');
  const end = html.indexOf('<b>Face 2</b>');
  const section = html.slice(start, end);
  const names: string[] = [];
  for (const match of section.matchAll(/class="motto"><i><\/i><span>([^<]+)<\/span>/g)) {
    if (!names.includes(match[1]!)) names.push(match[1]!);
  }
  const rows: OrderFaceCardId[] = [...liveOrders(), ...liveDoctrines()];
  return names.flatMap((name) => {
    const id = rows.find((row) => (isDoctrineId(row) ? doctrineDef(row) : orderDef(row)).name === name);
    return id === undefined ? [] : [id];
  });
}

/** The states the board draws its five cards in, in the board's order. */
function boardStates(ids: readonly OrderFaceCardId[]): OrderFaceState[] {
  return ids.map((id, index): OrderFaceState => {
    if (index === 0) return { where: 'played', liveLine: paysLine({ gold: 15 }) };
    if (index === 1) {
      return {
        where: 'played',
        unmet: { reason: 'no trade partner is at war' },
        liveLine: { kind: 'pays', text: '+0 now' },
      };
    }
    if (index === 2) return { where: 'played', liveLine: counterLine(id as OrderId, 3) };
    if (index === 3) return { where: 'played', liveLine: { kind: 'standing', text: 'in force' } };
    if (index === 4) return { where: 'played', liveLine: paysLine({ food: 14, production: 14 }) };
    return { where: 'played', staged: true, liveLine: { kind: 'waiting', text: 'awaits your seal: on Confirm' } };
  });
}

const BOARD_CAPTIONS = [
  'A short effect.',
  'A long effect, its condition not met.',
  'A commission with its counter.',
  'The board’s rule card. This effect prints a figure, so the build gives it a tablet.',
  'A Doctrine: the richest frame.',
  'Played, not confirmed.',
];

// --- the sample across the decks ---------------------------------------------

/**
 * One live Order for each deck and rarity, with the types cycled so all four
 * appear: the first row of each deck and rarity whose type is the next one
 * the sample still lacks, or any row of that deck and rarity.
 */
function deckSample(): OrderId[][] {
  const live = liveOrders().filter((id) => orderDef(id).decks.length === 1);
  const rarities: readonly OrderRarity[] = ['common', 'uncommon', 'rare'];
  const types = ['military', 'economic', 'civic', 'wildcard'] as const;
  let turn = 0;
  return DECK_IDS.map((deck) =>
    rarities.flatMap((rarity) => {
      const pool = live.filter((id) => orderDef(id).decks[0] === deck && orderDef(id).rarity === rarity);
      const wanted = types[turn % types.length]!;
      turn += 1;
      const pick = pool.find((id) => orderType(id) === wanted) ?? pool[0];
      return pick === undefined ? [] : [pick];
    }),
  );
}

// --- the section ---------------------------------------------------------------

export function drawOrderFaces(into: HTMLElement): void {
  // --- 1. the board's cards ---
  const boardBlock = block(
    into,
    'The board’s cards, built — src/ui/orderFace.ts',
    'The cards the board draws for Face 1, found by the names its file prints, at 2x. The words are the describers’ own, so they differ from the board’s paraphrase. The live lines are samples, as on the board.',
  );
  const boardPlate = plate(boardBlock, 420);
  boardPlate.dataset.plate = 'board';
  const boardTrue = plate(boardBlock);
  boardTrue.dataset.plate = 'board-true';
  void boardCardIds().then((ids) => {
    const states = boardStates(ids);
    ids.forEach((id, index) => {
      const target = index < 5 ? boardPlate : boardTrue;
      figure(target, card(id, states[index]!), BOARD_CAPTIONS[index] ?? '');
    });
    // The same five at true size, after the staged card.
    ids.slice(0, 5).forEach((id, index) => {
      figure(boardTrue, card(id, states[index]!), BOARD_CAPTIONS[index] ?? '');
    });
    fitAll();
  });

  // --- 2. across the decks ---
  const deckBlock = block(
    into,
    'Across the decks',
    'One live Order of each deck at each rarity, with the four types cycled through, at true size. The suit shows the deck, the ink the type, the border the rarity.',
  );
  const knobs = controls(deckBlock);
  const deckPlate = plate(deckBlock);
  deckPlate.dataset.plate = 'decks';
  slider(
    knobs,
    'card width',
    { min: 150, max: 420, step: 5, value: 210 },
    (value) => `${value}px`,
    (value) => deckPlate.style.setProperty('--order-face-width', `${value}px`),
  );
  for (const row of deckSample()) {
    for (const id of row) {
      figure(deckPlate, card(id, { where: 'hand' }), `${orderDef(id).rarity} · ${orderType(id)}`);
    }
  }

  // --- 3. the frames at 2x ---
  const frameBlock = block(
    into,
    'The four frames, at 2x',
    'Common: a plain double rule. Uncommon: a hatched band and corner flourishes. Rare: a gilt band with a punched pattern, a gilt ground, a black tier plate, the sun and the moon. A Doctrine: the heaviest gilt frame.',
  );
  const framePlate = plate(frameBlock, 420);
  framePlate.dataset.plate = 'frames';
  const economic = liveOrders().filter((id) => orderType(id) === 'economic' && orderDef(id).decks.length === 1);
  for (const rarity of ['common', 'uncommon', 'rare'] as const) {
    const pick = economic.find((id) => orderDef(id).rarity === rarity);
    if (pick !== undefined) figure(framePlate, card(pick, { where: 'hand' }), rarity);
  }
  const doctrine = liveDoctrines()[0];
  if (doctrine !== undefined) figure(framePlate, card(doctrine, { where: 'hand' }), 'Doctrine');

  // --- 4. the states ---
  const stateBlock = block(
    into,
    'The states, at true size and at 2x',
    'In the hand; played and paying; sealed, with the turns left; played this visit and not confirmed; its condition not met (no rays, the reason under the effect); a commission’s counter; and an empty chair of each type.',
  );
  for (const width of [210, 420]) {
    const statePlate = plate(stateBlock, width);
    statePlate.dataset.plate = `states-${width}`;
    drawStates(statePlate);
  }

  // --- 4b. the orders screen's forms (batch SS10, part 2) ---
  const screenBlock = block(
    into,
    'The orders screen’s forms — src/ui/orderFace.ts',
    'The forms the orders screen adds, on real rows: the hand form at 104 and 130 wide; a played card with the chair’s tab on its foot, sealed and not; a card played this visit with its gilt tag; an empty chair with its tab; and the gilt register, with the government and a Doctrine laid wide on a 104 px row.',
  );
  const screenPlate = plate(screenBlock);
  screenPlate.dataset.plate = 'screen-forms';
  drawScreenForms(screenPlate);

  // --- 4c. the Council screen's forms (stage 1 of the Council and In play board) ---
  const councilBlock = block(
    into,
    'Forms of the Council screen — src/ui/orderFace.ts',
    'The pay plate at the foot of a card: yields, a meter, a yield and a meter on one line, a cost in the debit red, and a card that could pay and pays nothing this turn ("+0" and the reason). A rule card has no plate. Then the 176 px card the screen takes at eleven chairs, the government with its own plate and its Doctrines tucked under it, the fan of the hand, and the draft pile’s card back. The figures and the reason are samples.',
  );
  const councilPlate = plate(councilBlock);
  councilPlate.dataset.plate = 'council-forms';
  drawCouncilForms(councilPlate);

  // --- 5. the hand, fanned ---
  const handBlock = block(
    into,
    'The hand',
    'One face in the hand and in a chair. The hand shows the top of each card, which is the name and the picture.',
  );
  const fan = element('div', 'of-fan');
  for (const id of deckSample().flat().slice(0, 6)) fan.append(card(id, { where: 'hand' }));
  const handPlate = plate(handBlock);
  handPlate.dataset.plate = 'hand';
  handPlate.append(fan);

  // --- 6. the longest texts ---
  const longBlock = block(
    into,
    'The longest effects',
    'The ten live Orders with the longest effects, at true size, each fitted on the page: 13 px on up to five lines, then down to 11 px, then a shorter picture. A card that still does not fit is cut with a fade at its foot, and its text scrolls inside the card when the card is lifted or focused. Nothing spills outside a card.',
  );
  const longPlate = plate(longBlock);
  longPlate.dataset.plate = 'longest';
  const longest = [...liveOrders()]
    .sort((a, b) => effectWords(b).length - effectWords(a).length)
    .slice(0, 10);
  const longCards = longest.map((id) => figure(longPlate, card(id, { where: 'hand' }), ''));

  // --- 7. every card, measured ---
  const measureBlock = block(
    into,
    'Every live card, measured',
    'Builds every live Order and Doctrine off the page, fits each one, and counts the sizes they settle on.',
  );
  const report = element('pre', 'of-report');
  const measureKnobs = controls(measureBlock);
  button(measureKnobs, 'Measure every card', () => {
    report.textContent = measureEveryCard();
  });
  measureBlock.append(report);
  if (new URLSearchParams(location.search).has('measure')) {
    void document.fonts.ready.then(() => {
      report.textContent = measureEveryCard();
    });
  }

  // --- 8. the marks ---
  const marksBlock = block(
    into,
    'The corner marks — src/art/orderFaceMarks.ts',
    'The board’s corner drawings, drawn again on the 24-unit grid: the uncommon flourish, the rare star, and the sun and the moon of the rare picture and the Doctrine.',
  );
  const grid = markGrid(marksBlock);
  grid.dataset.plate = 'marks';
  for (const id of Object.keys(ORDER_FACE_MARKS) as OrderFaceMarkId[]) {
    markCell(grid, id, orderFaceMarkUri(id), ORDER_FACE_MARKS[id].note);
  }

  function fitAll(): void {
    void document.fonts.ready.then(() => {
      for (const node of drawnCards) {
        const caption = node.parentElement?.querySelector('figcaption');
        const words = fitWords(node);
        if (caption !== null && caption !== undefined && longCards.includes(node)) {
          caption.textContent = `${node.querySelector('.of-name')?.textContent ?? ''} · ${words}`;
        }
      }
    });
  }
  fitAll();
}

/**
 * The orders screen's forms (batch SS10, part 2), on real rows chosen by what
 * each row is. The chair numbers and turns are samples.
 */
function drawScreenForms(into: HTMLElement): void {
  const live = liveOrders();
  const first = live[0]!;
  const rare = live.find((id) => orderDef(id).rarity === 'rare') ?? first;
  for (const width of [104, 130]) {
    const face = card(rare, { where: 'hand' });
    face.dataset.form = 'hand';
    face.style.setProperty('--order-face-width', `${width}px`);
    figure(into, face, `in the hand, ${width} wide`);
  }
  const economic = live.find((id) => orderType(id) === 'economic') ?? first;
  const seated = card(economic, { where: 'played', liveLine: paysLine({ gold: 15 }), tablet: { figure: '+15', yield: 'gold' } });
  seated.append(chairTabNode({ type: 'economic', number: 3, word: 'Economic' }));
  figure(into, seated, 'in a chair, with its tab');
  const military = live.find((id) => orderType(id) === 'military') ?? first;
  const sealed = card(military, { where: 'played', sealedTurns: 3, liveLine: { kind: 'standing', text: 'in force' }, tablet: null });
  sealed.append(chairTabNode({ type: 'military', number: 2, word: 'Military', sealedTurns: 3 }));
  figure(into, sealed, 'sealed: the lock and the turns on the tab');
  const civic = live.find((id) => orderType(id) === 'civic') ?? first;
  const staged = card(civic, {
    where: 'played',
    staged: true,
    tablet: null,
    tag: 'played, not confirmed',
    liveLine: { kind: 'waiting', text: 'awaits your seal: on Confirm' },
  });
  staged.append(chairTabNode({ type: 'civic', number: 7, word: 'Civic' }));
  figure(into, staged, 'played this visit, not confirmed');
  const empty = emptyChairFace('wildcard', 'An empty chair.\nIt takes any card.\nIt pays nothing.');
  empty.style.whiteSpace = 'pre-line';
  empty.style.position = 'relative';
  empty.append(chairTabNode({ type: 'wildcard', number: 11, word: 'Wildcard' }));
  figure(into, empty, 'an empty chair');
  const register = element('div', 'of-register-sample');
  const doctrine = liveDoctrines()[0];
  const lead = element('span', undefined, 'next draft');
  register.append(registerFaceNode({ id: GOVERNMENT_IDS[0]!, kind: 'government', plate: 'Tier 5', live: lead }));
  if (doctrine !== undefined) {
    const plateWords = element('span', undefined, 'in force');
    register.append(registerFaceNode({ id: doctrine, kind: 'doctrine', plate: 'Doctrine', live: plateWords }));
  }
  figure(into, register, 'the gilt register, laid wide');
}

/**
 * The forms of the Council screen (stage 1), on real rows chosen by what each row
 * is: the pay plate's cases, the 176 px card, the government and its tucked
 * Doctrines, the fan and the card back. The figures are samples.
 */
function drawCouncilForms(into: HTMLElement): void {
  const live = liveOrders();
  const first = live[0]!;
  const ofType = (type: string, rarity?: OrderRarity): OrderId =>
    live.find((id) => orderType(id) === type && (rarity === undefined || orderDef(id).rarity === rarity)) ?? first;
  const pays = (figures: PlateFigure[]): OrderFacePlate => ({ kind: 'pays', figures });
  figure(into, card(ofType('economic', 'common'), { where: 'played', plate: pays([{ voice: 'food', amount: 25 }, { voice: 'production', amount: 33 }]) }), 'pays each turn: the plate');
  figure(
    into,
    card(ofType('civic', 'uncommon'), {
      where: 'played',
      plate: pays([
        { voice: 'science', amount: 17 },
        { voice: 'culture', amount: 11 },
        { voice: 'faith', amount: 3 },
      ]),
    }),
    'three yields, one line',
  );
  figure(into, card(ofType('civic', 'common'), { where: 'played', plate: pays([{ voice: 'happiness', amount: 8 }]) }), 'pays happiness');
  figure(
    into,
    card(ofType('wildcard'), { where: 'played', plate: pays([{ voice: 'culture', amount: 15 }, { voice: 'authority', amount: 3 }]) }),
    'a yield and a meter',
  );
  figure(
    into,
    card(ofType('economic', 'uncommon'), {
      where: 'played',
      plate: pays([
        { voice: 'gold', amount: 12 },
        { voice: 'happiness', amount: -3 },
      ]),
    }),
    'a cost, in the debit red',
  );
  figure(
    into,
    card(ofType('civic', 'rare'), {
      where: 'played',
      unmet: { reason: 'you have no foreign trade routes' },
      plate: { kind: 'idle', reason: 'you have no foreign trade routes' },
    }),
    'could pay, pays nothing now',
  );
  figure(into, card(ofType('military', 'rare'), { where: 'played', plate: null }), 'a rule: no plate');
  const mid = card(ofType('wildcard'), { where: 'played', plate: pays([{ voice: 'culture', amount: 15 }, { voice: 'authority', amount: 3 }]) });
  mid.dataset.compact = 'mid';
  figure(into, mid, 'the 176 px card, at eleven chairs');

  // The government with its plate, and three Doctrines tucked under it.
  const column = element('div', 'of-council-gov');
  const government = GOVERNMENT_IDS.find((id) => describeCard(id).some((clause) => clause.keyword === undefined)) ?? GOVERNMENT_IDS[0]!;
  const face = card(government, { where: 'played', plate: pays([{ voice: 'culture', amount: 15 }]) });
  column.append(face);
  const doctrines = liveDoctrines().slice(0, 3);
  const tuckPlates: (OrderFacePlate | null)[] = [
    pays([
      { voice: 'food', amount: 52 },
      { voice: 'production', amount: 67 },
      { voice: 'happiness', amount: -3 },
    ]),
    pays([{ voice: 'food', amount: 14 }]),
    null,
  ];
  doctrines.forEach((id, index) => {
    const strip = tuckedDoctrineNode(id, tuckPlates[index] ?? null);
    strip.style.width = `${198 - (index + 1) * 6}px`;
    strip.style.zIndex = String(doctrines.length - index);
    column.append(strip);
  });
  figure(into, column, 'the government, its Doctrines tucked');

  // The fan: the hand's full faces, overlapped and turned, as the screen sets them.
  const fan = element('div', 'of-council-fan');
  const hand = deckSample().flat().slice(0, 7);
  const placement = fanPlacement(hand.length, 760);
  hand.forEach((id, index) => {
    const node = card(id, { where: 'hand', plate: null });
    node.dataset.form = 'fan';
    const at = placement.cards[index]!;
    node.style.left = `${at.left}px`;
    node.style.top = `${at.drop}px`;
    node.style.rotate = `${at.rotate}deg`;
    fan.append(node);
  });
  figure(into, fan, 'the fan, cut by the window’s edge on the screen');
  figure(into, orderBackNode(), 'the draft pile’s card back');
}

/** The states row: every state the face has, on real rows. */
function drawStates(into: HTMLElement): void {
  const live = liveOrders();
  const paying = live.find((id) => orderDef(id).rarity === 'uncommon' && orderType(id) === 'economic') ?? live[0]!;
  const military = live.find((id) => orderType(id) === 'military' && orderDef(id).rarity === 'common') ?? paying;
  // A rare card with a short effect, so the reason line has room under it.
  const conditional =
    live.find(
      (id) => orderType(id) === 'civic' && orderDef(id).rarity === 'rare' && effectWords(id).length < 90,
    ) ?? paying;
  const commission = live.find((id) => orderDef(id).commission !== undefined) ?? paying;
  const charter = live.find((id) => orderDef(id).charter !== undefined) ?? paying;
  figure(into, card(paying, { where: 'hand' }), 'In the hand');
  figure(into, card(paying, { where: 'played', liveLine: paysLine({ gold: 15 }) }), 'Played');
  figure(
    into,
    card(military, { where: 'played', sealedTurns: 3, liveLine: { kind: 'standing', text: 'in force' } }),
    'Sealed',
  );
  figure(
    into,
    card(charter, { where: 'played', staged: true, liveLine: { kind: 'waiting', text: 'on Confirm' } }),
    'Not confirmed',
  );
  figure(
    into,
    card(conditional, {
      where: 'played',
      unmet: { reason: 'the condition is not met' },
      liveLine: { kind: 'pays', text: '+0 now' },
    }),
    'Condition not met',
  );
  figure(into, card(commission, { where: 'played', liveLine: counterLine(commission, 1) }), 'A counter');
  for (const type of CHAIR_TYPES) figure(into, emptyChairFace(type, 'empty'), `Empty ${type} chair`);
}

/**
 * Builds every live card off the page, fits it, and reports the sizes in a
 * few lines. Also left on `window` for a script that captures the page.
 */
function measureEveryCard(): string {
  const stage = element('div', 'of-measure');
  document.body.append(stage);
  const ids: OrderFaceCardId[] = [...liveOrders(), ...liveDoctrines()];
  const counts = new Map<string, number>();
  const over: string[] = [];
  const short: string[] = [];
  const names: string[] = [];
  let smallest = Infinity;
  const misses: string[] = [];
  const rows: unknown[] = [];
  for (const id of ids) {
    const node = orderFaceNode(id, { where: 'hand' });
    stage.append(node);
    const estimate = { size: Number.parseFloat(node.style.getPropertyValue('--of-text')) * 10, picture: node.dataset.picture, over: node.dataset.overflow === 'true' };
    const fit = fitOrderFace(node);
    const key = `${fit.size} px${fit.picture === 'short' ? ', short picture' : ''}${fit.over ? ', does not fit' : ''}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const name = node.querySelector('.of-name')?.textContent ?? String(id);
    if (fit.over) over.push(name);
    else if (fit.picture === 'short') short.push(name);
    if (fit.name !== 'full' && fit.name !== 'long') names.push(`${name} (${fit.name})`);
    if (fit.colophon !== 'one') names.push(`${name} (foot ${fit.colophon})`);
    if (!fit.over) smallest = Math.min(smallest, fit.size);
    // An estimate that promised more room than the page has is the one worth knowing.
    const estimateRank = (estimate.over ? 100 : 0) + (estimate.picture === 'short' ? 10 : 0) + (13 - estimate.size);
    const fitRank = (fit.over ? 100 : 0) + (fit.picture === 'short' ? 10 : 0) + (13 - fit.size);
    if (fitRank > estimateRank) misses.push(`${name}: estimated ${estimate.size}${estimate.picture === 'short' ? ' short' : ''}, measured ${fit.size}${fit.picture === 'short' ? ' short' : ''}${fit.over ? ' over' : ''}`);
    const title = node.querySelector<HTMLElement>('.of-name');
    const motto = node.querySelector<HTMLElement>('.of-motto');
    const nameOver =
      title !== null && motto !== null && title.getBoundingClientRect().width > motto.clientWidth - 2;
    if (nameOver) names.push(`${name} (does not fit)`);
    rows.push({ id, name, estimate, fit, nameOver });
    node.remove();
  }
  stage.remove();
  const result = {
    cards: ids.length,
    counts: Object.fromEntries(counts),
    smallest,
    over,
    short,
    names,
    misses,
    rows,
  };
  (window as unknown as { orderFaceReport?: unknown }).orderFaceReport = result;
  return [
    `${ids.length} cards`,
    ...[...counts.entries()].map(([key, count]) => `${count} at ${key}`),
    `smallest text that fits: ${smallest} px`,
    `short picture: ${short.join('; ') || 'none'}`,
    `does not fit: ${over.join('; ') || 'none'}`,
    `names stepped past long: ${names.join('; ') || 'none'}`,
    `estimate short of the page: ${misses.length}`,
    ...misses,
  ].join('\n');
}
