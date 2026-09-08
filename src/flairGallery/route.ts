/**
 * Section 8: the turn medallions, on a route, at the size the board prints
 * them.
 *
 * The newest drawn mark in the game (batch U1, `docs/flags.md` (bbb)) and the
 * one hardest to judge in place: it appears only under the cursor, on a route
 * long enough to cross a turn boundary, and it is gone the moment the pointer
 * moves. So it is here, on a strip of hexes, at turns 1, 2 and 3 with a
 * destination at the end of them — which is the arrangement the ruling is
 * about, since a march that fits inside one turn wears one medallion and raises
 * no question at all.
 *
 * A 2D canvas, for `chart.ts`' reason exactly
 * -------------------------------------------
 * A medallion is a cell of `TileIcons`' atlas, and the atlas *is* a 2D canvas —
 * the parchment, the inked border and the numeral are all put down by
 * `drawMedallionCell`. So this stall reproduces nothing: it takes the loaded
 * atlas, finds each number's cell by `tileIconIndex`, and blits it onto a patch
 * of board at the fraction of a hex `overlay.medallionScale` asks for. What you
 * are looking at is the pixels the renderer samples.
 *
 * The two voices are the board's two: the hovered route at
 * `medallionOpacity` and a committed one at `medallionQuietOpacity`, drawn
 * one above the other so the difference is a comparison rather than a memory.
 * The destination's is larger by `medallionDestinationScale`, which is the
 * route dots' own rule and is inherited here rather than invented.
 */

import {
  type TileIcons,
  badgeCellOrigin,
  medallionIdFor,
  tileAtlasSize,
  tileIconIndex,
} from '../render3d/badges3d';
import { VIEW3D } from '../render3d/lookData';
import { block, controls, element, slider } from './sheet';

const FOG = VIEW3D.fog;
const OVERLAY = VIEW3D.overlay;

/** A `#rrggbb` string for a palette entry. */
function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * How wide one hex is on screen at the default zoom, in CSS pixels — the same
 * approximation, and the same caveat, as `chart.ts`' swatch. It is the number
 * that makes "does this survive being printed at board scale" an answerable
 * question on a flat page.
 */
const HEX_AT_GAME_ZOOM = 64;

/** Which turns the stall lays out: three rests and the destination. */
const STALL_TURNS = [1, 2, 3, 4] as const;

/** How many hexes of route the strip draws between the first hex and the last. */
const STALL_HEXES = 9;

/**
 * One strip of route: ghost hexes, the run of dots along them, and a medallion
 * on each hex a turn ends on.
 *
 * Redrawn whole on every knob, which is the overlay layer's own policy one
 * dimension down — this is a few dozen fills and four blits, and a stall that
 * patched itself could disagree with the tunables it is showing.
 */
