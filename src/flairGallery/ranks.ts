/**
 * A ranked piece's badge, at the size the board prints it (batch WC3,
 * `docs/flags.md` (rrrrrr) part 3: *"a rank badge on the piece"*).
 *
 * The boss at the badge's corner is the smallest drawn thing a piece carries:
 * one chevron for a Veteran, two for an Elite, on a disc of parchment a little
 * under half the badge's width. The question this stall answers is whether the
 * Elite's two chevrons are still two at that size, and whether the boss reads
 * as part of the badge rather than as a second badge floating beside it.
 *
 * A 2D canvas, for `route.ts`' reason exactly
 * -------------------------------------------
 * Every pixel of the picture is one the game prints itself. The badge's disc is
 * the badge atlas's own cell, printed by `printRoundel` (the garrison row's
 * printer, which calls the board's cell painters). The boss is the tile atlas's
 * own rank cell, found by `tileIconIndex` and blitted from the loaded atlas.
 * The rim is the badge's own band, from `badgeRimInnerFraction`. Where the boss
 * stands and how big it is are the four numbers the board reads
 * (`badges.rankOffsetX`, `rankOffsetY` and `rankDiameter`, measured against
 * `badgeDiameter()` exactly as `rankBossPosition` measures them), and the
 * sliders below write those numbers.
 */

import {
  type BadgeClass,
  type TileIcons,
  badgeCellOrigin,
  badgeDiameter,
  badgeRimInnerFraction,
  tileAtlasSize,
  tileIconIndex,
} from '../render3d/badges3d';
import { badgeClassFor } from '../render3d/board3d';
import { VIEW3D } from '../render3d/lookData';
import type { RankId } from '../sim/ranks';
import type { UnitTypeId } from '../sim/unitData';
import { printRoundel } from '../ui/unitRoundels';
import { block, controls, element, slider } from './sheet';

const BADGE = VIEW3D.badges;

/** A `#rrggbb` string for a palette entry. */
function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * How wide a badge is on screen at the default zoom, in CSS pixels: the same
 * kind of approximation as `route.ts`' hex, and the number that makes "does the
 * boss survive being printed at board size" a question a flat page can answer.
 */
const BADGE_AT_GAME_ZOOM = 40;

/** The pieces the stall lays out: one without a rank, then each rank. */
const PIECES: readonly { type: UnitTypeId; rank: RankId | null; caption: string }[] = [
  { type: 'warrior', rank: null, caption: 'no rank' },
  { type: 'swordsman', rank: 'veteran', caption: 'Veteran' },
  { type: 'archer', rank: 'elite', caption: 'Elite' },
  { type: 'trireme', rank: 'elite', caption: 'Elite, on a hull' },
];

/**
 * The strip: each piece's badge, rimmed in the first seat's ink, with its boss.
 * Redrawn whole on every knob, the route stall's policy: a stall that patched
 * itself could disagree with the numbers it is showing.
 */
