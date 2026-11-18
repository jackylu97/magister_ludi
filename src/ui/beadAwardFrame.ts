/**
 * **The 3D Abacus on the bead sheet** (2026-11-18, `docs/flags.md`, "Age
 * turn-over: a missing plate, the abacus motion, and a faster clock").
 *
 * The user, after an age turned over: "it uses the 2d abacus animation, when
 * ideally it should be the 3D one". The bead sheet (`beadModal.ts`) is the only
 * abacus motion a turn-over plays. A wager bar met on the last turn of an age
 * pays its bead in the same resolution that opens the next age, so the bead
 * sheet comes up just before the age plate.
 *
 * So the bead moment now mounts the frame that the Abacus screen and the Opus
 * close use (`AbacusStage`, `src/render3d/abacus3d.ts`). Every seat has its rod,
 * as on the Abacus screen. This seat's new bead slides onto its rod with the
 * frame's own slide and knock (`AbacusStage.earn`, the slide the look-dev page
 * plays). Since the user's second look (2026-11-18) the frame stands on a
 * full-screen page (`beadModal.ts`'s `renderPage`), large, with the bead's name
 * over it and nothing else but the count line and Proceed.
 *
 * What does not change
 * --------------------
 * - The frame's look. A styling pass for the 3D abacus is scheduled on its own.
 * - The sheet's words, its tally line and its keys.
 * - Reduced motion: the sheet shows the rod as it now stands, with no slide,
 *   which is the 2D rod's rule (`BeadAwardFace.arriving` is null).
 *
 * How to turn it off
 * ------------------
 * One switch, `BEAD_SHEET_FRAME_3D` in `beadModal.ts`. With it off, the sheet
 * draws the 2D rod as before. The sheet also falls back to the 2D rod when the
 * browser gives it no WebGL context.
 *
 * Cost
 * ----
 * One WebGL context while a sheet is up. It is given back when the sheet moves
 * on to the next bead or closes (`dispose`), exactly as the Opus close gives
 * its context back.
 */

import { AbacusStage, Clack, type FamilyId, cssHex } from '../render3d/abacus3d';
import { VIEW3D } from '../render3d/lookData';
import type { EarnedBead } from '../sim/state';
import { type AbacusRow, frameBeads } from './abacusScreen';
import { isGoldenBead } from './beadsScreen';
import { element } from './dom';
import { prefersReducedMotion } from './motion';

/** The whole table, and which rod is the reader's. */
export interface BeadTable {
  /** Every real seat's rod, in roster order: the Abacus screen's own rows. */
  rows: readonly AbacusRow[];
  /** The seat reading the sheet. Its rod is the one the bead slides onto. */
  seat: number;
}

/** How long after the sheet rises the bead starts to slide: the sheet's settle. */
const SLIDE_DELAY_MS = 320;

/** The space kept between the words over the canvas and the frame, in pixels. */
const CLEAR_GAP_PX = 12;

/**
 * The colour of the table the frame stands on, as CSS: the bead page's ground,
 * so the canvas has no edge against the page. The Opus close's page does the
 * same.
 */
export function frameGround(): string {
  return cssHex(VIEW3D.table.color);
}

/** What each rod is seeded with, and the one bead that then slides. Pure. */
export interface FrameSeeds {
  /** One list per rod, in the table's order: the beads standing at the start. */
  seeds: FamilyId[][];
  /** The reader's rod, or -1 when the reader has no rod at this table. */
  mine: number;
  /** The bead that slides onto the reader's rod, or null for no slide. */
  arriving: FamilyId | null;
}

/**
 * **The frame at the moment the sheet rises.**
 *
 * Every other rod stands as it is now. The reader's rod is `rod`, the seat's
 * beads the instant this bead landed (`BeadNews.rod`), less the new bead when
 * that bead slides. It does not slide when `slide` is false (reduced motion, or
 * a bead the 2D rod would not animate either), when the new bead is the golden
 * one, or when the rod is already longer than the frame is cut for: the frame
 * then shows its first `perRod` beads and the new bead is not among them.
 */
export function frameSeeds(
  table: BeadTable,
  rod: readonly EarnedBead[],
  slide: boolean,
  perRod: number,
): FrameSeeds {
  const mine = table.rows.findIndex((row) => row.playerId === table.seat);
  const drawn = frameBeads(rod, perRod);
  const newest = rod[rod.length - 1];
  const counted = rod.filter((bead) => !isGoldenBead(bead)).length;
  const slides =
    slide && mine >= 0 && newest !== undefined && !isGoldenBead(newest) && counted <= perRod;
  const arriving = slides ? (drawn[drawn.length - 1] ?? null) : null;
  const seeds = table.rows.map((row, index) => {
    if (index !== mine) return frameBeads(row.beads, perRod);
    return arriving === null ? drawn : drawn.slice(0, -1);
  });
  return { seeds, mine, arriving };
}

