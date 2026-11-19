/**
 * **The forms of the In play screen** (stage 3 of the Council and In play
 * board, `docs/plans/mockups/scholars-study/council-and-in-play/`, the forms
 * of frames I1 to I5): a wonder's plate, a belief's tablet, a legacy's medal,
 * a temporary effect's tag, the tucked edge every other piece is drawn as, and
 * the "more" edge a deep stack ends in. The screen (`inPlayScreen.ts`) and the
 * Flair Cabinet (`src/flairGallery/inPlayForms.ts`) both draw from here, so the
 * cabinet shows the forms the game draws.
 *
 * **Every edge has one size and one layout** (the user: "each card the same
 * size"): a seal, the name, and the figure for each turn. A piece that is a
 * rule shows its name and no figure, as on the Council screen. The figures
 * are the pay plate's (`plateFigureNode`): yields in their inks, happiness and
 * authority in the ink of the text (the ruling of 2026-11-18).
 *
 * **A wonder's picture window has one source** (`wonderPicture`). Today every
 * wonder draws the engraved stand-in: the temple mark over a line of hills.
 * When a wonder has a painted picture (the user: "the wonders should
 * eventually have splash art"), that function answers its address and the
 * window shows it; nothing else changes.
 */

import { type InPlayMarkId, inPlayMarkDataUri } from '../art/inPlayMarks';
import type { BuildingId } from '../sim/buildingData';
import { describeBuildingRow, describeCard } from '../sim/statecraft';
import { element } from './dom';
import type { InPlayEntry, InPlayForm } from './inPlayPieces';
import { IN_PLAY_WORDS } from './inPlayPieces';
import { setDescriptorText } from './keywords';
import { type PlateFigure, orderFaceModel, plateFigureNode } from './orderFace';
import { suitMarkDataUri } from './suitFace';

/** What a wonder's picture window shows. One answer for every wonder today. */
export type WonderPicture = { kind: 'engraved'; mark: InPlayMarkId } | { kind: 'painted'; url: string };

/**
 * **The one source of a wonder's picture.** Every wonder draws the engraved
 * stand-in until it has a painted picture; then this answers its address.
 */
export function wonderPicture(_id: BuildingId): WonderPicture {
  return { kind: 'engraved', mark: 'wonder' };
}

/** The ink a form's seal and border wear, as a CSS class word. */
const FORM_INK: Readonly<Record<InPlayForm, string>> = {
  government: 'gilt',
  doctrine: 'gilt',
  order: 'order',
  malice: 'malice',
  chair: 'chair',
  wonder: 'wonder',
  belief: 'belief',
  holyCity: 'belief',
  legacy: 'legacy',
  bead: 'bead',
  commission: 'legacy',
  timed: 'timed',
  ability: 'leader',
};

/** The mark in a form's seal. An Order wears its deck's suit; the rest their own mark. */
const FORM_MARK: Readonly<Record<Exclude<InPlayForm, 'order' | 'government' | 'doctrine' | 'ability'>, InPlayMarkId>> = {
  malice: 'malice',
  chair: 'chair',
  wonder: 'wonder',
  belief: 'belief',
  holyCity: 'holyCity',
  legacy: 'legacy',
  bead: 'bead',
  commission: 'commission',
  timed: 'timed',
};

/** A mark drawn through a CSS mask, so it takes the ink of its piece. */
export function inPlayMarkNode(uri: string, className = 'ip-mark'): HTMLElement {
  const mark = element('span', className);
  mark.setAttribute('aria-hidden', 'true');
  mark.style.setProperty('--ip-mark', `url("${uri}")`);
  return mark;
}

