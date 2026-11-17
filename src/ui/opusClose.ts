/**
 * **The Opus close**: what every seat sees when the Magnum Opus is finished
 * (batch SS7; the board is "The Magnum Opus closes" on
 * `docs/plans/mockups/scholars-study/Moments.dc.html`).
 *
 * Before this batch the close was a splash card ("X is victorious") and then
 * the standings. The user's review of the board kept two beats in the colours
 * of the Great Work, removed the third, and replaced the fourth with a
 * full-screen page that animates the 3D Abacus:
 *
 * 1. **Nigredo** (black, iron-gall ink). The board goes dark. The sign of the
 *    work appears, and the town that finished it: "The Magnum Opus is finished
 *    in Baghdad."
 * 2. **Albedo** (white, parchment). The black fades to parchment, and the
 *    display face names the builder.
 * 3. **The Abacus page opens** over the parchment, on the table's vellum: the
 *    frame fills the window, with a name and a tally at each rod, and sways a
 *    little as it does on the Abacus screen.
 * 4. **The golden bead lights**: the camera moves in on the winner's rod, and a
 *    golden bead lights at the start of the unearned beads, larger than the
 *    rest and with a halo.
 * 5. **It slides home** with the frame's own slide and knock. The tally does
 *    not move: the golden bead is not one of the beads the threshold counts.
 * 6. **The turn**: the frame turns on its turntable and back, so the gilt bead
 *    catches the light, and the labels fade while it is turned. Then the
 *    standings page rises.
 *
 * About six seconds in all (`OPUS_CLOSE_TIMING`, the board's beat lengths). A
 * key or a press at any time goes straight to the standings.
 *
 * Reduced motion: the board's rule. No camera move and no turn, and no sway.
 * The beats still cross-fade, and the bead slide stays, because the slide is
 * the event. The golden bead lights at once, and the still frame is held for a
 * moment where the turn would be.
 *
 * The Abacus, mounted, not rebuilt
 * --------------------------------
 * The page builds an `AbacusStage` (`src/render3d/abacus3d.ts`), the renderer
 * the Abacus screen and the look-dev page use, on a canvas of its own, and
 * gives the context back when the close ends. Like the Abacus screen it is not
 * on `modalShell.ts`: it owns a measured stage, the canvas must be laid out
 * before the stage measures it, and it answers its own keys. It is news, not a
 * screen: the game raises it, and nothing on the HUD opens it.
 *
 * The two things the frame did not do before are the stage's own verbs
 * (`lightGolden`, `slideGolden`, `focusRod`, `turn`), and how they look is
 * `data/view3d.json`'s `abacus.close`. The beat lengths are here, because the
 * page schedules them.
 *
 * Words
 * -----
 * Every word is a reading: the work's name off its own row (`opusName`), the
 * town off the stones (`opusCity`), the builder by `seatTitle` and `seatName`.
 * The tallies are the Abacus screen's own count over the frame's size. No
 * figure is written inside a sentence.
 */

import { AbacusStage, Clack, cssHex } from '../render3d/abacus3d';
import { VIEW3D } from '../render3d/lookData';
import { seatName } from '../sim/leaderData';
import type { GameState } from '../sim/state';
import { opusMarkDataUri } from '../art/lineMarks';
import { type AbacusRow, frameBeads } from './abacusScreen';
import { beadsTowardThreshold } from './beadsScreen';
import { element } from './dom';
import { prefersReducedMotion } from './motion';
import { opusCity, opusName, seatTitle } from './victoryScreen';
import './opusClose.css';

/**
 * The beats, in milliseconds: the board's lengths. Here rather than in the
 * stylesheet because the page schedules them; the stylesheet's fades sit
 * inside these lengths.
 */
export const OPUS_CLOSE_TIMING = {
  /** Beat 1, nigredo. */
  nigredoMs: 1200,
  /** Beat 2, albedo. */
  albedoMs: 1200,
  /** Beat 3, the Abacus page opening. */
  pageMs: 400,
  /** Beat 4, the camera moving in and the golden bead lighting. */
  lightMs: 600,
  /** Beat 5, the slide home (the frame's slide is 0.46 s of it). */
  slideMs: 500,
  /** Beat 6, the turn there and back. */
  turnMs: 2000,
  /** How long the camera takes to move back out at the start of the turn. */
  outMs: 600,
  /** Reduced motion: how long the still frame holds where the turn would be. */
  stillMs: 900,
  /** How long the page takes to fade as the standings rise. */
  leaveMs: 260,
  /**
   * When the stage is built: the end of nigredo's fade-in, while the screen is
   * black and still, so the moment a WebGL context costs is not seen.
   */
  buildMs: 700,
} as const;

