/**
 * **The great person card**: the engraved form a great person wears wherever
 * the game shows one as a card (Quiet Table, build stage 2; the board is the
 * third pass's `frame-a5`, approved in the second pass: "great").
 *
 * Two surfaces draw it: the offer that deals a name (`main.ts`, through
 * `offerFaces.ts`) and the Reliquary that keeps the ones you spent
 * (`reliquaryScreen.ts`). A name you are dealt and a name you keep are one card.
 *
 * Top to bottom:
 *
 *   - the sun and the moon in the two top corners, and the family on a tab
 *     between them, in the family's ink with its emblem;
 *   - **the picture window**, arched at the top and about 5:6: the person's
 *     portrait when one exists (`greatPersonPicture`), and the family emblem
 *     large on an engraved disc until then. No portrait exists yet;
 *   - the name between two rules, and the kernel under it in italic: why
 *     anybody remembers this person;
 *   - the legacy, through the describers (`setDescriptorText`), with figures
 *     and yield words in red as the Order face sets them (`rubricate`);
 *   - on the offer, what the person does when spent (`greatPersonActLine`);
 *   - the stamp's seat, which the caller fills or leaves empty;
 *   - the foot: the flavour, labelled, and the tier's mark.
 *
 * Every word comes from the row or the describers; the face writes none of
 * its own beyond the labels in `GREAT_PERSON_CARD_WORDS`.
 *
 * Size: one custom property, `--gp-card-width` (214px when nothing sets it).
 * Every length in `greatPersonCard.css` is in em of a 21.4th of it, so the
 * offer's card, the Reliquary's card and its thumbnails are one face scaled.
 */

import './greatPersonCard.css';

import { DEVICE_BOX, DEVICE_DISC, DEVICE_HATCH, DEVICE_RAYS, orderFaceMarkUri } from '../art/orderFaceMarks';
import { familyLayingWork } from '../sim/greatPeople';
import { type Family, type GreatPersonId, greatPersonDef } from '../sim/greatPeopleData';
import type { GameState } from '../sim/state';
import { describeFamilyVerb } from '../sim/statecraft';
import { element } from './dom';
import type { GreatPersonFace } from './greatPersonFace';
import { greatPersonPaintingUrl } from './greatPersonPaintings';
import { keywordsAllowedIn, setDescriptorText } from './keywords';
import { rubricate } from './orderFace';

/** What fills a card's picture window: a portrait, or the family's emblem. */
export type GreatPersonPicture = { kind: 'painted'; url: string } | { kind: 'emblem'; family: Family };

/**
 * **The one answer to "what is in the window"**, as `wonderPicture` is for a
 * wonder: the portrait's address when the list in `greatPersonPaintings.ts`
 * names one, and the family's emblem otherwise.
 */
export function greatPersonPicture(id: GreatPersonId): GreatPersonPicture {
  const url = greatPersonPaintingUrl(id);
  return url === null ? { kind: 'emblem', family: greatPersonDef(id).family } : { kind: 'painted', url };
}

/** The card's own words. Plain, and no number in any of them. */
export const GREAT_PERSON_CARD_WORDS = {
  /** A family on the card's tab. */
  family: {
    scholar: 'Scholar',
    artist: 'Artist',
    engineer: 'Engineer',
    merchant: 'Merchant',
    general: 'General',
  } satisfies Record<Family, string>,
  flavour: 'Flavour',
  noLegacy: 'They left no legacy.',
  /** What a person on offer does when spent: the family's act, or its work. */
  act: (act: string, work: string): string => `When spent: ${act}, or ${work}.`,
} as const;

/**
 * **What this person does when spent**, for the offer: the family's two verbs
 * through the describer (`describeFamilyVerb`), so the work's improvement is a
 * keyword. The work is the one this empire lays (`familyLayingWork`: The
 * Platonic Academy makes every work an academy).
 */
