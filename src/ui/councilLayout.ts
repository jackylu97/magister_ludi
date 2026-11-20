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

/**
 * The room the screen's own parts take, in pixels (the board's C6, C8 and
 * C11, with the user's comments on stage 3, 2026-11-18: "it could use more
 * vertical space for the title and government slot areas, that should be the
 * focus of the page, and there's too much room for the hand"). The head is
 * taller than the board's 46, and the hand shows at most `fanMax`; the height
 * that leaves goes round the government and its chairs (`CouncilLayout.spare`).
 */
export const COUNCIL_FRAME = {
  head: 72,
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
  /**
   * The most of each fan card in view: its name and its picture. The rest of
   * the card shows when it is lifted or held, so more of it here is height
   * taken from the chairs.
   */
  fanMax: 150,
  /** A fan card: the full face's type scale in a box 190 wide, as the board draws the hand. */
  fanCard: { width: 190, height: 258 },
  /** The draft pile's column at the left of the fan. */
  pile: 126,
  /** The most rows of chairs the screen lays out. */
  maxRows: 4,
  /**
   * **A few chairs sit in a cluster** (the user, 2026-11-18: "I'd also like for
   * few government seats to be clustered in the middle with negative space
   * around it instead of having it be evenly spaced"). Up to `most` chairs
   * take at most `cols` to a row, the last row centred under the others. The
   * block is centred in the room right of the government, so it sits to the
   * right of the page's centre, as the board's six chairs did (the user,
   * 2026-11-19: "they should be centered in the remaining space since the
   * government is in the left side"). Six chairs are two rows of three (the
   * user, 2026-11-19: "sure"). Seven chairs and more keep the board's layout
   * (C8 and C11).
   */
  cluster: { most: 6, cols: 3 },
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
  /** How much of each fan card is in view below the band, in pixels: at most `fanMax`. */
  fanView: number;
  /**
   * The height left over once the hand has `fanMax`, in pixels. Half goes
   * above the government and its chairs and half below, so the council sits
   * in the middle of its part of the page.
   */
  spare: number;
  /**
   * Set for a few chairs (`COUNCIL_FRAME.cluster`): the block's width, and the
   * page x of its middle, which is the middle of the room right of the
   * government (the sides, the government's column and its gap come off the
   * window first). The stylesheet centres the block in that room, so the
   * block's middle is `centre`. `null` for the board's layout.
   */
  cluster: { width: number; centre: number } | null;
  /** True when no form fits the window, so the chairs take the narrow form and the fan what is left. */
  cramped: boolean;
  /**
   * The top of the band over the hand, in pixels from the top of the sheet:
   * the head, the council's room and the spare height above the band. Nothing
   * in the government's column may reach below it (`doctrineStackStep`).
   */
  bandTop: number;
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
 *
 * Six chairs or fewer are a cluster (`COUNCIL_FRAME.cluster`): three or fewer
 * to a row, in the middle of the room right of the government. The hand
 * keeps at most `fanMax` of height, and the rest goes round the council
 * (`spare`).
 */
export function councilLayout(window: { width: number; height: number }, chairs: number): CouncilLayout {
  const count = Math.max(1, chairs);
  const frame = COUNCIL_FRAME;
  const most = Math.min(count, frame.maxRows);
  const clustered = count <= frame.cluster.most;
  // A cluster takes at most `cluster.cols` to a row, so it starts at the rows that gives.
  const fewest = clustered ? Math.min(most, Math.ceil(count / frame.cluster.cols)) : 1;
  const measure = (form: CouncilForm, rows: number): CouncilLayout => {
    const card = COUNCIL_FORMS[form];
    const cols = Math.ceil(count / rows);
    const width = cols * (card.width + 2 * card.inset) + (cols - 1) * frame.slotGap;
    const height = rows * (card.height + 2 * card.inset) + (rows - 1) * frame.rowGap;
    const government = form === 'full' || form === 'mid' ? frame.government.wide : frame.government.narrow;
    const left = window.height - frame.head - frame.chairsTop - height - frame.band;
    const fanView = Math.min(left, frame.fanMax);
    const room = window.width - 2 * frame.side - government - frame.columnGap;
    return {
      form,
      rows,
      cols,
      government,
      chairs: { width, height },
      fanView,
      spare: Math.max(0, left - fanView),
      // The block's width as the page draws it: each chair's frame has a
      // hairline round its inset, so a row of `cols` keeps room for them.
      // Its middle is the room's: right of the government's column and its gap.
      cluster: clustered ? { width: width + cols * 4, centre: frame.side + government + frame.columnGap + room / 2 } : null,
      cramped: false,
      bandTop: frame.head + frame.chairsTop + height + Math.max(0, left - fanView),
    };
  };
  const room = (layout: CouncilLayout): number => window.width - 2 * frame.side - layout.government - frame.columnGap;
  for (const form of FORM_ORDER) {
    for (let rows = fewest; rows <= most; rows += 1) {
      // A row count that leaves the columns as they were adds height and nothing else.
      if (rows > fewest && Math.ceil(count / (rows - 1)) === Math.ceil(count / rows)) continue;
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

/**
 * **The Doctrine stack under the government** (the user, 2026-11-20: "keep the
 * cards lower in the stack the same size, so they don't shrink as you go
 * down"; the orchestrator's layout ruling of the same day: the column never
 * covers the band over the hand). Every strip is one size, and each tucks
 * under the one above:
 *
 *   - `overlap`: how far a strip tucks under the one above when there is room,
 *     and how far the first tucks under the government's card;
 *   - `minStep`: the least of each strip left in view, which holds its name
 *     line: the name, the strip's foot and its gilt band;
 *   - `clearance`: the air kept between the stack's foot and the band.
 */
export const DOCTRINE_STACK = {
  overlap: 4,
  minStep: 24,
  clearance: 8,
} as const;

/**
 * **The step from one strip's top to the next**, in pixels: the strip's
 * height less the usual overlap when the stack fits its room, or less, by one
 * even amount for every strip, when it does not. `room` is the height from the
 * government card's foot to the band's top, less the clearance; `strip` is one
 * strip's height. The first strip starts `overlap` above the card's foot, so a
 * stack of `count` strips ends `strip - overlap + (count - 1) * step` below it.
 * The step is never less than `minStep`, so a name always shows; a stack that
 * does not fit even then (more Doctrines than a seat can hold) runs on.
 */
export function doctrineStackStep(room: number, count: number, strip: number): number {
  const natural = strip - DOCTRINE_STACK.overlap;
  if (count <= 1) return natural;
  const fits = Math.floor((room + DOCTRINE_STACK.overlap - strip) / (count - 1));
  return Math.max(DOCTRINE_STACK.minStep, Math.min(natural, fits));
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
