/**
 * **The government banner**: the form a government wears where the player
 * chooses one or holds one (Quiet Table; the board is the second pass's
 * frame 7, "Three banners" and "The banner with and without a painting",
 * approved by the user: "Great, love it"). The frame's code is `gov()` and
 * `gov_fallback()` in
 * `docs/plans/mockups/scholars-study/quiet-table-fourth-pass/base.py`.
 *
 * A government is the one choice the player cannot take back, so it gets a
 * larger form than a card: a banner. Two surfaces draw it:
 *
 *   - **the government offer** (`main.ts`, through `offerFaces.ts`): one row
 *     for each government, as the frame draws it. The 3:1 banner window at the
 *     left, what the government does in the middle, and at the right its
 *     chairs, with the stamp's seat under them. The seat shows nothing until
 *     the pick, when the offer lands the figure in it. It has no label (the
 *     user, 2026-11-20: "'with the cards you keep' is unneeded, and probably a
 *     bit confusing");
 *   - **the Council screen's government seat** (`statecraftScreen.ts`): the
 *     same banner window heads a narrow card, with the rules, the chairs and
 *     the pay plate under it. The frame says "The same banner can head the
 *     government card on the Council screen later."
 *
 * The parts:
 *
 *   - **the window** (`governmentPicture`): the government's painting, whole,
 *     with nothing over it; or, while no painting exists, the drawn mark. The
 *     mark is the engraved seal with the crown (the device the Order face
 *     draws for a government). The window is 3:1 either way;
 *   - **the name plate**: the name and the tier on the banner's own paper,
 *     under the window, on one line. The name was over the painting's foot
 *     while the window held a drawn mark. A painting often has its subject
 *     low (the Chiefdom's fire, the seated figures of The Estates), so the
 *     words moved off it (2026-11-21). A name too long for the line steps
 *     down in size, and is then cut with the whole name in its tooltip
 *     (`fitGovernmentBanner`);
 *   - **the rules**: the government's own clauses through the describers
 *     (`describeCard`, printed by `setDescriptorText`), with the figures set in
 *     mono as the frame sets them;
 *   - **the chairs**: one small card shape for each chair it lays out, in the
 *     chair type's ink with the type's own mark, and the mix in words under
 *     them;
 *   - **the figure**: on the offer, the stamp's seat, empty until the pick; on
 *     the Council screen, the pay plate.
 *
 * Every word comes from the row, the describers or `chairs.ts`; the banner
 * writes none of its own beyond the labels in `GOVERNMENT_BANNER_WORDS`.
 *
 * Size: the row form is the frame's 856 px wide at one em to ten board pixels,
 * and `--gov-width` scales it. The seat form is as wide as its column and keeps
 * the Council's text scale. Inside the window every length is a share of the
 * window's own width, so the offer's window and the Council's are one drawing.
 */

import './governmentBanner.css';

import { type CardClause, describeCard, stripRefs } from '../sim/statecraft';
import { type ChairType, type GovernmentId, governmentDef, slotLayout } from '../sim/statecraftData';
import { slotMarkUrl } from './cardLine';
import { chairMixOfLayout, chairMixWords } from './chairs';
import { element } from './dom';
import { governmentPaintingUrl } from './governmentPaintings';
import { keywordsAllowedIn, setDescriptorText } from './keywords';
import { GOVERNMENT_SUIT, type OrderFacePlate, deviceNode, plateFigureNode, rubricate } from './orderFace';

// --- what is in the window ---------------------------------------------------

/** What fills a banner's window: a painting, or the drawn mark. */
export type GovernmentPicture = { kind: 'painted'; url: string } | { kind: 'mark' };

/**
 * **The one answer to "what is in the window"**, as `greatPersonPicture` is
 * for a great person: the painting's address when the list in
 * `governmentPaintings.ts` names one, and the drawn mark otherwise.
 */
export function governmentPicture(id: GovernmentId): GovernmentPicture {
  const url = governmentPaintingUrl(id);
  return url === null ? { kind: 'mark' } : { kind: 'painted', url };
}

