/**
 * Section 7: the marginalia, on the vellum, as the atlas actually rasterises
 * them.
 *
 * The serpent and the inscription are the two things in this game hardest to
 * look at on purpose. They are drawn *only* on hidden hexes, only where a whole
 * disc of `fog.serpentRegion` around them is also hidden, and each is rolled
 * per tile at a few percent — so seeing one takes a fresh map, a wide ocean and
 * some luck, and seeing it *close enough to read* means zooming into a part of
 * the board there is otherwise no reason to visit. Then it disappears, which is
 * the point of it: the world drawn in over the monsters is what the chart-table
 * fog is for.
 *
 * A 2D canvas, and why that is the faithful choice here
 * ----------------------------------------------------
 * The board draws these as textured quads out of `TileIcons`' atlas, and the
 * atlas is a **2D canvas** — every mark on it is traced or set by
 * `badges3d.ts`'s own painters. So this swatch does not reproduce anything: it
 * loads the real atlas, finds the two cells by `tileIconIndex`, and blits them
 * onto a patch of `fog.chartColor`. What you are looking at is the same pixels
 * the renderer samples, at a size you can read, which is exactly what a three-
 * dimensional scene here would have made harder rather than easier.
 *
 * The sizes are the data's own: `fog.serpentSize` and `fog.draconesSize` are
 * fractions of the hex radius, so the inscription being the larger of the two —
 * it is *words*, and a two-line plate at the serpent's size is a smudge — is a
 * relationship this page inherits rather than invents.
 */

import {
  TileIcons,
  badgeCellOrigin,
  tileAtlasSize,
  tileIconIndex,
} from '../render3d/badges3d';
import { VIEW3D } from '../render3d/lookData';
import { DRACONES_LINES } from '../art/marginaliaMarks';
import { element } from './sheet';

const FOG = VIEW3D.fog;
const ICONS = VIEW3D.icons;

/** A `#rrggbb` string for a palette entry. */
function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * How wide one hex is on screen at the default zoom, in CSS pixels.
 *
 * An approximation, and the only number on this page that is one: the board's
 * hex is a world-space radius under an orthographic camera whose frustum is a
 * function of the window, so "game zoom" is a range rather than a value. 64 is
 * the middle of that range on a laptop, which is enough for the question this
 * swatch asks — *can the inscription be read at all at board scale* — and the
 * 2× swatch beside it is what settles what it says.
 */
const HEX_AT_GAME_ZOOM = 64;

/**
 * One vellum swatch with the two marginalia on it, at `scale × game zoom`.
 *
 * Drawn at the device's own pixel ratio and then sized down in CSS, so the
 * inscription is as crisp here as it is on the board — a swatch about
 * legibility that was itself resampled would be measuring the wrong thing.
 */
function swatch(atlas: CanvasImageSource, scale: number): HTMLCanvasElement {
  const layout = tileAtlasSize();
  const hexSize = HEX_AT_GAME_ZOOM * scale;
  const width = Math.round(hexSize * 4.2);
  const height = Math.round(hexSize * 2.1);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = element('canvas', 'chart-swatch');
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.scale(ratio, ratio);

  // The blank chart a hidden tile shows. Flat, because it is: `chartOpacity` is
  // 1 and there is no texture on it — the whole of Terra Incognita's look is
  // this tone, the ghost hex ruled on it, and whatever the cartographer drew.
  context.fillStyle = hex(FOG.chartColor);
  context.fillRect(0, 0, width, height);

  // The ghost hex the fog rules on the blank chart, so the marginalia are seen
  // over the grid they actually sit on rather than on a bare rectangle.
  context.strokeStyle = hex(FOG.ghostColor);
  context.globalAlpha = FOG.ghostOpacity;
  context.lineWidth = Math.max(1, hexSize * FOG.ghostWidth);
  for (let i = 0; i < 4; i++) {
    hexPath(context, hexSize * (0.62 + i * 1.05), height / 2, hexSize * FOG.ghostOuter * 0.5);
    context.stroke();
  }
  context.globalAlpha = 1;

  const blit = (id: 'serpent' | 'dracones', cx: number, cy: number, size: number): void => {
    const index = tileIconIndex({ set: 'marginalia', id });
    if (index < 0) return;
    const origin = badgeCellOrigin(index, layout);
    const drawn = hexSize * size;
    context.drawImage(
      atlas,
      origin.x,
      origin.y,
      layout.cell,
      layout.cell,
      cx - drawn / 2,
      cy - drawn / 2,
      drawn,
      drawn,
    );
  };
  blit('serpent', hexSize * 1.15, height / 2, FOG.serpentSize);
  blit('dracones', hexSize * 3.0, height / 2, FOG.draconesSize);
  return canvas;
}

