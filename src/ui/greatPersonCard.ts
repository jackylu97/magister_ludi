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
 *   - **the picture window**, 5:6 with a round arch at the top, nearly the
 *     card's full inner width: the person's portrait when one exists
 *     (`greatPersonPicture`), and the family emblem on a plain disc until then;
 *   - the name, and the kernel under it in italic: why anybody remembers this
 *     person;
 *   - the legacy, through the describers (`setDescriptorText`), with figures
 *     and yield words in red as the Order face sets them (`rubricate`);
 *   - on the offer, what the person does when spent (`greatPersonActLine`);
 *   - the stamp's seat, which the caller fills or leaves empty;
 *   - the foot: the flavour and the tier's mark. The flavour carries no visible
 *     label on this card (the user, 2026-11-19: "remove the word flavour from
 *     the bottom of the card"); the word stays in the markup, hidden from
 *     sight, so a screen reader still says it. Every other surface keeps the
 *     visible label.
 *
 * Since the first portraits (2026-11-19; the user: "i like the arched window
 * instead of the current frame ... give the art a bit more room, the cards feel
 * a bit busy") the card is quieter: one frame, no rules beside the name, no
 * engraving behind a picture, and a larger window with one thin line round its
 * arch. The sun and the moon stay.
 *
 * Every word comes from the row or the describers; the face writes none of
 * its own beyond the labels in `GREAT_PERSON_CARD_WORDS`.
 *
 * Size: one custom property, `--gp-card-width` (214px when nothing sets it).
 * Every length in `greatPersonCard.css` is in em of a 21.4th of it, so the
 * offer's card, the Reliquary's card and its thumbnails are one face scaled.
 */

import './greatPersonCard.css';

import { DEVICE_BOX, DEVICE_DISC, orderFaceMarkUri } from '../art/orderFaceMarks';
import { familyLayingWork } from '../sim/greatPeople';
import { type Family, type GreatPersonId, LIVE_GREAT_PERSON_IDS, greatPersonDef } from '../sim/greatPeopleData';
import type { GameState } from '../sim/state';
import { describeFamilyVerb } from '../sim/statecraft';
import { element } from './dom';
import { type GreatPersonFace, greatPersonCard } from './greatPersonFace';
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

/**
 * **One card size** (Quiet Table, build stage 3; the user: "lets do a
 * consistent card size"). Every great person card has the board's width and
 * one height, and its words are one size and wrap. The height is the tallest
 * the roster needs, measured once on the page (`greatPersonCardHeightEm`):
 * every live person's card is laid out with the longest "When spent" line
 * their family can print, and the tallest sets the height. No text shrinks to
 * fit; a long name wraps, and steps down one size only if it would take a
 * third line.
 */
export const GREAT_PERSON_CARD_WIDTH_EM = 21.4;

/** The height before the roster is measured, in em: the board's 392 px at 214 wide. */
export const GREAT_PERSON_CARD_HEIGHT_FALLBACK_EM = 39.2;

/** The name's size, and the one step down a long name may take. */
export const GREAT_PERSON_NAME_SIZES: readonly [number, number] = [2, 1.75];

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
 * **The window**: a portrait over the whole arch, or the family's emblem on a
 * plain disc with one ring (the Order face's disc, without its rays and
 * hatching, so the fallback is as calm as a portrait), in the family's ink.
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
  device.append(svg('circle', { cx: 50, cy: 50, r: DEVICE_DISC.r }, 'gp-disc'));
  device.append(svg('circle', { cx: 50, cy: 50, r: DEVICE_DISC.r }, 'gp-ring'));
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
  // The roster's one height, measured the first time any card is drawn.
  if (!measuring) greatPersonCardHeightEm();
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
  name.append(element('span', 'gp-name-words', face.name));
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
    // The label is in the markup and hidden from sight (`greatPersonCard.css`):
    // the user's exception for this card to the rule that flavour is labelled.
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
 * **Fits a card's name**, after it is laid out: the name wraps, and steps down
 * one size only if it would take a third line. Nothing else on the card
 * changes size. A legacy taller than its room (which the measured height
 * should never allow) is marked `data-overflow` and left visible, so it is
 * seen rather than cut.
 */
export function fitGreatPersonCard(card: HTMLElement): void {
  const words = card.querySelector<HTMLElement>('.gp-name-words');
  if (words !== null) {
    card.style.setProperty('--gp-name', `${GREAT_PERSON_NAME_SIZES[0]}em`);
    const line = Number.parseFloat(getComputedStyle(words).lineHeight);
    if (Number.isFinite(line) && words.getBoundingClientRect().height > line * 2.2) {
      card.style.setProperty('--gp-name', `${GREAT_PERSON_NAME_SIZES[1]}em`);
    }
  }
  const legacy = card.querySelector<HTMLElement>('.gp-legacy');
  if (legacy === null) return;
  if (legacy.scrollHeight > legacy.clientHeight + 1) card.dataset.overflow = 'true';
  else delete card.dataset.overflow;
}

// --- the one height ------------------------------------------------------------------

/** The measured height in em, once the roster has been laid out on this page. */
let measuredEm: number | null = null;
/** True while the roster is being laid out, so the cards it builds do not ask again. */
let measuring = false;

/**
 * **The longest "When spent" line a family can print**: its own act and work,
 * and the work as The Platonic Academy rewrites it (`familyLayingWork` may make
 * every work an academy), whichever is longer.
 */
function longestActLine(family: Family): string {
  const act = describeFamilyVerb(family, 'act');
  const lines = ([family, 'scholar'] as const).map((work) => GREAT_PERSON_CARD_WORDS.act(act, describeFamilyVerb(work, 'work')));
  return lines.reduce((long, line) => (line.length > long.length ? line : long));
}

/**
 * **Lays every live person's card out once**, off the screen, at the board's
 * width, with the longest act line their family can print, and answers the
 * tallest in em. The cards are built by `dressGreatPersonCard`, the one
 * builder, so the measure is of the card the player sees.
 */
function measureRoster(): number {
  const probe = element('div', 'gp-probe');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.setProperty('--gp-card-width', '214px');
  measuring = true;
  try {
    const cards: HTMLElement[] = [];
    for (const id of LIVE_GREAT_PERSON_IDS) {
      const card = element('div');
      card.dataset.measure = 'true';
      dressGreatPersonCard(card, greatPersonCard(id), { act: longestActLine(greatPersonDef(id).family) });
      probe.append(card);
      cards.push(card);
    }
    document.body.append(probe);
    let tallest = 0;
    for (const card of cards) {
      fitGreatPersonCard(card);
      const em = Number.parseFloat(getComputedStyle(card).fontSize);
      if (em > 0) tallest = Math.max(tallest, card.getBoundingClientRect().height / em);
    }
    probe.remove();
    // A little air under the longest card, rounded up to a fifth of an em.
    return tallest > 0 ? Math.ceil((tallest + 0.4) * 5) / 5 : GREAT_PERSON_CARD_HEIGHT_FALLBACK_EM;
  } finally {
    measuring = false;
  }
}

/** Writes the height where every card reads it (`--gp-height`, `greatPersonCard.css`). */
function publishHeight(em: number): void {
  measuredEm = em;
  document.documentElement.style.setProperty('--gp-height', String(em));
}

/**
 * **The one card height, in em of the card**, measured from the roster the
 * first time a card is drawn on the page and again once the card fonts have
 * loaded. Without a document (the tests) it is the board's height.
 */
export function greatPersonCardHeightEm(): number {
  if (measuredEm !== null) return measuredEm;
  if (measuring || typeof document === 'undefined' || document.body === null) {
    return GREAT_PERSON_CARD_HEIGHT_FALLBACK_EM;
  }
  publishHeight(measureRoster());
  void document.fonts?.ready.then(() => publishHeight(measureRoster()));
  return measuredEm ?? GREAT_PERSON_CARD_HEIGHT_FALLBACK_EM;
}
