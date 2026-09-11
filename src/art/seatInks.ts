/**
 * **A seat's two inks, and the one place the second one is decided** (batch H7,
 * `docs/flags.md` (oooo); the palette is the table "## The colours" in
 * `docs/leaders.md`).
 *
 * Civ's reading, said once and read everywhere: the **primary** is the *field*
 * — the territory line, the sculpt of a piece, a banner's rim, a canton's ground
 * — and the **secondary** is the *device and the trim* — the charge on the
 * canton, a piece's outline, the border's inner stitch. A surface does not
 * choose between them; it asks for the pair and paints both halves in the roles
 * above, so the board, the plate, the landing and the book cannot disagree about
 * which colour a seat *is*.
 *
 * Where the pair comes from
 * -------------------------
 * `GameConfig`, and nowhere else. A seat under a figure takes the figure's pair
 * at the table (`seatLeaders` writes `colors.primary` onto `PlayerSpec.color`
 * and `colors.secondary` onto `PlayerSpec.secondary`); a plain seat keeps the
 * palette's ink and names no second one. **There is no second source** — no
 * table here mapping a seat index to a pair, no lookup by leader id — because a
 * save is `{config, log}` and a game reloaded a year later must fly the banners
 * it was started with rather than whatever a table has become since.
 *
 * The fallback, and why it is *this* colour
 * -----------------------------------------
 * A seat with no second ink takes **the board's own ink** (`palette.ink` in
 * `data/view3d.json`): the colour `MaterialLibrary` is handed for the outline
 * shell, and the colour a charge is already inked in on a parchment canton. So a
 * roster with no figures in it paints exactly the
 * board it painted before the pair existed — the outline is the outline, the
 * charge is ink — and the two-tone reading is something a *figure* brings.
 * That is the whole of the fallback, it is decided here, and a surface that
 * decided it a second time would be the second source this module exists to
 * prevent.
 *
 * A leaf, structurally typed
 * --------------------------
 * Nothing is imported. The argument is a *shape* — anything carrying a `color`
 * and maybe a `secondary` — rather than `Player`, so `src/ui` and `src/render3d`
 * may both name this module without either of them dragging the simulation into
 * a drawing, and a setup screen can ask the same question of a `PlayerSpec` it
 * has not seated yet.
 */

/** The pair a surface paints: field first, device and trim second. */
export interface SeatInks {
  /** The field. Always present — a seat always has a colour. */
  primary: string;
  /** The device and the trim. Never absent here; see `DERIVED_SECONDARY`. */
  secondary: string;
}

/**
 * What a seat that names no second ink wears: the board's own ink.
 *
 * `palette.ink` in `data/view3d.json`, written out rather than imported because
 * this module is a leaf and a JSON import here would put the renderer's tuning
 * sheet inside every screen that draws a swatch. Pinned against it
 * (`test/render/seatInks.test.ts`).
 */
export const DERIVED_SECONDARY = '#2f2b32';

/** Anything that can answer "what colours does this seat wear". */
export interface InkedSeat {
  color: string;
  secondary?: string;
}

/**
 * **The one door.** A seat's pair, with the fallback applied.
 *
 * Takes `undefined` and answers all the same, because a roster walk that has
 * just looked a seat up by id should not have to decide what a chair nobody is
 * in looks like. A seat that is not there has **no** primary — the empty string,
 * which is what `playerPieceColor` has always been handed for one, and which
 * sends the diorama to its fallback order rather than to a colour this module
 * made up. Its *second* ink is the board's, exactly as a plain seat's is: there
 * is one fallback and this is it.
 */
export function seatInks(seat: InkedSeat | null | undefined): SeatInks {
  return {
    primary: seat?.color ?? '',
    secondary: seat?.secondary ?? DERIVED_SECONDARY,
  };
}

// --- how far apart two inks are ---------------------------------------------

/**
 * The separation two seat inks must keep, in the metric below.
 *
 * `docs/leaders.md`'s number ("## The colours"), and it is a **pin** rather than
 * a tuning: six figures' primaries and twelve palette inks all have to be told
 * apart across a table by somebody who is looking at the ground rather than at
 * the swatch, and the failure mode — two empires whose borders are the same
 * green — is one nobody reports as a bug, they just lose track of whose land
 * they are standing in. The register that holds it is
 * `test/render/seatInks.test.ts`, which prints the offending pair.
 */
export const MIN_INK_DISTANCE = 40;

/** `#rrggbb` to its three 0..255 channels. Anything else reads as black. */
function channels(hex: string): [number, number, number] {
  const clean = hex.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(clean)) return [0, 0, 0];
  const value = Number.parseInt(clean.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * How far apart two inks look — the "redmean" distance.
 *
 * A weighted RGB distance rather than a hue angle, and the reason is in the
 * palette itself: Al-Ma'mun's black and the palette's own ink are both greys,
 * and a grey has *no* hue — a hue metric would call them identical, or call
 * every pair of greys equally far apart, and either answer is wrong about the
 * thing being asked. Weighting the three channels by where in the red range the
 * pair sits is the cheap approximation of a perceptual distance that everybody
 * uses for exactly this question, and it separates two near-blacks by their
 * value while still calling jade and teal close.
 *
 * Symmetric, zero on a pair, and monotone in every channel — which is all a pin
 * asks of it.
 */
export function inkDistance(a: string, b: string): number {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const mean = (ar + br) / 2;
  const dr = ar - br;
  const dg = ag - bg;
  const db = ab - bb;
  return Math.sqrt(
    (2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db,
  );
}