/** The seal of an edge: the piece's mark in a ring. */
function sealNode(entry: InPlayEntry): HTMLElement {
  const seal = element('span', 'ip-seal');
  let uri: string;
  if (entry.form === 'order') {
    const model = entry.card === null ? null : orderFaceModel(entry.card as Parameters<typeof orderFaceModel>[0], { where: 'played' });
    uri = suitMarkDataUri(model?.suits[0] ?? 'seal');
    if (model !== null) seal.dataset.ink = model.ink;
  } else if (entry.form === 'government' || entry.form === 'doctrine' || entry.form === 'ability') {
    uri = suitMarkDataUri(entry.form === 'ability' ? 'seal' : 'crowns');
  } else {
    uri = inPlayMarkDataUri(FORM_MARK[entry.form]);
  }
  seal.append(inPlayMarkNode(uri));
  return seal;
}

/** The figures of a plate, or nothing for a rule; a faint mark while the figure is being read. */
function figuresNode(plate: readonly PlateFigure[] | undefined, className = 'ip-fig'): HTMLElement {
  const node = element('span', className);
  if (plate === undefined) {
    node.dataset.reading = 'true';
    return node;
  }
  for (const figure of plate) node.append(plateFigureNode(figure));
  return node;
}

/** The small line a temporary piece carries: the turn it ends on, as a figure. */
function endsNode(endsTurn: number): HTMLElement {
  const node = element('span', 'ip-ends');
  node.append(element('small', undefined, IN_PLAY_WORDS.endsTurn), element('b', undefined, String(endsTurn)));
  return node;
}

/** Options every form takes: the arrival's glow, and whether it is the top of its stack. */
export interface FormOptions {
  /** Arrived since the seat last looked: on top, with the glow (frame A3). */
  fresh?: boolean;
  /** The first edge of a stack with no top form: it has its own top border. */
  first?: boolean;
}

/** Marks a form with its key, its ink and its arrival. */
function dress(node: HTMLElement, entry: InPlayEntry, options: FormOptions): HTMLElement {
  node.dataset.key = entry.key;
  node.dataset.ink = FORM_INK[entry.form];
  node.dataset.form = entry.form;
  if (options.fresh === true) node.classList.add('is-fresh');
  return node;
}

/**
 * **The tucked edge** (frame I3): 206 by 46 px, a seal, the name, and the
 * figure for each turn. A council edge counts its chair; a temporary edge
 * carries the turn it ends on.
 */
export function edgeNode(entry: InPlayEntry, plate: readonly PlateFigure[] | undefined, options: FormOptions = {}): HTMLElement {
  const edge = dress(element('div', 'ip-edge'), entry, options);
  if (options.first === true) edge.classList.add('is-first');
  edge.append(sealNode(entry));
  const text = element('span', 'ip-edge-text');
  const name = element('b', 'ip-edge-name');
  if (entry.chair !== undefined) name.append(element('i', 'ip-chair', String(entry.chair + 1)));
  name.append(entry.name);
  text.append(name);
  const foot = element('span', 'ip-edge-foot');
  // The figures keep one line at the edge's one size: more figures, smaller
  // type, and past two the small line under the name gives way to them. The
  // hover shows the piece whole.
  const count = entry.form === 'chair' ? 0 : (plate?.length ?? 0);
  if (entry.endsTurn !== undefined) foot.append(endsNode(entry.endsTurn));
  else if (entry.sub !== null && entry.form !== 'order' && count <= 2) foot.append(element('small', 'ip-edge-sub', entry.sub));
  const figures = figuresNode(entry.form === 'chair' ? [] : plate);
  figures.dataset.figures = String(Math.min(count, 6));
  foot.append(figures);
  text.append(foot);
  edge.append(text);
  return edge;
}

/** **The "more" edge** (frame I5): the same size, and how many pieces are under it. */
export function moreEdgeNode(count: number): HTMLElement {
  const edge = element('div', 'ip-edge ip-more');
  edge.append(element('span', 'ip-more-count', IN_PLAY_WORDS.more(count)));
  edge.append(element('span', 'ip-more-hint', IN_PLAY_WORDS.moreHint));
  return edge;
}