// --- the words -----------------------------------------------------------------

/** The banner's own words. Plain, and no number in any of them. */
export const GOVERNMENT_BANNER_WORDS = {
  /** Before the tier's number: "tier 18". */
  tier: 'tier',
  /** Over the chairs. */
  chairs: 'Its chairs',
  /** The rules of a government with none (the Chiefdom). */
  noLaw: 'It has no rule of its own.',
  /** The word a reader hears after the name. */
  government: 'Government',
} as const;

// --- the banner, as data ---------------------------------------------------------

/** Everything a banner prints, worked out from the row and the chairs. */
export interface GovernmentBannerModel {
  id: GovernmentId;
  name: string;
  tier: number;
  picture: GovernmentPicture;
  /** The government's own clauses, as the describers word them. */
  clauses: readonly CardClause[];
  /** One entry for each chair it lays out, in the council's own order. */
  chairs: readonly ChairType[];
  /** The chairs in words: "1 Military · 3 Economic · 2 Civic · 2 Wildcard". */
  chairWords: string;
  /** The name, the word "Government" and the tier, for a reader who cannot see the banner. */
  caption: string;
}

/**
 * **A banner's model**, from the row and the chairs. Pure: no document is
 * read, so the tests can sweep every government.
 *
 * `layout` is the council a seat would have or has (`chairLayoutUnder` on the
 * offer, `slotTypesOf` on the Council screen), because a leader, a Doctrine or
 * a card can add or close Wildcard chairs. Left out, as in the flair gallery,
 * the banner shows the row's own chairs (`slotLayout`).
 */
export function governmentBannerModel(id: GovernmentId, layout?: readonly ChairType[]): GovernmentBannerModel {
  const def = governmentDef(id);
  const chairs = [...(layout ?? slotLayout(id))];
  return {
    id,
    name: def.name,
    tier: def.tier,
    picture: governmentPicture(id),
    clauses: describeCard(id),
    chairs,
    chairWords: chairMixWords(chairMixOfLayout(chairs)),
    caption: `${def.name} · ${GOVERNMENT_BANNER_WORDS.government} · ${GOVERNMENT_BANNER_WORDS.tier} ${def.tier}`,
  };
}

// --- drawing ---------------------------------------------------------------------

/** How a banner is drawn. */
export interface GovernmentBannerOptions {
  /** The offer's wide row, or the narrow card that holds the Council's seat. */
  form: 'row' | 'seat';
  /** The chairs it lays out for this seat. See `governmentBannerModel`. */
  layout?: readonly ChairType[];
  /** The banner sits inside a control: a keyword is bold and not a link. */
  inControl?: boolean;
  /**
   * The seat form's pay plate: what the government pays each turn, from the
   * Council's own reading (`governmentLive`). Null or left out draws none.
   */
  plate?: OrderFacePlate | null;
  /**
   * A picture in place of the list's answer. Only the flair gallery passes
   * one, to show the drawn mark on a government that has a painting.
   */
  picture?: GovernmentPicture;
}

/** "tier 18", with the number in mono. */
function tierNode(tier: number): HTMLElement {
  const node = element('span', 'gov-tier');
  node.append(document.createTextNode(`${GOVERNMENT_BANNER_WORDS.tier} `), element('b', undefined, String(tier)));
  return node;
}

/**
 * **The window**: the painting, whole and with nothing over it; or the drawn
 * mark, the engraved seal with the crown, on hatched card paper. The same box
 * either way, so a hand can mix painted and unpainted banners.
 */
function windowNode(picture: GovernmentPicture): HTMLElement {
  const window = element('div', 'gov-window');
  window.dataset.picture = picture.kind;
  if (picture.kind === 'painted') {
    window.style.backgroundImage = `url("${picture.url}")`;
    return window;
  }
  // In a box of its own, so its lengths can be shares of the window's width.
  const mark = element('span', 'gov-mark');
  const device = deviceNode([GOVERNMENT_SUIT], true);
  device.classList.add('gov-device');
  mark.append(device);
  window.append(mark);
  return window;
}

