/**
 * The damage figures that rise off the board when a blow lands.
 *
 * DOM over the canvas, positioned by `renderer.projectCell`, for exactly the
 * reasons the city banners are (see `cityBanners.ts`): text in WebGL means a
 * font atlas and a draw call per string, while a `<span>` is crisp at every
 * zoom and costs nothing to animate. These are shorter-lived than banners and
 * nothing can click them, so they are the simplest possible version of that
 * idea — spawn, rise, fade, remove.
 *
 * Vermilion for damage this player dealt, teal for damage it took: the two
 * accents the whole interface already uses for "us" and "them" (see
 * `docs/design-specimen.html`), so a melee trade reads as a trade before a
 * single digit has been parsed.
 *
 * Positioning
 * -----------
 * Repositioned from the renderer's frame listener, exactly like the banners —
 * which means the two have to share one listener slot. `main.ts` owns that
 * composition and calls both; neither module registers itself. That is why
 * `reposition` is on the returned interface rather than hidden inside.
 *
 * A number is anchored to the *cell* it belongs to and not to a unit, because
 * the unit it describes is very often dead — which is the case the number
 * matters most for.
 *
 * Reduced motion
 * --------------
 * The rise is decoration; the figure is the information. Under
 * `prefers-reduced-motion` the number simply appears, holds, and goes, with no
 * travel and no fade — a static beat rather than a suppressed one, because a
 * player who has asked for less movement still needs to know what happened.
 * Both variants live in the stylesheet (`.damage-number`), so this module never
 * animates anything itself.
 */

import type { CellRef, MapView } from './mapView';

/** How long a number stays on screen. Matches `damage-rise` in style.css. */
const LIFETIME_MS = 900;
/** The static variant is briefer: there is no travel to watch. */
const STATIC_LIFETIME_MS = 700;

export interface DamageNumbersOptions {
  /** An element covering the viewport, above the canvas. The banner sheet. */
  container: HTMLElement;
  renderer: MapView;
}

/** One figure to float, in board coordinates. */
export interface DamageNumber extends CellRef {
  amount: number;
  /** Whose loss it is, from the local seat's point of view. */
  kind: 'dealt' | 'taken';
}

export interface DamageNumbers {
  /** Floats a batch of figures. A batch, because a melee produces two at once. */
  show(numbers: readonly DamageNumber[]): void;
  /** Moves every live figure to where its cell is now. Runs per drawn frame. */
  reposition(): void;
  /** Takes every figure down at once — a new game, a seat change. */
  clear(): void;
  dispose(): void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Floater {
  root: HTMLElement;
  col: number;
  row: number;
  /** Timer that will remove it, so `clear` can cancel a whole screenful. */
  timer: number;
}

export function createDamageNumbers(options: DamageNumbersOptions): DamageNumbers {
  const { container, renderer } = options;
  const live = new Set<Floater>();

  function remove(floater: Floater): void {
    window.clearTimeout(floater.timer);
    floater.root.remove();
    live.delete(floater);
  }

  function show(numbers: readonly DamageNumber[]): void {
    // Without a projection there is nowhere to put these. Under the frozen 2D
    // pipelines that is simply the answer, exactly as it is for the banners.
    if (!renderer.projectCell) return;
    const still = prefersReducedMotion();

    for (const number of numbers) {
      if (number.amount <= 0) continue;
      const root = document.createElement('div');
      root.className = `damage-number is-${number.kind}${still ? ' is-static' : ''}`;
      // A minus sign, not a bare figure: it is a loss either way, and the two
      // colours say whose. Text, never markup — the amount is data.
      root.textContent = `−${number.amount}`;
      container.append(root);

      const floater: Floater = {
        root,
        col: number.col,
        row: number.row,
        timer: window.setTimeout(
          () => remove(floater),
          still ? STATIC_LIFETIME_MS : LIFETIME_MS,
        ),
      };
      live.add(floater);
    }
    reposition();
  }

  /**
   * Places every live figure over its cell.
   *
   * A number whose cell is off screen is hidden rather than left to stretch the
   * page, exactly as a banner is. The vertical nudge is in the stylesheet so
   * that the rise animation and the resting offset cannot disagree.
   */
  function reposition(): void {
    if (!renderer.projectCell) return;
    for (const floater of live) {
      const point = renderer.projectCell(floater.col, floater.row);
      if (!point || !point.onScreen) {
        floater.root.style.display = 'none';
        continue;
      }
      floater.root.style.display = '';
      floater.root.style.left = `${Math.round(point.x)}px`;
      floater.root.style.top = `${Math.round(point.y)}px`;
    }
  }

  function clear(): void {
    for (const floater of [...live]) remove(floater);
  }

  return {
    show,
    reposition,
    clear,
    dispose: clear,
  };
}