export function greatPersonActLine(state: GameState, playerId: number, id: GreatPersonId): string {
  const family = greatPersonDef(id).family;
  return GREAT_PERSON_CARD_WORDS.act(
    describeFamilyVerb(family, 'act'),
    describeFamilyVerb(familyLayingWork(state, playerId, family), 'work'),
  );
}

/** How a card is drawn. */
export interface GreatPersonCardOptions {
  /** The card sits inside a control: a keyword is bold and not a link. */
  inControl?: boolean;
  /** The line about what the person does when spent. The offer passes one. */
  act?: string;
  /** A thumbnail: the tab, the window and the name, and nothing under them. */
  mini?: boolean;
}

/** The sizes the legacy steps down through, in em of the card, until it fits. */
export const GREAT_PERSON_TEXT_SIZES: readonly number[] = [1.45, 1.35, 1.25, 1.15, 1.05];

/**
 * The sizes a name steps down through, in em of the card, until it leaves each
 * rule beside it some length ("Ahmose son of Ebana" does not fit at the
 * board's size).
 */
export const GREAT_PERSON_NAME_SIZES: readonly number[] = [2, 1.8, 1.6, 1.45, 1.3];

/** An empty span the stylesheet draws. */
function drawn(className: string): HTMLElement {
  const node = element('span', className);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

/** An SVG element with its attributes. */
function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number>,
  className?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (className !== undefined) node.setAttribute('class', className);
  return node;
}

/**
 * **The window**: a portrait over the whole arch, or the family's emblem on
 * the Order face's engraved disc (its rays, hatching and two rings, the same
 * numbers as `orderFace.ts`'s device), in the family's ink.
 */
function windowNode(face: GreatPersonFace): HTMLElement {
  const window = element('div', 'gp-window');
  const picture = greatPersonPicture(face.id);
  if (picture.kind === 'painted') {
    window.dataset.picture = 'painted';
    window.style.backgroundImage = `url("${picture.url}")`;
    return window;
  }
  window.dataset.picture = 'emblem';
  const device = svg('svg', { viewBox: `0 0 ${DEVICE_BOX} ${DEVICE_BOX}`, 'aria-hidden': 'true' }, 'gp-device');
  device.append(svg('path', { d: DEVICE_RAYS }, 'gp-rays'));
  device.append(svg('circle', { cx: 50, cy: 50, r: DEVICE_DISC.r }, 'gp-disc'));
  device.append(svg('path', { d: DEVICE_HATCH }, 'gp-hatch'));
  device.append(svg('circle', { cx: 50, cy: 50, r: DEVICE_DISC.r }, 'gp-ring'));
  device.append(svg('circle', { cx: 50, cy: 50, r: DEVICE_DISC.ring }, 'gp-ring-inner'));
  window.append(device);
  const emblem = drawn('gp-emblem');
  emblem.style.setProperty('--gp-emblem', face.emblem);
  window.append(emblem);
  return window;
}

/**
 * **Dresses `host` as a great person's card** and answers the stamp's seat,
 * an empty element at the foot of the legacy that the caller fills (the
 * Reliquary's landed figure) or leaves empty (the offer, which shows no
 * figure: a legacy pays nothing until the person is spent).
 */