/** The frame on one sheet. */
export interface BeadAwardFrame {
  /** Stops the slide, gives the WebGL context back and takes the frame off the sheet. */
  dispose(): void;
}

/**
 * One knock for every sheet. An `AudioContext` per sheet would leave one behind
 * each time, and a browser allows only a few.
 */
let sharedClack: Clack | null = null;

/**
 * Puts the frame at the top of `host` (the sheet's figure) and starts it.
 *
 * Call it once the sheet is on screen: the stage measures its box when it is
 * built, and a box that is not laid out measures nothing. Returns null, and
 * leaves `host` as it was, when the browser gives no WebGL context. The caller
 * then draws the 2D rod.
 */
export function mountBeadAwardFrame(
  host: HTMLElement,
  table: BeadTable,
  rod: readonly EarnedBead[],
  slide: boolean,
  /**
   * The words laid over the canvas, which the frame must stay clear of: the
   * name and its line above, the count line below (2026-11-18). Measured, not
   * guessed, so a short window keeps them apart too.
   */
  clear: { above?: HTMLElement; below?: HTMLElement } = {},
): BeadAwardFrame | null {
  const box = element('div', 'bead-award-stage');
  const canvas = element('canvas', 'abacus-canvas');
  const layer = element('div', 'abacus-labels');
  layer.setAttribute('aria-hidden', 'true');
  box.append(canvas, layer);
  host.prepend(box);

  let stage: AbacusStage;
  try {
    stage = new AbacusStage(
      canvas,
      table.rows.map((row) => ({ name: row.name, color: row.color })),
    );
  } catch {
    box.remove();
    return null;
  }
  stage.setSway(!prefersReducedMotion());

  const plan = frameSeeds(table, rod, slide, stage.beadsPerRod);
  plan.seeds.forEach((seed, index) => stage.seed(index, seed));

  // The names, hung off the left end of each rod as on the Abacus screen. No
  // tally beside them: the sheet's own line under the frame counts the beads
  // against the threshold, and a second count against the frame's size would
  // be two different numbers for one rod.
  const labels = table.rows.map((row, index) => {
    const name = element('div', 'abacus-label is-name');
    if (index === plan.mine) name.classList.add('is-you');
    const swatch = element('span', 'abacus-swatch');
    swatch.style.background = cssHex(row.color);
    name.append(swatch, element('span', undefined, row.name));
    layer.append(name);
    return name;
  });
  stage.onFrame = () => {
    labels.forEach((name, index) => {
      const place = stage.labelPlacement(index);
      name.style.left = `${place.left.x}px`;
      name.style.top = `${place.left.y}px`;
      name.style.opacity = `${place.opacity}`;
    });
  };

  // The frame's own knock as the bead lands. The page has had a press by now
  // (End Turn, or the order that paid the bead), so the audio device may start.
  sharedClack ??= new Clack();
  sharedClack.arm();
  const clack = sharedClack;
  stage.onStrike = () => clack.play();

  let timer = 0;
  if (plan.arriving !== null) {
    const family = plan.arriving;
    timer = window.setTimeout(() => {
      timer = 0;
      stage.earn(plan.mine, family);
    }, SLIDE_DELAY_MS);
  }

  // The frame is fitted into the band between the words over the canvas.
  const keepClear = (): void => {
    const box = canvas.getBoundingClientRect();
    if (box.height <= 0) return;
    const top = clear.above ? (clear.above.getBoundingClientRect().bottom + CLEAR_GAP_PX - box.top) / box.height : 0;
    const bottom = clear.below ? (box.bottom - clear.below.getBoundingClientRect().top + CLEAR_GAP_PX) / box.height : 0;
    stage.setClearBands(top, bottom);
  };
  keepClear();

  const onResize = (): void => {
    stage.resize();
    keepClear();
  };
  window.addEventListener('resize', onResize);

  return {
    dispose(): void {
      if (timer !== 0) window.clearTimeout(timer);
      timer = 0;
      window.removeEventListener('resize', onResize);
      stage.onFrame = null;
      stage.onStrike = null;
      stage.dispose();
      box.remove();
    },
  };
}