/**
 * **The name plate**: the name and the tier on the banner's own paper, on one
 * line. It is never over the picture.
 */
function namePlateNode(model: GovernmentBannerModel): HTMLElement {
  const plate = element('div', 'gov-nameplate');
  plate.append(element('span', 'gov-name', model.name), tierNode(model.tier));
  return plate;
}

/** **The head**: the window, and the name plate under it. */
function headNode(model: GovernmentBannerModel, picture: GovernmentPicture): HTMLElement {
  const head = element('div', 'gov-head');
  head.append(windowNode(picture), namePlateNode(model));
  return head;
}

/** **The rules**: every clause through the describers, the figures in mono. */
function rulesNode(model: GovernmentBannerModel, linked: boolean): HTMLElement {
  const rules = element('div', 'gov-rules');
  if (model.clauses.length === 0) rules.append(element('span', 'gov-clause is-none', GOVERNMENT_BANNER_WORDS.noLaw));
  for (const clause of model.clauses) {
    const line = element('span', clause.deferred === true ? 'gov-clause is-deferred' : 'gov-clause');
    setDescriptorText(line, clause.text, { linked });
    if (clause.deferred === true) line.title = 'Declared, and not built yet';
    else rubricate(line);
    rules.append(line);
  }
  return rules;
}

/**
 * **The chairs**: one small card shape for each chair, in its type's ink with
 * the type's own mark (`slotMarkUrl`, the mark an empty chair ghosts on the
 * Council screen), grouped by type in the order the words name them, and the
 * mix in words. The shapes are a picture and hidden from a screen reader; the
 * words are what it reads.
 */
function chairsNode(model: GovernmentBannerModel): HTMLElement {
  const block = element('div', 'gov-chairs');
  block.append(element('span', 'gov-label', GOVERNMENT_BANNER_WORDS.chairs));
  const row = element('span', 'gov-chair-row');
  row.setAttribute('aria-hidden', 'true');
  for (const entry of chairMixOfLayout(model.chairs)) {
    const group = element('span', 'gov-chair-group');
    for (let index = 0; index < entry.count; index += 1) {
      const chair = element('span', 'gov-chair');
      chair.dataset.ink = entry.type;
      const mark = element('span', 'gov-chair-mark');
      mark.style.setProperty('--gov-chair-mark', slotMarkUrl(entry.type));
      chair.append(mark);
      group.append(chair);
    }
    row.append(group);
  }
  block.append(row, element('span', 'gov-chair-words', model.chairWords));
  return block;
}

/** **The pay plate** on the Council screen: the figures, or a small "+0" and the reason. */
function plateNode(plate: OrderFacePlate): HTMLElement {
  const node = element('div', 'gov-pay');
  node.dataset.plate = plate.kind;
  if (plate.kind === 'idle') {
    node.append(element('b', 'gov-pay-zero', '+0'));
    if (plate.reason !== undefined && plate.reason !== '') node.append(element('span', 'gov-pay-why', stripRefs(plate.reason)));
    return node;
  }
  for (const figure of plate.figures) node.append(plateFigureNode(figure));
  return node;
}

/**
 * **Dresses `host` as a government's banner** and answers the stamp's seat,
 * an empty element that the offer fills with the stamp (`offerCard.ts`) and
 * that stays empty, and unseen, on the Council screen.
 */
export function dressGovernmentBanner(
  host: HTMLElement,
  id: GovernmentId,
  options: GovernmentBannerOptions,
): HTMLElement {
  const model = governmentBannerModel(id, options.layout);
  const linked = options.inControl === true ? false : keywordsAllowedIn(host);
  host.classList.add('gov-banner');
  host.dataset.form = options.form;
  host.dataset.government = id;
  host.append(element('span', 'sr-only', model.caption));
  host.append(headNode(model, options.picture ?? model.picture));
  host.append(rulesNode(model, linked));
  const side = element('div', 'gov-side');
  side.append(chairsNode(model));
  // The stamp's seat, under the chairs and with no label. The offer lands the
  // figure in it on the pick; until then it shows nothing and takes no room.
  const seat = element('div', 'gov-seat');
  if (options.form === 'seat' && options.plate !== undefined && options.plate !== null) {
    side.append(plateNode(options.plate));
  }
  side.append(seat);
  host.append(side);
  return seat;
}

