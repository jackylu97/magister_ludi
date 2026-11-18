/**
 * **The layout of the Council screen** (stage 1 of the approved Council and In
 * play board, `docs/plans/mockups/scholars-study/council-and-in-play/`, frames
 * C6, C8 and C11): which card form the chairs take on a window, and how the
 * fan sets the hand's cards. Pure arithmetic with no document, so the tests
 * can sweep window sizes and the flair gallery can set a fan the same way.
 */

/**
 * The chair card's forms, in pixels, and the frame round each (`inset` on
 * every side): the full face, the board's 176 px card for eleven chairs, and
 * the two compact forms of batch SS10 for small windows.
 */
export const COUNCIL_FORMS = {
  full: { width: 210, height: 258, inset: 6 },
  mid: { width: 176, height: 236, inset: 6 },
  compact: { width: 187, height: 180, inset: 4 },
  narrow: { width: 145, height: 206, inset: 4 },
} as const;

export type CouncilForm = keyof typeof COUNCIL_FORMS;

/** The order the layout tries the forms in: the largest card first. */
const FORM_ORDER: readonly CouncilForm[] = ['full', 'mid', 'compact', 'narrow'];

/** The room the screen's own parts take, in pixels (the board's C6, C8 and C11). */
export const COUNCIL_FRAME = {
  head: 46,
  side: 24,
  /** The government card: the full face, or the narrow card with the compact forms. */
  government: { wide: 200, narrow: 145 },
  columnGap: 25,
  /** From the head's rule to the top of the first chair: room for the chair labels. */
  chairsTop: 34,
  slotGap: 6,
  rowGap: 14,
  /** The band between the chairs and the fan: the hand's label, Revert and Confirm. */
  band: 56,
  /** The least of each fan card kept in view: its name and the top of its picture. */
  fanMin: 96,
  /** A fan card: the full face's type scale in a box 190 wide, as the board draws the hand. */
  fanCard: { width: 190, height: 258 },
  /** The draft pile's column at the left of the fan. */
  pile: 126,
  /** The most rows of chairs the screen lays out. */
  maxRows: 4,
} as const;

/** Which card form and how many rows a window gets (`councilLayout`). */
export interface CouncilLayout {
  form: CouncilForm;
  rows: number;
  cols: number;
  /** The government card's width: the full face, or the narrow card. */
  government: number;
  /** The chairs' block, frames and gaps included, in pixels. */
  chairs: { width: number; height: number };
  /** How much of each fan card is in view below the band, in pixels. */
  fanView: number;
  /** True when no form fits the window, so the chairs take the narrow form and the fan what is left. */
  cramped: boolean;
}

/**
 * **The layout for a window**: the largest card form whose chairs fit beside
 * the government column, on as few rows as the width allows, with at least
 * `fanMin` of the hand left in view under the band.
 *
 * At 1440 by 900 this is the board: six chairs in two rows of three and eight
 * in two rows of four at the full face; eleven in rows of six and five at the
 * 176 px card. Where no form fits, the chairs take the narrow form on the
 * fewest rows the width allows, and the fan keeps what height is left.
 */
export function councilLayout(window: { width: number; height: number }, chairs: number): CouncilLayout {
  const count = Math.max(1, chairs);
  const frame = COUNCIL_FRAME;
  const most = Math.min(count, frame.maxRows);
  const measure = (form: CouncilForm, rows: number): CouncilLayout => {
    const card = COUNCIL_FORMS[form];
    const cols = Math.ceil(count / rows);
    const width = cols * (card.width + 2 * card.inset) + (cols - 1) * frame.slotGap;
    const height = rows * (card.height + 2 * card.inset) + (rows - 1) * frame.rowGap;
    const government = form === 'full' || form === 'mid' ? frame.government.wide : frame.government.narrow;
    return {
      form,
      rows,
      cols,
      government,
      chairs: { width, height },
      fanView: window.height - frame.head - frame.chairsTop - height - frame.band,
      cramped: false,
    };
  };
  const room = (layout: CouncilLayout): number => window.width - 2 * frame.side - layout.government - frame.columnGap;
  for (const form of FORM_ORDER) {
    for (let rows = 1; rows <= most; rows += 1) {
      // A row count that leaves the columns as they were adds height and nothing else.
      if (rows > 1 && Math.ceil(count / (rows - 1)) === Math.ceil(count / rows)) continue;
      const layout = measure(form, rows);
      if (layout.chairs.width > room(layout)) continue;
      // More rows are only taller.
      if (layout.fanView < frame.fanMin) break;
      return layout;
    }
  }
  for (let rows = 1; rows <= most; rows += 1) {
    const layout = measure('narrow', rows);
    if (layout.chairs.width <= room(layout) || rows === most) return { ...layout, cramped: true };
  }
  return { ...measure('narrow', 1), cramped: true };
}

/** How the fan sets its cards: the step between two cards, and each card's place, turn and drop. */
export interface FanPlacement {
  step: number;
  cards: { left: number; rotate: number; drop: number }[];
}

/**
 * **The fan** (the board's C6): the cards side by side when they fit, else
 * overlapped evenly over the room; each turned a little about its centre and
 * dropped on an arc, 1.6 degrees and 1.6 px times the square of its place from
 * the middle, as the board draws them, and never more than 6.4 degrees and
 * 26 px at the ends.
 */
export function fanPlacement(count: number, room: number, card: number = COUNCIL_FRAME.fanCard.width): FanPlacement {
  if (count <= 0) return { step: 0, cards: [] };
  const step = count > 1 ? Math.max(0, Math.min(card + 6, (room - card) / (count - 1))) : 0;
  const middle = (count - 1) / 2;
  const turn = middle === 0 ? 0 : Math.min(1.6, 6.4 / middle);
  const arc = middle === 0 ? 0 : Math.min(1.6, 26 / (middle * middle));
  const width = step * (count - 1) + card;
  const start = Math.max(0, (room - width) / 2);
  const cards = Array.from({ length: count }, (_, index) => {
    const from = index - middle;
    return {
      left: Math.round(start + index * step),
      rotate: Math.round(from * turn * 10) / 10,
      drop: Math.round(from * from * arc),
    };
  });
  return { step, cards };
}