/**
 * The swatch pair, once the atlas has finished rasterising.
 *
 * `TileIcons.load` never rejects — a browser with no 2D context resolves to
 * null — so a null atlas leaves a note rather than an exception, exactly as it
 * leaves the board undressed rather than dead.
 */
export async function drawMarginaliaSwatches(into: HTMLElement): Promise<TileIcons | null> {
  const row = element('div', 'chart-row');
  into.append(row);

  const icons = await TileIcons.load();
  const texture = icons?.material.map ?? null;
  const atlas = texture?.image as CanvasImageSource | undefined;
  if (!atlas) {
    row.append(element('p', 'sheet-note', 'No 2D context: the atlas did not rasterise.'));
    return icons;
  }

  for (const [scale, caption] of [
    [1, 'board scale (~64px to the hex)'],
    [2, '2× — the inscription, read'],
  ] as const) {
    const cell = element('div');
    cell.append(swatch(atlas, scale));
    cell.append(element('p', 'stall-title', caption));
    row.append(cell);
  }
  into.append(inscriptionMeasure());
  return icons;
}

/**
 * How wide the inscription actually sets, against the cell it has to fit in.
 *
 * Measured at runtime rather than written down, for the reason everything else
 * on this page is asked of the game: the answer depends on `icons.
 * inscriptionScale`, on `inscriptionTracking`, and — the part nobody would
 * predict — on **whether the display face has finished loading when the atlas
 * rasterises**, since a fallback serif sets wider than Instrument Serif does.
 *
 * A cell is square and the plate is centred in it (`drawInscriptionCell`), so a
 * line wider than the cell loses half the difference off each end. That is a
 * fact about the shipped atlas rather than about this page — which is exactly
 * the sort of thing an inspection page exists to make visible, and exactly the
 * sort of thing it must not quietly correct.
 */
function inscriptionMeasure(): HTMLElement {
  const note = element('p', 'sheet-note');
  const context = document.createElement('canvas').getContext('2d');
  const layout = tileAtlasSize();
  if (!context) return note;
  const size = Math.round(layout.cell * ICONS.inscriptionScale);
  const tracking = size * ICONS.inscriptionTracking;
  context.font = `${size}px "Instrument Serif", "Fraunces", Georgia, serif`;
  const widthOf = (line: string): number => {
    let width = -tracking;
    for (const letter of line.toUpperCase()) {
      width += context.measureText(letter).width + tracking;
    }
    return width;
  };
  const measured = DRACONES_LINES.map(
    (line) => `${line.toUpperCase()} ${Math.round(widthOf(line))}px`,
  );
  const widest = Math.max(...DRACONES_LINES.map(widthOf));
  note.textContent =
    `Set at ${size}px in a ${layout.cell}px cell: ${measured.join(' · ')}. ` +
    (widest > layout.cell
      ? `The wider line overruns the cell by ${Math.round(widest - layout.cell)}px, ` +
        'and a centred plate loses half of that off each end.'
      : 'Both lines clear the cell.');
  return note;
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
