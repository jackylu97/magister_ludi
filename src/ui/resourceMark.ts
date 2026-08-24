/**
 * The resource mark as an inline element, for every DOM surface that names a
 * resource: the tile hover readout, the city panel's notes, the star chart's
 * reveal gifts.
 *
 * One drawing, two printers
 * -------------------------
 * The board prints its marks by tracing `src/art/resourceMarks.ts` into the
 * icon atlas (`TileIcons`). The panels print the *same* paths, and the whole
 * point of this module is that they do not get a second copy: the mark is
 * turned into a `data:` URI SVG once per resource and used as a CSS **mask**,
 * with the element's `background-color` set to `currentColor`.
 *
 * The mask is why it is a mask and not an `<img>`. This interface prints the
 * same sentence on parchment (a city panel) and on ink (the top bar's cards,
 * a hover popover over a dark plate), and an `<img>` carries whatever colour it
 * was authored in — so a mark drawn in ink would vanish on an ink ground, and
 * the fix would be two files per resource. Masked, the mark is *whatever colour
 * the text beside it is*, in every surface, for free, forever. It is the same
 * argument the atlas makes for recolouring rather than baking, one medium over.
 *
 * Sized to the text, not to a box
 * -------------------------------
 * The element is an `em` square with a baseline shift, so a mark next to
 * "Wheat" is the height of the W and sits on the same line — see `.res-mark` in
 * `style.css`. Everything about the size is CSS, because the surfaces that use
 * it are set at four different sizes and none of them should have to say so.
 *
 * The fallback is the schema's
 * ----------------------------
 * A resource with no drawn mark prints its `emoji` exactly as this interface
 * always did — same element, same slot, no mask. That is the guarantee
 * `data/resources.json` makes: a row added at runtime with nothing but a glyph
 * is still legible everywhere, on the board and here. No shipped resource takes
 * this path; `test/resources3d.test.ts` holds that.
 */

import { resourceMarkDataUri } from '../art/resourceMarks';
import { type ResourceId, resourceDef } from '../sim/resourceData';

/**
 * The mark for one resource, as a span to put in front of its name.
 *
 * `aria-hidden`, always: every call site prints the resource's *name* beside
 * it, so the mark is decoration and a screen reader that read it would say the
 * thing twice. A surface that ever shows a mark with no name needs its own
 * label, not a flag here.
 */
export function resourceMarkNode(id: ResourceId): HTMLSpanElement {
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  const uri = resourceMarkDataUri(id);
  if (uri === null) {
    span.className = 'res-mark is-glyph';
    span.textContent = resourceDef(id).emoji;
    return span;
  }
  span.className = 'res-mark';
  // A custom property rather than `maskImage` directly, so the stylesheet keeps
  // ownership of the vendor-prefixed pair and this only supplies the picture.
  span.style.setProperty('--res-mark', `url("${uri}")`);
  return span;
}

/**
 * The mark and the name together, as a fragment: "🪨 Stone" with the mark drawn.
 *
 * The shape nearly every call site wanted, so it is here once — a caller that
 * built it by hand would have to remember the hair space that keeps the mark
 * from touching the capital.
 */
export function resourceLabelNodes(id: ResourceId, text?: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  fragment.append(resourceMarkNode(id));
  fragment.append(document.createTextNode(` ${text ?? resourceDef(id).name}`));
  return fragment;
}