/** **A government's banner** as a new `<article>`, with its stamp's seat. */
export function governmentBannerNode(
  id: GovernmentId,
  options: GovernmentBannerOptions,
): { banner: HTMLElement; seat: HTMLElement } {
  const banner = element('article');
  const seat = dressGovernmentBanner(banner, id, options);
  return { banner, seat };
}

// --- the fit -------------------------------------------------------------------

/**
 * The sizes a name may take on its plate, as shares of the form's own name
 * size (`--gov-name-size`, `governmentBanner.css`): the full size first, then
 * each step down, largest first.
 */
export const GOVERNMENT_NAME_STEPS: readonly number[] = [1, 0.92, 0.84];

/**
 * **Which size a name takes, and whether it is cut.** `fits` answers whether
 * the name fits its line at a step. The first step that fits wins. If none
 * fits, the name keeps the smallest step and is cut. Pure, so a test can
 * sweep it.
 */
export function governmentNameFit(fits: (step: number) => boolean): { step: number; cut: boolean } {
  for (const step of GOVERNMENT_NAME_STEPS) if (fits(step)) return { step, cut: false };
  return { step: GOVERNMENT_NAME_STEPS[GOVERNMENT_NAME_STEPS.length - 1]!, cut: true };
}

/**
 * **Fits a banner's name to its plate**, after it is laid out. The name is one
 * line and never wraps. It steps down in size until it fits
 * (`GOVERNMENT_NAME_STEPS`). If the smallest size is still too long, the
 * stylesheet cuts it with an ellipsis, and the whole name goes in its tooltip.
 * Nothing else on the banner changes size.
 */
export function fitGovernmentBanner(banner: HTMLElement): void {
  const name = banner.querySelector<HTMLElement>('.gov-name');
  if (name === null) return;
  name.removeAttribute('title');
  const { step, cut } = governmentNameFit((share) => {
    banner.style.setProperty('--gov-name-fit', String(share));
    return name.scrollWidth <= name.clientWidth;
  });
  banner.style.setProperty('--gov-name-fit', String(step));
  if (cut) name.title = name.textContent ?? '';
}

/**
 * **The one height of a hand**, in em of a banner: the tallest banner's
 * height, rounded up to a tenth of an em. Heights that are not numbers (a
 * banner not laid out) count as nothing.
 */
export function governmentHandHeight(heights: readonly number[]): number {
  let tallest = 0;
  for (const height of heights) if (Number.isFinite(height) && height > tallest) tallest = height;
  return Math.ceil(tallest * 10) / 10;
}

/**
 * **Every banner in a hand is one size** (the user's rule for cards, Quiet
 * Table, build stage 3: "lets do a consistent card size"). The banners have
 * one width already, and their words one size that wraps; what could differ
 * is the height a long rule needs. So each banner is measured at its natural
 * height, and every banner in the hand takes the tallest
 * (`--gov-row-h`, `governmentBanner.css`). In em, so a window resized while
 * the offer is up scales the hand and keeps it one size.
 */
export function fitGovernmentHand(faces: readonly HTMLElement[]): void {
  for (const face of faces) face.style.removeProperty('--gov-row-h');
  const heights = faces.map((face) => {
    const em = Number.parseFloat(getComputedStyle(face).fontSize);
    return em > 0 ? face.offsetHeight / em : Number.NaN;
  });
  const height = governmentHandHeight(heights);
  if (height <= 0) return;
  for (const face of faces) face.style.setProperty('--gov-row-h', `${height}em`);
}
