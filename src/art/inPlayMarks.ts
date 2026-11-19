/**
 * The small line marks of the In play screen (stage 3 of the Council and In
 * play board, `docs/plans/mockups/scholars-study/council-and-in-play/`): the
 * seal on each tucked edge and the device in each piece's own form.
 *
 *   - `wonder`: a temple front, the engraved stand-in in a wonder's picture
 *     window until each wonder has its own picture (the user: "the wonders
 *     should eventually have splash art");
 *   - `hills`: the line of hills behind it, drawn across the whole window;
 *   - `belief`: a flame; `holyCity`: a dome on a drum;
 *   - `legacy`: a head and shoulders; `commission`: a scroll with a seal;
 *   - `bead`: a bead on its wire; `timed`: an hourglass;
 *   - `malice`: a seal broken across;
 *   - `door`: two cards laid one over the other, on the corner panel's door;
 *   - `chair`: an empty chair's outline.
 *
 * Like the other mark modules, this file emits SVG text and a `data:` URI and
 * touches no page. The interface masks `currentColor` through the URI
 * (`.ip-mark` in `src/ui/inPlayScreen.css`), so a mark takes the ink of its
 * piece. The Flair Cabinet shows every one.
 */

/** One In play mark: what it shows, its box, and its stroked shapes. */
export interface InPlayMarkDrawing {
  note: string;
  viewBox: string;
  stroke: number;
  /** SVG shape elements, stroked in the mark's colour and never filled. */
  shapes: string;
}

export const IN_PLAY_MARK_IDS = [
  'wonder',
  'hills',
  'belief',
  'holyCity',
  'legacy',
  'commission',
  'bead',
  'timed',
  'malice',
  'door',
  'chair',
] as const;
export type InPlayMarkId = (typeof IN_PLAY_MARK_IDS)[number];

export const IN_PLAY_MARKS: Record<InPlayMarkId, InPlayMarkDrawing> = {
  wonder: {
    note: 'a temple front: the engraved stand-in in a wonder’s picture window, and a wonder’s seal',
    viewBox: '0 0 24 24',
    stroke: 1.5,
    shapes:
      '<path d="M3 9.5L12 4l9 5.5z"/><path d="M4 9.5h16M4.5 20h15M3 22h18"/><path d="M6.5 11v8M10 11v8M14 11v8M17.5 11v8"/>',
  },
  hills: {
    note: 'a line of hills, drawn across a wonder’s picture window behind the device',
    viewBox: '0 0 120 40',
    stroke: 1,
    shapes:
      '<path d="M0 30 C14 18 26 18 40 26 S68 14 84 22 S108 30 120 24"/><path d="M0 36 C20 30 34 32 52 34 S90 28 120 34" opacity="0.6"/>',
  },
  belief: {
    note: 'a flame: a belief’s seal and the device in its tablet',
    viewBox: '0 0 24 24',
    stroke: 1.5,
    shapes: '<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2 2.5 2 4 1-2 1.5-5 1-8z"/><path d="M12 20c-1.5 0-2.5-1-2.5-2.5 0-1.5 1.5-2.5 2.5-4 1 1.5 2.5 2.5 2.5 4S13.5 20 12 20z"/>',
  },
  holyCity: {
    note: 'a dome on a drum: the share a religion pays whoever holds its holy city',
    viewBox: '0 0 24 24',
    stroke: 1.5,
    shapes: '<path d="M6 13a6 6 0 0 1 12 0z"/><path d="M12 4v3M5 13h14M6 13v7M18 13v7M10 20v-4h4v4M3 21h18"/>',
  },
  legacy: {
    note: 'a head and shoulders: a great person’s legacy, on a medal',
    viewBox: '0 0 24 24',
    stroke: 1.5,
    shapes: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 21c0-4.5 3.5-7.5 7.5-7.5s7.5 3 7.5 7.5"/>',
  },
  commission: {
    note: 'a scroll with a seal: what a fulfilled commission leaves for the rest of the game',
    viewBox: '0 0 24 24',
    stroke: 1.5,
    shapes: '<path d="M6 4h11a2 2 0 0 1 0 4H8v12H5a2 2 0 0 1 0-4h3"/><path d="M17 8v6"/><circle cx="15" cy="17" r="3"/>',
  },
  bead: {
    note: 'a bead on its wire: a bead’s lasting cap',
    viewBox: '0 0 24 24',
    stroke: 1.5,
    shapes: '<path d="M2 12h4M18 12h4"/><ellipse cx="12" cy="12" rx="6" ry="5"/><path d="M8 10.5c2-1.5 6-1.5 8 0"/>',
  },
  timed: {
    note: 'an hourglass: an effect that ends on a turn',
    viewBox: '0 0 24 24',
    stroke: 1.5,
    shapes: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
  },
  malice: {
    note: 'a seal broken across: a malice a missed wager seated in a chair',
    viewBox: '0 0 24 24',
    stroke: 1.5,
    shapes: '<path d="M12 3.5a8.5 8.5 0 1 0 0.01 0"/><path d="M9 6l3 5-2 3 3 5"/>',
  },
  door: {
    note: 'two cards, one laid over the other: the In play door in the corner panel',
    viewBox: '0 0 24 24',
    stroke: 1.6,
    shapes: '<rect x="3" y="7" width="12" height="14" rx="1.5"/><path d="M8 7V4.5A1.5 1.5 0 0 1 9.5 3h10A1.5 1.5 0 0 1 21 4.5v11a1.5 1.5 0 0 1-1.5 1.5H15"/>',
  },
  chair: {
    note: 'an empty chair’s outline',
    viewBox: '0 0 24 24',
    stroke: 1.5,
    shapes: '<path d="M7 3v18M17 3v18M7 12h10M7 15h10" stroke-dasharray="2 2"/>',
  },
};

/** One mark as SVG text, stroked in `color`. */
export function inPlayMarkSvg(id: InPlayMarkId, color = '#000'): string {
  const mark = IN_PLAY_MARKS[id];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mark.viewBox}">` +
    `<g fill="none" stroke="${color}" stroke-width="${mark.stroke}" stroke-linecap="round" stroke-linejoin="round">${mark.shapes}</g></svg>`
  );
}

const uriCache = new Map<string, string>();

/** One mark as a `data:` URI, for a CSS mask. Memoised. */
export function inPlayMarkDataUri(id: InPlayMarkId, color = '#000'): string {
  const key = `${id}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const uri = `data:image/svg+xml,${encodeURIComponent(inPlayMarkSvg(id, color))}`;
  uriCache.set(key, uri);
  return uri;
}
