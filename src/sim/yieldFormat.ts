/**
 * Where a yield stops being exact and becomes a number a player reads.
 *
 * Batch X — exact yields (the user, 2026-09-06: *"could we just have yields be
 * valid as decimals? Just don't show this to the player, but behind the scenes
 * all yields should be calculated exactly"*). Every fold in `src/sim/` now
 * carries fractions: a size-1 town at half a beaker banks half a beaker, a tenth
 * of seven food is seven tenths of a point of culture, and Entry XVII's two
 * stages multiply without a floor at the end. That is the whole of the ruling,
 * and it leaves exactly one obligation behind — **nothing shows a player a
 * fraction** — which is what this module is.
 *
 * It lives in `src/sim/` rather than in `src/ui/figures.ts` for the reason
 * `statecraft.ts`'s describers live where they do: the compendium's prose, a
 * card's stamp, a toast's sentence and the arena's sheet all quote yields, and
 * two of those four are composed sim-side. One rounding rule, one file.
 *
 * The rule is `Math.round`, half away from zero
 * --------------------------------------------
 * A standing figure is the nearest whole number, so a town making 2.5 beakers
 * reads 3 and one making 2.4 reads 2. Not a floor: a floor is what batch D's
 * science cut ran into, and a bar that reads 0 while the pool climbs is the
 * exact lie this batch was called to end. `Math.round(-2.5)` is `-2` in
 * JavaScript, which would print `−2` for a figure a hair worse than `−3`, so the
 * magnitude is rounded and the sign put back — symmetric, and the same figure
 * whichever side of zero a modifier lands on.
 *
 * Lines may not visibly sum, and that is stated rather than patched
 * ----------------------------------------------------------------
 * Hard rule 5 says a total is the fold of its breakdown, and it still is —
 * *exactly*, on the exact figures. What a surface prints is each line rounded
 * beside a total rounded from the **exact** total, so three lines of 0.4 print
 * `0 · 0 · 0` under a total of `1`. The alternative — apportioning the rounding
 * back over the lines — makes the printed lines disagree with what each source
 * actually paid, which is a worse lie than an arithmetic that does not look
 * closed. There is deliberately **no "±"**: the user does not want the
 * interface apologising for a rounding (2026-09-06).
 *
 * Nothing here is ever fed back into the simulation. A rounded figure is a
 * photograph; the pools, the baskets and the banks keep the fraction.
 */

/**
 * The one rounding a yield ever gets: nearest whole number, symmetric about
 * zero, and `-0` normalised away so a printer never composes `−0`.
 *
 * Every printer in the game goes through this, and nothing in `src/sim/` calls
 * it on a figure it then banks.
 */
export function roundYield(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.sign(value) * Math.round(Math.abs(value));
  return rounded === 0 ? 0 : rounded;
}

/**
 * The rounded magnitude as a string — `"7"`, `"0"`. The plain half of the pair;
 * a caller wanting the house's thousands abbreviation composes over this
 * (`figure` in `src/ui/figures.ts` does).
 */
export function formatYield(value: number): string {
  return String(Math.abs(roundYield(value)));
}

/**
 * `"+7"`, `"−2"`, `"0"` — a rounded yield in the house voice, with the true
 * minus sign rather than a hyphen (`docs/design-specimen.html`).
 *
 * A figure that rounds to zero prints `0` and never `+0`: "this pays nothing
 * worth printing" is one statement, not a signed one.
 */
export function signedYield(value: number): string {
  const rounded = roundYield(value);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `−${-rounded}`;
  return '0';
}

/**
 * True when a figure is worth printing at all — it rounds to something other
 * than zero.
 *
 * The predicate a surface that hides empty lines wants, said once: a list
 * filtered on `!== 0` before batch X now keeps every 0.4 it is handed, and a
 * ledger of eleven lines all printing `0` is noise rather than a breakdown.
 */
export function yieldShows(value: number): boolean {
  return roundYield(value) !== 0;
}