/** When each beat starts, from the moment the close is raised. */
export function opusCloseSchedule(reduced: boolean): {
  albedo: number;
  page: number;
  light: number;
  slide: number;
  turn: number;
  finish: number;
} {
  const t = OPUS_CLOSE_TIMING;
  const albedo = t.nigredoMs;
  const page = albedo + t.albedoMs;
  const light = page + t.pageMs;
  const slide = light + t.lightMs;
  const turn = slide + t.slideMs;
  return { albedo, page, light, slide, turn, finish: turn + (reduced ? t.stillMs : t.turnMs) };
}

/** Everything the close says and draws, as data. */
export interface OpusCloseReading {
  /** Beat 1: "The Magnum Opus is finished in Baghdad." */
  nigredo: string;
  /** Beat 2's name: "Al-Ma’mun of the Abbasids". */
  builder: string;
  /** Beat 2's line: "Al-Ma’mun has finished The Magnum Opus." */
  albedo: string;
  /** The rods, in roster order, as the Abacus screen strings them. */
  rows: readonly AbacusRow[];
  /** Which rod is the winner's, or -1 when the winner has none. */
  winnerRod: number;
}

/** The close for a decided game. Pure, so the suite can pin the words. */
export function opusCloseReading(state: GameState, rows: readonly AbacusRow[]): OpusCloseReading {
  const winnerId = state.winnerId ?? -1;
  const work = opusName();
  const city = opusCity(state, state.winnerId);
  return {
    nigredo: city === null ? `${work} is finished.` : `${work} is finished in ${city.name}.`,
    builder: winnerId < 0 ? '' : seatTitle(state, winnerId),
    albedo: winnerId < 0 ? '' : `${seatName(state, winnerId)} has finished ${work}.`,
    rows,
    winnerRod: rows.findIndex((row) => row.playerId === winnerId),
  };
}

// --- the page ----------------------------------------------------------------

export interface OpusClose {
  readonly isOpen: boolean;
  /** Raises the close and runs its beats. */
  play(reading: OpusCloseReading): void;
  /** Goes straight to the standings, as any key or press does. */
  skip(): void;
  /** Takes it down without opening anything: the title screen's and a load's sweep. */
  clear(): void;
  dispose(): void;
}

interface OpusCloseOptions {
  overlay: HTMLElement;
  /** Raised as the close goes up, so the open cards close under it. */
  onOpen?: () => void;
  /** The close is over, by its own clock or by a key: the standings rise. */
  onFinished: () => void;
}

/** One rod's two labels on the page, and its swatch's ink. */
interface RodLabels {
  name: HTMLElement;
  tally: HTMLElement;
}