export function dressGreatPersonCard(
  host: HTMLElement,
  face: GreatPersonFace,
  options: GreatPersonCardOptions = {},
): HTMLElement {
  host.classList.add('gp-card');
  host.dataset.family = face.family;
  host.dataset.tier = face.tier;
  if (options.mini === true) host.dataset.size = 'mini';
  host.style.setProperty('--gp-sun', `url("${orderFaceMarkUri('sun')}")`);
  host.style.setProperty('--gp-moon', `url("${orderFaceMarkUri('moon')}")`);
  const linked = options.inControl === true ? false : keywordsAllowedIn(host);

  const inner = element('div', 'gp-in');
  inner.append(drawn('gp-corner is-sun'), drawn('gp-corner is-moon'));
  const tab = element('span', 'gp-family');
  const mark = drawn('gp-family-mark');
  mark.style.setProperty('--gp-emblem', face.emblem);
  tab.append(mark, element('span', 'gp-family-word', GREAT_PERSON_CARD_WORDS.family[face.family]));
  inner.append(tab);
  inner.append(windowNode(face));

  const name = element('div', 'gp-name');
  name.append(drawn('gp-rule'), element('span', 'gp-name-words', face.name), drawn('gp-rule'));
  inner.append(name);

  const seat = element('div', 'gp-seat');
  if (options.mini !== true) {
    const kernel = greatPersonDef(face.id).kernel;
    if (kernel !== undefined && kernel !== '') inner.append(element('span', 'gp-kernel', kernel));

    const legacy = element('div', 'gp-legacy');
    if (face.legacy.length === 0) {
      legacy.append(element('span', 'gp-clause is-deferred', GREAT_PERSON_CARD_WORDS.noLegacy));
    } else {
      for (const clause of face.legacy) {
        const line = element('span', clause.deferred === true ? 'gp-clause is-deferred' : 'gp-clause');
        setDescriptorText(line, clause.text, { linked });
        if (clause.deferred === true) line.title = 'Declared, and not built yet';
        else rubricate(line);
        legacy.append(line);
      }
    }
    inner.append(legacy);

    if (options.act !== undefined) {
      const act = element('span', 'gp-act');
      setDescriptorText(act, options.act, { linked });
      inner.append(act);
    }
    inner.append(seat);

    const foot = element('div', 'gp-foot');
    const flavour = element('span', 'gp-flavour');
    flavour.append(element('span', 'flavor-label', GREAT_PERSON_CARD_WORDS.flavour), document.createTextNode(` ${face.flavor}`));
    const tier = element('span', 'gp-tier', face.tierMark);
    tier.title = face.lineName;
    foot.append(flavour, tier);
    inner.append(foot);
  }
  host.append(inner);
  return seat;
}

/** **A great person's card** as a new `<article>`, with its stamp's seat. */
export function greatPersonCardNode(
  face: GreatPersonFace,
  options: GreatPersonCardOptions = {},
): { card: HTMLElement; seat: HTMLElement } {
  const card = element('article');
  const seat = dressGreatPersonCard(card, face, options);
  return { card, seat };
}

/**
 * **Fits a card's legacy**, after it is laid out: the largest size in
 * `GREAT_PERSON_TEXT_SIZES` at which the legacy fits its room. A legacy that
 * still does not fit is marked `data-overflow` and left visible, as the Order
 * face does, so a card that cannot fit is seen rather than cut.
 */
export function fitGreatPersonCard(card: HTMLElement): void {
  fitName(card);
  const legacy = card.querySelector<HTMLElement>('.gp-legacy');
  if (legacy === null) return;
  delete card.dataset.overflow;
  for (const size of GREAT_PERSON_TEXT_SIZES) {
    card.style.setProperty('--gp-text', `${size}em`);
    if (legacy.scrollHeight <= legacy.clientHeight + 1) return;
  }
  card.dataset.overflow = 'true';
}

/** The name's step: the largest size that leaves each rule beside it at least 0.6 em. */
function fitName(card: HTMLElement): void {
  const line = card.querySelector<HTMLElement>('.gp-name');
  const words = card.querySelector<HTMLElement>('.gp-name-words');
  if (line === null || words === null) return;
  const em = Number.parseFloat(getComputedStyle(card).fontSize);
  // Two rules of at least 0.6 em, and the two gaps of 0.6 em beside the words.
  const room = line.getBoundingClientRect().width - 4 * 0.6 * em;
  for (const size of GREAT_PERSON_NAME_SIZES) {
    card.style.setProperty('--gp-name', `${size}em`);
    if (words.getBoundingClientRect().width <= room) return;
  }
}