/** The piece's own sentences, through the describers: a named thing is a keyword. */
export function pieceTextNode(entry: InPlayEntry, className = 'ip-text'): HTMLElement | null {
  let clauses: readonly { text: string }[] = [];
  if (entry.form === 'wonder' && entry.card !== null) clauses = describeBuildingRow(entry.card as BuildingId);
  else if (entry.form === 'holyCity') clauses = [{ text: HOLY_CITY_TEXT }];
  else if (entry.card !== null && entry.form !== 'chair') clauses = describeCard(entry.card);
  if (clauses.length === 0) return null;
  const node = element('div', className);
  for (const clause of clauses) {
    const line = element('p');
    setDescriptorText(line, clause.text, { linked: false });
    node.append(line);
  }
  return node;
}

/** What the founder's share is, in plain words: the holy city has no card row of its own. */
const HOLY_CITY_TEXT = 'Whoever holds the holy city is paid a share for the faith’s followers across the world.';

/** **A wonder's plate**: the picture window, the name, its town and its figure. */
export function wonderPlateNode(entry: InPlayEntry, plate: readonly PlateFigure[] | undefined, options: FormOptions & { text?: boolean } = {}): HTMLElement {
  const form = dress(element('div', 'ip-wonder'), entry, options);
  const window = element('div', 'ip-window');
  const picture = wonderPicture((entry.card ?? '') as BuildingId);
  if (picture.kind === 'painted') {
    window.dataset.picture = 'painted';
    window.style.backgroundImage = `url("${picture.url}")`;
  } else {
    window.dataset.picture = 'engraved';
    window.append(inPlayMarkNode(inPlayMarkDataUri('hills'), 'ip-mark ip-hills'), inPlayMarkNode(inPlayMarkDataUri(picture.mark), 'ip-mark ip-device'));
  }
  form.append(window);
  const body = element('div', 'ip-body');
  body.append(element('b', 'ip-name', entry.name));
  if (options.text === true) {
    const text = pieceTextNode(entry);
    if (text !== null) body.append(text);
  }
  const foot = element('div', 'ip-foot');
  foot.append(element('span', 'ip-sub', entry.sub ?? ''), figuresNode(plate));
  body.append(foot);
  form.append(body);
  return form;
}

/** **A belief's tablet**: an arched tablet, the flame in a ring, the name, its pantheon or faith and its figure. */
export function beliefTabletNode(entry: InPlayEntry, plate: readonly PlateFigure[] | undefined, options: FormOptions & { text?: boolean } = {}): HTMLElement {
  const form = dress(element('div', 'ip-belief'), entry, options);
  const ring = element('span', 'ip-ring');
  ring.append(inPlayMarkNode(inPlayMarkDataUri(entry.form === 'holyCity' ? 'holyCity' : 'belief')));
  form.append(ring, element('b', 'ip-name', entry.name));
  if (options.text === true) {
    const text = pieceTextNode(entry);
    if (text !== null) form.append(text);
  }
  const foot = element('div', 'ip-foot');
  foot.append(element('span', 'ip-sub', entry.sub ?? ''), figuresNode(plate));
  form.append(foot);
  return form;
}

/** **A legacy's medal**: the medal, a ribbon with the name and its figure. Beads and commissions wear it too. */
export function legacyMedalNode(entry: InPlayEntry, plate: readonly PlateFigure[] | undefined, options: FormOptions & { text?: boolean } = {}): HTMLElement {
  const form = dress(element('div', 'ip-legacy'), entry, options);
  const medal = element('span', 'ip-medal');
  medal.append(inPlayMarkNode(inPlayMarkDataUri(entry.form === 'bead' ? 'bead' : entry.form === 'commission' ? 'commission' : 'legacy')));
  const ribbon = element('div', 'ip-ribbon');
  ribbon.append(element('b', 'ip-name', entry.name));
  if (entry.form !== 'legacy' && entry.sub !== null) ribbon.append(element('small', 'ip-sub', entry.sub));
  if (options.text === true) {
    const text = pieceTextNode(entry);
    if (text !== null) ribbon.append(text);
  }
  ribbon.append(figuresNode(plate));
  form.append(medal, ribbon);
  return form;
}