export function createOpusClose(options: OpusCloseOptions): OpusClose {
  const { overlay } = options;
  const timers = new Set<number>();
  let reading: OpusCloseReading | null = null;
  let stage: AbacusStage | null = null;
  let labelLayer: HTMLElement | null = null;
  let labels: RodLabels[] = [];
  /** True from the first key or the last beat until the page is down. */
  let finishing = false;
  const clack = new Clack();

  function isOpen(): boolean {
    return !overlay.hidden;
  }

  function after(ms: number, run: () => void): void {
    const id = window.setTimeout(() => {
      timers.delete(id);
      run();
    }, ms);
    timers.add(id);
  }

  function clearTimers(): void {
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  }

  // --- building ------------------------------------------------------------

  function build(read: OpusCloseReading): void {
    const nigredo = element('section', 'opus-beat opus-nigredo');
    const sign = element('span', 'opus-sign');
    sign.setAttribute('aria-hidden', 'true');
    const drawn = element('span', 'line-mark');
    drawn.style.setProperty('--line-mark', `url("${opusMarkDataUri()}")`);
    sign.append(drawn);
    nigredo.append(sign, element('p', 'opus-nigredo-line', read.nigredo));

    const albedo = element('section', 'opus-beat opus-albedo');
    albedo.append(element('h2', 'opus-builder', read.builder), element('p', 'opus-albedo-line', read.albedo));

    const page = element('section', 'opus-beat opus-page');
    // The table the frame stands on, read off the look data, so the canvas has
    // no edge against the page before its first frame.
    page.style.background = cssHex(VIEW3D.table.color);
    const title = element('h2', 'opus-page-title', 'The Abacus');
    const hint = element('p', 'opus-page-hint', 'Esc closes');
    const stageBox = element('div', 'opus-stage');
    page.append(stageBox, title, hint);

    overlay.replaceChildren(nigredo, albedo, page);
  }

  /** The stage, on the page's own canvas. Built once the screen is black and still. */
  function buildStage(read: OpusCloseReading): void {
    const box = overlay.querySelector<HTMLElement>('.opus-stage');
    if (!box || stage) return;
    // A fresh canvas for each close: a canvas hands out one WebGL context, and
    // the last close's stage took its context with it.
    const canvas = element('canvas', 'opus-canvas');
    labelLayer = element('div', 'opus-labels');
    labelLayer.setAttribute('aria-hidden', 'true');
    box.replaceChildren(canvas, labelLayer);
    stage = new AbacusStage(
      canvas,
      read.rows.map((row) => ({ name: row.name, color: row.color })),
    );
    // Nothing is drawn until the page opens: a loop running under the black
    // and the parchment would be frames nobody sees.
    stage.setRunning(false);
    stage.setSway(!prefersReducedMotion());
    const perRod = stage.beadsPerRod;
    read.rows.forEach((row, index) => stage?.seed(index, frameBeads(row.beads, perRod)));
    stage.onStrike = () => clack.play();
    stage.onFrame = layoutLabels;
    buildLabels(read, perRod);
  }

  function buildLabels(read: OpusCloseReading, perRod: number): void {
    const layer = labelLayer;
    if (!layer) return;
    layer.replaceChildren();
    labels = read.rows.map((row, index) => {
      const name = element('div', 'opus-label is-name');
      if (index === read.winnerRod) name.classList.add('is-winner');
      name.append(element('span', 'opus-label-name', row.name));
      const swatch = element('span', 'opus-swatch');
      swatch.style.background = cssHex(row.color);
      name.append(swatch);
      const tally = element('div', 'opus-label is-tally');
      if (index === read.winnerRod) tally.classList.add('is-winner');
      // The Abacus screen's count, which leaves the golden bead out.
      tally.append(
        element('span', 'opus-count', String(beadsTowardThreshold(row.beads))),
        element('span', 'opus-total', ` / ${perRod}`),
      );
      layer.append(name, tally);
      return { name, tally };
    });
  }

  /**
   * Places the labels every frame, off points projected from the frame itself.
   * As the camera moves in, the winner's two labels move inside the frame,
   * above its rod (where the board draws them once the margins have left the
   * view), and the other rods' labels fade. While the frame is turned, all of
   * them fade.
   */
  function layoutLabels(): void {
    const current = stage;
    const read = reading;
    if (!current || !read) return;
    const focus = current.focusAmount;
    // Gone by a third of the way into the turn, back as the frame comes to rest.
    const turned = Math.max(0, 1 - current.turnAmount * 3);
    labels.forEach((entry, index) => {
      const place = current.labelPlacement(index);
      let left = place.left;
      let right = place.right;
      let opacity = place.opacity * turned;
      if (index === read.winnerRod) {
        const inside = current.insideLabelPlacement(index);
        left = { x: left.x + (inside.left.x - left.x) * focus, y: left.y + (inside.left.y - left.y) * focus };
        right = { x: right.x + (inside.right.x - right.x) * focus, y: right.y + (inside.right.y - right.y) * focus };
      } else {
        // Out of the way early, and back only once the camera is nearly home:
        // projected from a camera still moved in, they would stand off the edge.
        opacity *= Math.max(0, 1 - focus * 2.5);
      }
      for (const [node, at] of [
        [entry.name, left],
        [entry.tally, right],
      ] as const) {
        node.style.left = `${at.x}px`;
        node.style.top = `${at.y}px`;
        node.style.opacity = `${opacity}`;
        node.style.setProperty('--inside', index === read.winnerRod ? `${focus}` : '0');
      }
    });
  }

  // --- the beats -----------------------------------------------------------

  function setBeat(beat: 'nigredo' | 'albedo' | 'page'): void {
    overlay.classList.toggle('is-nigredo', true);
    overlay.classList.toggle('is-albedo', beat === 'albedo' || beat === 'page');
    overlay.classList.toggle('is-page', beat === 'page');
  }

  function play(read: OpusCloseReading): void {
    clear();
    reading = read;
    options.onOpen?.();
    finishing = false;
    const reduced = prefersReducedMotion();
    const at = opusCloseSchedule(reduced);
    build(read);
    overlay.classList.remove('is-albedo', 'is-page', 'is-leaving');
    overlay.hidden = false;
    // A frame for the black to start from transparent, so it fades rather than cuts.
    requestAnimationFrame(() => {
      if (isOpen() && reading === read) setBeat('nigredo');
    });
    overlay.focus({ preventScroll: true });
    // The knock is the stage's own voice. The page has had a press by now
    // (End Turn, or the order that finished the work), so the audio device
    // may start.
    clack.arm();

    // Each beat waits from the moment the one before it started, not from the
    // raise: a slow moment (the WebGL context is made during nigredo) then
    // lengthens the beat it falls in, and never cuts the next one short.
    const t = OPUS_CLOSE_TIMING;
    const steps: readonly (readonly [number, () => void])[] = [
      [t.buildMs, () => buildStage(read)],
      [at.albedo - t.buildMs, () => setBeat('albedo')],
      [
        at.page - at.albedo,
        () => {
          buildStage(read);
          setBeat('page');
          stage?.setRunning(true);
          stage?.resize();
          layoutLabels();
        },
      ],
      [
        at.light - at.page,
        () => {
          if (!stage || read.winnerRod < 0) return;
          if (!reduced) stage.focusRod(read.winnerRod, 1, t.lightMs / 1000);
          stage.lightGolden(read.winnerRod, reduced ? 0 : t.lightMs / 1000);
        },
      ],
      [at.slide - at.light, () => stage?.slideGolden()],
      [
        at.turn - at.slide,
        () => {
          if (!stage || reduced) return;
          if (read.winnerRod >= 0) stage.focusRod(read.winnerRod, 0, t.outMs / 1000);
          stage.turn(t.turnMs / 1000);
        },
      ],
      [at.finish - at.turn, finish],
    ];
    const run = (index: number): void => {
      const step = steps[index];
      if (step === undefined) return;
      after(step[0], () => {
        step[1]();
        run(index + 1);
      });
    };
    run(0);
  }

  // --- leaving -------------------------------------------------------------

  /** Takes the stage down and gives its WebGL context back. */
  function dropStage(): void {
    stage?.dispose();
    stage = null;
    labelLayer = null;
    labels = [];
  }

  /**
   * The standings rise, and the page fades off them. `onFinished` is called
   * first, so the sheet is already rising under the page as it fades.
   */
  function finish(): void {
    if (!isOpen() || finishing) return;
    finishing = true;
    clearTimers();
    options.onFinished();
    overlay.classList.add('is-leaving');
    after(prefersReducedMotion() ? 0 : OPUS_CLOSE_TIMING.leaveMs, () => {
      overlay.hidden = true;
      overlay.classList.remove('is-nigredo', 'is-albedo', 'is-page', 'is-leaving');
      overlay.replaceChildren();
      dropStage();
      reading = null;
      finishing = false;
    });
  }

  function clear(): void {
    clearTimers();
    overlay.hidden = true;
    overlay.classList.remove('is-nigredo', 'is-albedo', 'is-page', 'is-leaving');
    overlay.replaceChildren();
    dropStage();
    reading = null;
    finishing = false;
  }

  /** Any key, Escape included, goes straight to the standings. */
  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen() || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    finish();
  }

  function onPress(event: PointerEvent): void {
    if (!isOpen()) return;
    event.preventDefault();
    finish();
  }

  function onResize(): void {
    if (!stage || !isOpen()) return;
    stage.resize();
    layoutLabels();
  }

  window.addEventListener('keydown', onKeyDown, true);
  overlay.addEventListener('pointerdown', onPress);
  window.addEventListener('resize', onResize);

  return {
    get isOpen(): boolean {
      return isOpen();
    },
    play,
    skip: finish,
    clear,
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.removeEventListener('pointerdown', onPress);
      window.removeEventListener('resize', onResize);
      clear();
    },
  };
}