class RankStall {
  private readonly context: CanvasRenderingContext2D | null;
  private atlas: CanvasImageSource | null = null;
  private readonly prints = new Map<BadgeClass, HTMLImageElement>();
  private readonly width: number;
  private readonly height: number;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = BADGE_AT_GAME_ZOOM * 2.4 * PIECES.length;
    this.height = BADGE_AT_GAME_ZOOM * 2.2;
    canvas.width = Math.round(this.width * ratio);
    canvas.height = Math.round(this.height * ratio);
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    this.context = canvas.getContext('2d');
    this.context?.scale(ratio, ratio);
    // The badge cells are printed by the garrison row's own printer, which may
    // have to fetch a class icon first; each arrives when it arrives.
    for (const piece of PIECES) {
      const badge = badgeClassFor(piece.type);
      void printRoundel(badge, false).then((uri) => {
        if (uri === null) return;
        const image = new Image();
        image.addEventListener('load', () => {
          this.prints.set(badge, image);
          this.draw();
        });
        image.src = uri;
      });
    }
  }

  /** Hands the stall the loaded tile atlas, which the boss is blitted from. */
  setIcons(icons: TileIcons | null): void {
    const texture = icons?.material.map ?? null;
    this.atlas = (texture?.image as CanvasImageSource | undefined) ?? null;
    this.draw();
  }

  draw(): void {
    const context = this.context;
    if (!context) return;
    context.clearRect(0, 0, this.width, this.height);
    // The ground the board prints a badge over most often: flat grassland.
    context.fillStyle = hex(VIEW3D.terrainColor.grassland);
    context.fillRect(0, 0, this.width, this.height);
    const step = this.width / PIECES.length;
    PIECES.forEach((piece, index) => {
      this.drawBadge(context, step * (index + 0.5), this.height * 0.5, piece);
    });
  }

  private drawBadge(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    piece: (typeof PIECES)[number],
  ): void {
    const size = BADGE_AT_GAME_ZOOM;
    const radius = size / 2;
    const print = this.prints.get(badgeClassFor(piece.type));
    // The disc: the badge cell spans the badge's whole quad, paper and all.
    if (print) context.drawImage(print, cx - radius, cy - radius, size, size);
    // The rim: the band from `badgeRimInnerFraction` out to the quad's edge,
    // in the ink the first seat of an unconfigured roster takes.
    const inner = radius * badgeRimInnerFraction();
    context.strokeStyle = hex(VIEW3D.players.fallbackOrder[0]!);
    context.lineWidth = radius - inner;
    context.beginPath();
    context.arc(cx, cy, (radius + inner) / 2, 0, Math.PI * 2);
    context.stroke();
    // The boss, where `rankBossPosition` puts it: offsets in badge diameters
    // along the camera's right and up (up is minus y on a canvas), and its own
    // width against the badge's, both as the board measures them.
    if (piece.rank === null || this.atlas === null) return;
    const index = tileIconIndex({ set: 'rank', id: piece.rank });
    if (index < 0) return;
    const layout = tileAtlasSize();
    const origin = badgeCellOrigin(index, layout);
    const boss = (size * BADGE.rankDiameter) / badgeDiameter();
    const bx = cx + size * BADGE.rankOffsetX;
    const by = cy - size * BADGE.rankOffsetY;
    context.drawImage(
      this.atlas,
      origin.x,
      origin.y,
      layout.cell,
      layout.cell,
      bx - boss / 2,
      by - boss / 2,
      boss,
      boss,
    );
  }
}

/**
 * Draws the stall into `into` and returns it, so the page can hand it the tile
 * atlas once that has been rasterised (`main.ts`, beside the route stall).
 */
export function drawRankStall(into: HTMLElement): { setIcons(icons: TileIcons | null): void } {
  const root = block(
    into,
    'The rank boss',
    'A ranked piece’s badge at the size the board prints it: nothing for a piece without a rank, one chevron for a Veteran, two for an Elite, at the corner opposite the worker’s charge count. The disc and the boss are the atlases’ own cells; the knobs are the four numbers the board reads.',
  );
  const canvas = element('canvas', 'rank-canvas');
  root.append(canvas);
  const captions = element('ul', 'city-captions');
  for (const piece of PIECES) {
    const item = element('li');
    item.append(element('strong', undefined, piece.type), document.createTextNode(` · ${piece.caption}`));
    captions.append(item);
  }
  root.append(captions);
  const stall = new RankStall(canvas);

  const knobs = controls(root);
  slider(
    knobs,
    'boss size',
    { min: 0.08, max: 0.32, step: 0.005, value: BADGE.rankDiameter },
    (value) => value.toFixed(3),
    (value) => {
      BADGE.rankDiameter = value;
      stall.draw();
    },
  );
  slider(
    knobs,
    'boss across',
    { min: -0.9, max: 0.9, step: 0.02, value: BADGE.rankOffsetX },
    (value) => `${value.toFixed(2)}×badge`,
    (value) => {
      BADGE.rankOffsetX = value;
      stall.draw();
    },
  );
  slider(
    knobs,
    'boss up',
    { min: -0.9, max: 0.9, step: 0.02, value: BADGE.rankOffsetY },
    (value) => `${value.toFixed(2)}×badge`,
    (value) => {
      BADGE.rankOffsetY = value;
      stall.draw();
    },
  );
  return stall;
}