/** **A temporary effect's tag**: the turn it ends on, the name, where it hangs and its figure. */
export function temporaryTagNode(entry: InPlayEntry, plate: readonly PlateFigure[] | undefined, options: FormOptions & { text?: boolean } = {}): HTMLElement {
  const form = dress(element('div', 'ip-tag'), entry, options);
  const turn = element('div', 'ip-turn');
  turn.append(element('small', undefined, IN_PLAY_WORDS.endsTurn), element('b', undefined, String(entry.endsTurn ?? '')));
  form.append(turn, element('b', 'ip-name', entry.name));
  if (entry.sub !== null) form.append(element('small', 'ip-sub', entry.sub));
  if (options.text === true) {
    const text = pieceTextNode(entry);
    if (text !== null) form.append(text);
  }
  form.append(figuresNode(plate));
  return form;
}

/** **A malice's card**, for the council's tray: the broken seal, the name, its note and its cost. */
export function maliceCardNode(entry: InPlayEntry, plate: readonly PlateFigure[] | undefined, options: FormOptions = {}): HTMLElement {
  const form = dress(element('div', 'ip-malice'), entry, options);
  const ring = element('span', 'ip-ring');
  ring.append(inPlayMarkNode(inPlayMarkDataUri('malice')));
  form.append(ring, element('b', 'ip-name', entry.name));
  const text = pieceTextNode(entry);
  if (text !== null) form.append(text);
  form.append(figuresNode(plate));
  return form;
}

/** The top form of a stack's piece, by its kind. A council piece has none: it is an edge. */
export function topFormNode(entry: InPlayEntry, plate: readonly PlateFigure[] | undefined, options: FormOptions & { text?: boolean } = {}): HTMLElement {
  switch (entry.form) {
    case 'wonder':
      return wonderPlateNode(entry, plate, options);
    case 'belief':
    case 'holyCity':
      return beliefTabletNode(entry, plate, options);
    case 'legacy':
    case 'bead':
    case 'commission':
      return legacyMedalNode(entry, plate, options);
    case 'timed':
      return temporaryTagNode(entry, plate, options);
    case 'malice':
      return maliceCardNode(entry, plate, options);
    case 'ability':
      return abilityCardNode(entry, plate, options);
    default:
      return edgeNode(entry, plate, { ...options, first: true });
  }
}

/** How long the arrival's flight to the door takes (frame A2), in milliseconds. */
export const ARRIVAL_FLIGHT_MS = 620;

/**
 * **The arrival's flight** (frame A2): the piece, in its own form, flies from
 * where it was presented to the In play door and shrinks into it; then
 * `landed` runs (the count and the dot). With less motion there is no flight,
 * and `landed` runs at once. Only animates: a flight cut short leaves the
 * page as it would be.
 */
export function flyToDoor(face: HTMLElement, from: DOMRect, door: HTMLElement | null, landed: () => void, motion: boolean): void {
  const to = door?.getBoundingClientRect() ?? null;
  if (!motion || to === null || to.width === 0) {
    landed();
    return;
  }
  face.classList.add('ip-flight');
  face.style.left = `${from.left + from.width / 2 - 103}px`;
  face.style.top = `${from.top + from.height / 2 - 60}px`;
  document.body.append(face);
  const box = face.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (box.left + box.width / 2);
  const dy = to.top + to.height / 2 - (box.top + box.height / 2);
  const flight = face.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 40}px) scale(0.55)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.2 },
    ],
    { duration: ARRIVAL_FLIGHT_MS, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
  );
  let done = false;
  const land = (): void => {
    if (done) return;
    done = true;
    face.remove();
    landed();
  };
  flight.addEventListener('finish', land);
  flight.addEventListener('cancel', land);
}

/** **A leader's ability**, shown on hover over the crest: the name, its text and its figure. */
export function abilityCardNode(entry: InPlayEntry, plate: readonly PlateFigure[] | undefined, options: FormOptions = {}): HTMLElement {
  const form = dress(element('div', 'ip-ability-card'), entry, options);
  form.append(element('b', 'ip-name', entry.name));
  const text = pieceTextNode(entry);
  if (text !== null) form.append(text);
  form.append(figuresNode(plate));
  return form;
}