class RouteStall {
  private readonly context: CanvasRenderingContext2D | null;
  private atlas: CanvasImageSource | null = null;
  private scale = OVERLAY.medallionScale;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(HEX_AT_GAME_ZOOM * (STALL_HEXES + 1));
    const height = Math.round(HEX_AT_GAME_ZOOM * 2.6);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.context = canvas.getContext('2d');
    this.context?.scale(ratio, ratio);
  }

  setIcons(icons: TileIcons | null): void {
    const texture = icons?.material.map ?? null;
    this.atlas = (texture?.image as CanvasImageSource | undefined) ?? null;
    this.draw();
  }

  setScale(scale: number): void {
    this.scale = scale;
    this.draw();
  }

  draw(): void {
    const context = this.context;
    if (!context) return;
    const width = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const height = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
    const hexSize = HEX_AT_GAME_ZOOM;

    context.clearRect(0, 0, width, height);
    // The ground: grassland, flat. Not the fog's vellum — a route is drawn on
    // land somebody can see, and parchment on parchment would be the one
    // background that flatters this mark instead of testing it.
    context.fillStyle = hex(VIEW3D.terrainColor.grassland);
    context.fillRect(0, 0, width, height);

    for (const [row, opacity, label] of [
      [0.72, OVERLAY.medallionOpacity, 'the hovered route'],
      [1.88, OVERLAY.medallionQuietOpacity, 'the committed route'],
    ] as const) {
      this.drawRun(context, hexSize, hexSize * row, opacity, label);
    }
  }

  /** One run: the hexes, the dots, and the four medallions along them. */
  private drawRun(
    context: CanvasRenderingContext2D,
    hexSize: number,
    centreY: number,
    opacity: number,
    label: string,
  ): void {
    const step = hexSize * 0.96;
    const first = hexSize * 0.7;

    context.save();
    context.strokeStyle = hex(FOG.ghostColor);
    context.globalAlpha = FOG.ghostOpacity;
    context.lineWidth = Math.max(1, hexSize * FOG.ghostWidth);
    for (let i = 0; i < STALL_HEXES; i++) {
      hexPath(context, first + i * step, centreY, hexSize * FOG.ghostOuter * 0.5);
      context.stroke();
    }
    context.restore();

    // The route dots, in the overlay's own ink and at its own radius: the
    // medallions have to be read *against* them, since that is the only place
    // the two ever appear.
    context.save();
    context.globalAlpha = OVERLAY.pathOpacity;
    context.fillStyle = hex(OVERLAY.pathColor);
    for (let i = 0; i < STALL_HEXES; i++) {
      context.beginPath();
      context.arc(first + i * step, centreY, hexSize * OVERLAY.pathDotRadius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    // Where the turns end: evenly spaced along the run, the last of them the
    // destination. The board's spacing is whatever the ground charges per step
    // — it is never even — and pretending otherwise here is the honest
    // simplification, because what this stall asks is whether four medallions
    // in a row can be told apart, not how far a warrior walks on grass.
    const rest = (STALL_HEXES - 1) / (STALL_TURNS.length - 1);
    STALL_TURNS.forEach((turn, index) => {
      const last = index === STALL_TURNS.length - 1;
      this.blit(
        context,
        turn,
        first + Math.round(index * rest) * step,
        centreY,
        hexSize * this.scale * (last ? OVERLAY.medallionDestinationScale : 1),
        opacity,
      );
    });

    context.save();
    context.globalAlpha = 0.8;
    context.fillStyle = hex(OVERLAY.pathColor);
    context.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    context.textBaseline = 'middle';
    context.fillText(label, first + STALL_HEXES * step, centreY);
    context.restore();
  }

  /** One medallion, out of the atlas, at the opacity its route is drawn in. */
  private blit(
    context: CanvasRenderingContext2D,
    turn: number,
    cx: number,
    cy: number,
    size: number,
    opacity: number,
  ): void {
    if (!this.atlas) return;
    const layout = tileAtlasSize();
    const index = tileIconIndex({ set: 'medallion', id: medallionIdFor(turn) });
    if (index < 0) return;
    const origin = badgeCellOrigin(index, layout);
    context.save();
    context.globalAlpha = opacity;
    context.drawImage(
      this.atlas,
      origin.x,
      origin.y,
      layout.cell,
      layout.cell,
      cx - size / 2,
      cy - size / 2,
      size,
      size,
    );
    context.restore();
  }
}

/** A pointy-top hexagon, in the phase `hexPrism` builds one in. */
function hexPath(context: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  context.beginPath();
  for (let k = 0; k < 6; k++) {
    const angle = (k * Math.PI) / 3;
    const x = cx + radius * Math.sin(angle);
    const y = cy + radius * Math.cos(angle);
    if (k === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

/**
 * Builds the stall and hands back its handle, so the page can give it the atlas
 * once that has rasterised — `CityStrip`'s and `PartsShelf`'s own arrangement,
 * and for their reason: the atlas is loaded once for the whole page.
 */
export function drawRouteMedallions(into: HTMLElement): RouteStall {
  const stallBlock = block(
    into,
    'A four-turn march',
    'The route’s own dots with a medallion on each hex a turn ends on, at board scale. The top run is the route under the cursor, the bottom one a route the piece is already walking — the same two voices the board draws, at overlay.medallionOpacity and overlay.medallionQuietOpacity. The destination’s is larger by medallionDestinationScale, which is the route dots’ own rule.',
  );
  const canvas = element('canvas', 'route-canvas');
  stallBlock.append(canvas);
  const stall = new RouteStall(canvas);

  const knobs = controls(stallBlock);
  slider(
    knobs,
    'size',
    { min: 0.3, max: 1, step: 0.02, value: OVERLAY.medallionScale },
    (value) => `${value.toFixed(2)}×hex`,
    (value) => stall.setScale(value),
  );
  return stall;
}
