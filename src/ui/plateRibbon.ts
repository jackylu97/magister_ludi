/**
 * **The ribbon plate**: a painting over the dimmed board on a lapis ribbon. Two
 * plates use it: a painted wonder (`wonderPlate.ts`) and the age plate
 * (`agePlate.ts`). The markup is built here and the styles are in
 * `plateRibbon.css`, so the two plates share one set of rules.
 *
 * The user chose this form for the painted wonder (2026-11-19, "lets go with
 * version 3, the slower arrival sounds great") and then for the age plate
 * (frame A7 of the Quiet Table boards, "i like the ribbon better, so it doesn't
 * take you out of the game"). `docs/plans/ui-critique-2026-10-16.md` has both
 * rulings.
 *
 * What it is:
 * - the board stays in view under a light dim;
 * - a lapis ribbon runs from the left edge of the window to the right at mid
 *   height, with gilt rules, a field of gilt dots, a line of stars, moons and
 *   suns along each edge, and a sun and a moon on the band beside the painting;
 * - the painting stands in front of it, exactly 16:9, about three quarters of
 *   the window's width;
 * - the words sit on the painting's foot over a dark fall-off: the plate's own
 *   words on the left, Continue on the right.
 *
 * The arrival is slow, about 1.8 seconds, in this order: the board dims, the
 * ribbon draws out from the centre, the sun and moon come up, the painting
 * rises, the words show. With reduced motion it all shows at once.
 */

import './agePlate.css';
import './plateRibbon.css';

import { orderFaceMarkUri } from '../art/orderFaceMarks';
import { element } from './dom';

/**
 * The ribbon itself. The stars, suns and moons are the card corners' own marks
 * (`orderFaceMarks.ts`), handed to the stylesheet as masks, so they take the
 * plate's gilt.
 */
export function plateRibbonNode(): HTMLElement {
  const ribbon = element('div', 'plate-ribbon');
  ribbon.setAttribute('aria-hidden', 'true');
  ribbon.style.setProperty('--plate-star', `url("${orderFaceMarkUri('star')}")`);
  ribbon.style.setProperty('--plate-sun', `url("${orderFaceMarkUri('sun')}")`);
  ribbon.style.setProperty('--plate-moon', `url("${orderFaceMarkUri('moon')}")`);
  ribbon.append(
    element('i', 'plate-ribbon-edge is-top'),
    element('i', 'plate-ribbon-edge is-foot'),
    element('i', 'plate-ribbon-mark is-sun'),
    element('i', 'plate-ribbon-mark is-moon'),
  );
  return ribbon;
}

/**
 * Puts a plate on the ribbon.
 *
 * - `plate` is the plate's `.age-plate` page, and `inner` its
 *   `.age-plate-inner`, which the caller appends to the page after this call.
 * - `painting` is the 16:9 window that already shows the picture.
 * - `words` goes on the left of the painting's foot, and `close` (Continue,
 *   and anything that stands beside it) on the right.
 */
export function placeOnRibbon(
  plate: HTMLElement,
  inner: HTMLElement,
  painting: HTMLElement,
  words: HTMLElement,
  close: HTMLElement,
): void {
  plate.classList.add('plate-on-ribbon');
  plate.append(plateRibbonNode());
  painting.classList.add('plate-painting');
  close.classList.add('plate-caption-close');
  const caption = element('div', 'plate-caption');
  caption.append(words, close);
  painting.append(caption);
  inner.append(painting);
}
