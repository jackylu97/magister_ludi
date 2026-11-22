import {
  CanvasTexture, DoubleSide, Group, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3,
  type BufferGeometry, type Material, type Texture,
} from 'three';
import { assignableTiles, takeableTiles } from '../sim/cities';
import type { GameMap } from '../sim/map';
import type { City, GameState } from '../sim/state';
import { knowsCell, type FogLevels } from './fog3d';
import { hexDecal } from './geometry';
import { disposeInstancedGroup, InstanceCollector, RENDER_ORDER } from './instances';
import { cellCenter, tileTopY, worldToCell, wrapWidth } from './layout';
import { VIEW3D } from './lookData';
import { frontierRibbon, movementEdges, movementFrontier } from './movementBoundary';
import { samplePaintedWorld } from './paintedSurface';
import type { MaterialLibrary } from './toon';

/*
 * How the board shows which hexes a city's citizens work.
 *
 * The user's ruling, 2026-11-20, after three rounds of pictures: "I like the
 * double outline, i think the seal is a bit busier than the double outline.
 * Could we also have the outline sit a bit lower, it looks a bit weird when
 * its offset like this. My proposal: option 3 when not in the citizen
 * management screen, option 2 when citizen management is active. The inset
 * outlines replace the mouseover effect when you mouse over a city".
 *
 * Then, on eight mocks of other ideas, the user chose idea e, "the yields are
 * the mark" (2026-11-21): "lets do e. i think c may be trying to do too much,
 * i want this to feel unintrusive." So the inset outlines are gone from the
 * city screen and from the pointer on a city, and one mark is used in all
 * three situations:
 *
 *   - **A worked hex**: its yield figures sit on a small parchment plaque
 *     (`plaqueMaterial`).
 *   - **A pinned hex**: the same plaque with a pin head in the seat's colour
 *     at its top edge (`pinHeadMaterial`).
 *   - **A free hex**: its yields print faint with no plaque, and only in the
 *     Manage citizens mode.
 * The lens layer draws all three with the yields (`addYieldGlyphs` in
 * `lens3d.ts`), because the plaque is sized to the figures on it.
 *
 * The three situations:
 *   1. **The pointer rests on a city on the main map.** The plaques of its
 *      worked hexes. No shade.
 *   2. **A city screen is open and Manage citizens is off.** The plaques, and
 *      the ground the city does not work set back a little, in the painted
 *      board's own materials, with a warm rim on each worked hex
 *      (`SET_BACK_PAINT` in `paintedFogLook.ts`; this file only says which
 *      hex is which, `citizenGroundKinds`). A click does not pin.
 *   3. **Manage citizens is on.** The plaques, the faint yields of the free
 *      hexes, and the ground set back fully. Another town's hex has that
 *      town's name in the city banner's face. A click pins or unpins.
 *
 * The outlines are deleted, with their call in `overlays.ts`.
 *
 * The frozen toon board has no painted materials. There situation 3 draws one
 * plain wash decal for each hex (`groundShaded` false).
 *
 * Cost: a few instanced meshes, built only when the signature changes.
 */

const ART = VIEW3D.territory.citizens;
type Kind = 'centre' | 'worked' | 'pinned' | 'free' | 'unavailable';
type CitizenCells = ReturnType<typeof citizenCells>;
type Cell = { col: number; row: number };

/** A spare hex in another town can be pinned here. Its current worker, if any, stays visible until the player does that. */
export function citizenCells(state: GameState, city: City, levels: FogLevels) {
  const map = state.map;
  const index = (cell: Cell) => cell.row * map.width + cell.col;
  const known = (tile: Cell) => knowsCell(levels, map, tile.col, tile.row);
  const kinds = new Map<number, Kind>();
  const names = new Map<number, string>();
  for (const other of state.cities) {
    if (other.id === city.id || other.ownerId !== city.ownerId) continue;
    for (const cell of other.workedTiles) if (known(cell)) names.set(index(cell), other.name);
  }
  for (const tile of assignableTiles(state, city)) if (known(tile)) kinds.set(index(tile), 'free');
  for (const { tile } of takeableTiles(state, city)) {
    if (known(tile) && !names.has(index(tile))) kinds.set(index(tile), 'free');
  }
  const locks = new Set(city.lockedTiles.map(index));
  for (const cell of city.workedTiles) if (known(cell)) kinds.set(index(cell), locks.has(index(cell)) ? 'pinned' : 'worked');
  if (known(city)) kinds.set(index(city), 'centre');
  const yieldTiles = [...kinds].filter(([, kind]) => kind !== 'centre').map(([cell]) => map.tiles[cell]!);
  return { kinds, names, yieldTiles };
}

/** The numbers `PaintedBoard.applySetBack` takes: 0 lit, 1 free, 2 not available, 3 the city's own hex. */
export const GROUND_KIND: Record<Kind, number> = { worked: 0, pinned: 0, free: 1, unavailable: 2, centre: 3 };

/** One number for each cell of the map, for the board's set-back ground. */
export function citizenGroundKinds(map: GameMap, cells: CitizenCells): Uint8Array {
  const ground = new Uint8Array(map.tiles.length).fill(GROUND_KIND.unavailable);
  for (const [cell, kind] of cells.kinds) ground[cell] = GROUND_KIND[kind];
  return ground;
}

// --- the outline around a city's work -------------------------------------------

/** One strip of the outline: a shape, its colour, its opacity, and where it stands in the draw order. */
export interface OutlineStrip { geometry: BufferGeometry; color: number; opacity: number; order: number }

/**
 * **One light outline around the whole of a city's work.**
 *
 * The user, 2026-11-22: "I think we maybe need a light border to show it more
 * clearly, i know we cut it earlier. Is there any way we can do the outline in
 * a way thats less noisy, maybe we do an outline around the entire area so
 * that shared borders between hexes are not outlined? I think pinned tiles
 * dont need a special outline."
 *
 * So the outline is the edge of the union of `cells` (the worked hexes, the
 * pinned hexes and the city's own hex). An edge that two of those hexes share
 * is inside the union and is not drawn. Worked hexes that do not touch the
 * rest make an island, and each island has its own outline. A pinned hex has
 * no line of its own.
 *
 * It is the movement range's ink (`movementBoundary.ts`): the edge is traced
 * as closed rings, so the corners join with a mitre and nothing overshoots.
 * Each ring is then moved inward by `outlineInset` of a hex, so that it does
 * not sit on the territory border, and its height is read again from the
 * painted ground under its new place, so that it follows a hill and the shore.
 *
 * Two strips, the pale ink over a faint dark backing. The caller owns the
 * geometries and disposes them. It costs two draws, and it is rebuilt only
 * when the set of hexes changes.
 */
export function workedOutline(map: GameMap, cells: readonly Cell[]): OutlineStrip[] {
  if (cells.length === 0) return [];
  const inside = new Set(cells.map((cell) => cell.row * map.width + (((cell.col % map.width) + map.width) % map.width)));
  const inset = ART.outlineInset * VIEW3D.board.hexRadius;
  const loops = movementFrontier(map, movementEdges(map, cells)).map(({ stations }) => {
    const count = stations.length;
    // The unit normal at each station, as the mitre of the two segments that meet there, and how far the mitre reaches.
    const normals = stations.map((here, i) => {
      const before = stations[(i - 1 + count) % count]!, after = stations[(i + 1) % count]!;
      const a = unit(here.x - before.x, here.z - before.z), b = unit(after.x - here.x, after.z - here.z);
      const m = unit(-(a.z + b.z), a.x + b.x);
      const cos = Math.max(0.5, m.x * -a.z + m.z * a.x);
      return { x: m.x, z: m.z, reach: 1 / cos };
    });
    // Which side of the ring is the city's work. A point a little off the ring on one side is in a worked hex or it is not.
    let votes = 0;
    stations.forEach((here, i) => {
      const n = normals[i]!, probe = worldToCell(map, here.x + n.x * inset, here.z + n.z * inset);
      votes += probe && inside.has(probe.tile.row * map.width + probe.tile.col) ? 1 : -1;
    });
    const side = votes >= 0 ? 1 : -1;
    return {
      stations: stations.map((here, i) => {
        const n = normals[i]!, x = here.x + n.x * n.reach * inset * side, z = here.z + n.z * n.reach * inset * side;
        // The ground under the moved line. A reading a little to each side guards against a seam in the terrain, which reads low.
        let ground: number | undefined;
        for (const [dx, dz] of [[0, 0], [n.x * 0.02, n.z * 0.02], [-n.z * 0.02, n.x * 0.02], [n.z * 0.02, -n.x * 0.02]] as const) {
          const read = samplePaintedWorld(map, x + dx, z + dz);
          if (read !== undefined && (ground === undefined || read > ground)) ground = read;
        }
        return { x, z, y: ground === undefined ? here.y : ground + ART.outlineLift };
      }),
    };
  });
  return [
    { geometry: frontierRibbon(loops, ART.outlineWidth + ART.outlineBackingExtra), color: ART.outlineBacking, opacity: ART.outlineBackingOpacity, order: RENDER_ORDER.onTop + 0.1 },
    { geometry: frontierRibbon(loops, ART.outlineWidth), color: ART.outlineColor, opacity: ART.outlineOpacity, order: RENDER_ORDER.onTop + 0.2 },
  ];
}

function unit(x: number, z: number): { x: number; z: number } {
  const length = Math.hypot(x, z);
  return length > 1e-9 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

// --- the plaque and the pin head ----------------------------------------------

const PLAQUE = ART.plaque;

/**
 * **The plaque**: the small piece of the UI's paper that a worked hex's yield
 * figures sit on (the user, 2026-11-21, on idea e, "the yields are the mark":
 * "lets do e ... i want this to feel unintrusive"). It is paper with a thin
 * ink edge, slightly rounded corners and a soft shadow, `width` by `depth` in
 * board units. It lies flat on the hex under the figures, as they do.
 *
 * One texture for each size. The sizes are rounded up to `plaque.step`, so a
 * city uses a handful of them. Null where there is no canvas (a test).
 */
export function plaqueMaterial(width: number, depth: number): MeshBasicMaterial | null {
  const px = PLAQUE.pixelsPerUnit, margin = Math.ceil(PLAQUE.shadow * px * 1.6);
  const w = Math.round(width * px), h = Math.round(depth * px);
  const made = canvasStamp(w + margin * 2, h + margin * 2, (ctx) => {
    const edge = PLAQUE.edge * px, radius = PLAQUE.radius * px;
    ctx.beginPath(); ctx.roundRect(margin, margin, w, h, radius);
    ctx.shadowColor = css(ART.ink); ctx.shadowBlur = PLAQUE.shadow * px; ctx.shadowOffsetY = PLAQUE.shadow * px * 0.35;
    ctx.globalAlpha = PLAQUE.shadowOpacity; ctx.fillStyle = css(ART.ink); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0; ctx.globalAlpha = 1;
    ctx.fillStyle = css(ART.paper); ctx.fill();
    ctx.beginPath(); ctx.roundRect(margin + edge / 2, margin + edge / 2, w - edge, h - edge, Math.max(0, radius - edge / 2));
    ctx.globalAlpha = PLAQUE.edgeOpacity; ctx.lineWidth = edge; ctx.strokeStyle = css(ART.ink); ctx.stroke();
  });
  return made ? made.material : null;
}

/** What stands behind a worked hex's yield figures, by variant (`plaque.styles` in `data/view3d.json`). */
export type PlaqueBack = 'paper' | 'scrim' | 'pill' | 'tag';

/**
 * The backing of a plaque variant, `width` by `depth` in board units, in the
 * same quad as `plaqueMaterial` (the paper plaque, variant a).
 *
 * The user, 2026-11-22, on the built paper plaque: "Could we do a couple
 * variations on the yield plaques, they look a bit awkward". So the backing is
 * one of four, chosen by one value in the data:
 *
 *   - `paper`: the plaque as first built, paper with a thin ink edge.
 *   - `scrim`: no paper. A soft dark shape with a feathered edge, so the
 *     figures read on any ground and the ground shows around them.
 *   - `pill`: a low paper bar with fully round ends. On a pinned hex its edge
 *     is the seat's colour (`seat`).
 *   - `tag`: a paper label with a pointed foot at its lower edge, `plaque.foot`
 *     long. The quad is deeper than the paper by the foot, and the foot points
 *     at the hex's centre.
 *
 * The scrim has one strength, `plaque.lensOn.scrimOpacity`, because it shows
 * in one case only: the pointer on a city while the board prints yields on
 * every hex (the user, 2026-11-22: "The dark shading is not great, lets just
 * have it only apply on the mouseover preview when yield lens is on").
 *
 * Null where there is no canvas.
 */
export function plaqueBackMaterial(back: PlaqueBack, width: number, depth: number, seat: number | null = null): MeshBasicMaterial | null {
  if (back === 'paper') return plaqueMaterial(width, depth);
  const px = PLAQUE.pixelsPerUnit, margin = Math.ceil(PLAQUE.shadow * px * 1.6);
  const w = Math.round(width * px), body = Math.round(depth * px), foot = back === 'tag' ? Math.round(PLAQUE.foot * px) : 0;
  const made = canvasStamp(w + margin * 2, body + foot + margin * 2, (ctx) => {
    const edge = PLAQUE.edge * px;
    if (back === 'scrim') {
      ctx.filter = `blur(${Math.max(1, PLAQUE.scrimBlur * px)}px)`;
      ctx.beginPath(); ctx.roundRect(margin, margin, w, body, Math.min(w, body) * 0.35);
      // Laid twice, so that its middle is nearly solid and only its edge is soft.
      ctx.globalAlpha = PLAQUE.lensOn.scrimOpacity; ctx.fillStyle = css(ART.ink); ctx.fill(); ctx.fill();
      return;
    }
    const outline = (inset: number): void => {
      ctx.beginPath();
      if (back === 'pill') { ctx.roundRect(margin + inset, margin + inset, w - inset * 2, body - inset * 2, (body - inset * 2) / 2); return; }
      // The tag: a rounded label, and a foot at the middle of its lower edge.
      const radius = Math.max(0, PLAQUE.radius * px - inset), left = margin + inset, right = margin + w - inset, top = margin + inset, low = margin + body - inset;
      const mid = margin + w / 2, half = Math.min(foot * 0.8, w * 0.22);
      ctx.moveTo(left + radius, top); ctx.arcTo(right, top, right, low, radius); ctx.arcTo(right, low, mid, low, radius);
      ctx.lineTo(mid + half, low); ctx.lineTo(mid, low + foot - inset); ctx.lineTo(mid - half, low);
      ctx.arcTo(left, low, left, top, radius); ctx.arcTo(left, top, right, top, radius); ctx.closePath();
    };
    outline(0);
    ctx.shadowColor = css(ART.ink); ctx.shadowBlur = PLAQUE.shadow * px; ctx.shadowOffsetY = PLAQUE.shadow * px * 0.35;
    ctx.globalAlpha = PLAQUE.shadowOpacity; ctx.fillStyle = css(ART.ink); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0; ctx.globalAlpha = 1;
    ctx.fillStyle = css(ART.paper); ctx.fill();
    if (seat !== null) {
      // The seat's colour as the edge, inside a thin ink line so that a pale seat still has an edge.
      const band = PLAQUE.seatEdge * px;
      outline(band / 2); ctx.lineWidth = band; ctx.strokeStyle = css(seat); ctx.stroke();
      outline(edge / 2); ctx.lineWidth = edge; ctx.globalAlpha = 0.85; ctx.strokeStyle = css(ART.ink); ctx.stroke();
    } else {
      outline(edge / 2); ctx.globalAlpha = PLAQUE.edgeOpacity; ctx.lineWidth = edge; ctx.strokeStyle = css(ART.ink); ctx.stroke();
    }
  });
  return made ? made.material : null;
}

/** How much wider and deeper than the plaque its quad is: the room its shadow takes on each side, in board units. */
export function plaqueMargin(): number {
  return Math.ceil(PLAQUE.shadow * PLAQUE.pixelsPerUnit * 1.6) / PLAQUE.pixelsPerUnit;
}

/**
 * **The pin head** on a pinned hex's plaque: a round head in the seat's
 * colour, with a dark rim and a small highlight, so that it reads on a pale
 * seat colour and on pale paper. Null where there is no canvas.
 */
export function pinHeadMaterial(seat: number): MeshBasicMaterial | null {
  const made = canvasStamp(64, 64, (ctx) => {
    const r = 32 * (1 - PLAQUE.pinRim) - 3;
    ctx.beginPath(); ctx.arc(32, 32, r, 0, Math.PI * 2);
    ctx.shadowColor = css(ART.ink); ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    ctx.fillStyle = css(seat); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0;
    ctx.lineWidth = 32 * PLAQUE.pinRim; ctx.strokeStyle = css(ART.ink); ctx.stroke();
    ctx.beginPath(); ctx.arc(32 - r * 0.32, 32 - r * 0.34, r * PLAQUE.pinShine, 0, Math.PI * 2);
    ctx.globalAlpha = 0.6; ctx.fillStyle = css(ART.paper); ctx.fill();
  });
  return made ? made.material : null;
}

// --- the names -------------------------------------------------

const css = (color: number): string => '#' + color.toString(16).padStart(6, '0');

/** A flat readout drawn over everything, as the yield figures are. */
function canvasStamp(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): { material: MeshBasicMaterial; aspect: number } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  return {
    material: new MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: DoubleSide, forceSinglePass: true }),
    aspect: width / height,
  };
}

/** Another town's name on a hex that town works, in the city banner's face (`.city-banner-name`). */
function nameStamp(name: string, paper: number, ink: number) {
  const font = "600 40px Fraunces, Georgia, 'Iowan Old Style', serif";
  let width = 64;
  if (typeof document !== 'undefined') {
    const probe = document.createElement('canvas').getContext('2d');
    if (probe) { probe.font = font; width = Math.ceil(probe.measureText(name).width) + 40; }
  }
  return canvasStamp(width, 76, (ctx) => {
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = css(paper); ctx.shadowColor = css(ink); ctx.shadowBlur = 10;
    for (let pass = 0; pass < 3; pass++) ctx.fillText(name, width / 2, 38);
    ctx.shadowColor = 'transparent'; ctx.fillText(name, width / 2, 38);
  });
}

/** Keep these marks separate from hover marks and yield figures. A changed income can reuse the same shapes. */
export class CitizenMarks {
  readonly group = new Group();
  private map: GameMap | null = null;
  private signature = '';
  /** Everything one build made. `clear` disposes all of it. */
  private owned: (BufferGeometry | Material | Texture)[] = [];

  private keep<T extends BufferGeometry | Material | Texture>(thing: T): T { this.owned.push(thing); return thing; }

  /**
   * The marks of the Manage citizens mode that are not yields: the other
   * towns' names, and (on the toon board) the fallback wash. With the mode off
   * this draws nothing. The plaques are the lens layer's, with the yields.
   *
   * `groundShaded` says that the painted board sets the ground back itself
   * (`citizenGroundKinds`). When it is false the mode draws a wash decal on
   * each hex, which is the frozen toon board's fallback.
   */
  update(
    state: GameState, city: City, cells: CitizenCells, facing: Quaternion,
    materials: MaterialLibrary, manage: boolean, groundShaded: boolean,
  ): void {
    if (!manage) { this.clear(); return; }
    const map = state.map;
    const signature = JSON.stringify([city.id, groundShaded, facing.toArray(), [...cells.kinds], [...cells.names], ART]);
    if (this.map === map && this.signature === signature) return;
    this.clear(); this.map = map; this.signature = signature;

    const period = wrapWidth(map), collector = new InstanceCollector({ copyOffsets: [-period, 0, period] });
    const flatTurn = new Quaternion(), matrix = new Matrix4(), position = new Vector3();
    const scale = new Vector3(1, 1, 1), one = new Vector3(1, 1, 1);

    const paper = this.keep(new PlaneGeometry(1, 1));
    const wash = groundShaded ? null : this.keep(hexDecal(VIEW3D.board.hexRadius));
    const stamps = new Map<string, ReturnType<typeof canvasStamp>>();

    for (const [cell, tile] of map.tiles.entries()) {
      const kind = cells.kinds.get(cell) ?? 'unavailable';
      if (kind === 'centre' || kind === 'worked' || kind === 'pinned') continue;
      const c = cellCenter(tile.col, tile.row);
      position.set(c.x, tileTopY(tile) + VIEW3D.overlay.lift, c.z);
      if (wash) {
        collector.add(wash, [ART.ink], matrix.compose(position, flatTurn, one), {
          onTop: true, opacity: kind === 'free' ? ART.fallbackFreeOpacity : ART.fallbackFarOpacity, order: RENDER_ORDER.onTop - 3,
        });
      }
      const name = cells.names.get(cell);
      if (!name) continue;
      if (!stamps.has(name)) {
        const made = nameStamp(name, ART.paper, ART.ink);
        if (made) { this.keep(made.material.map!); this.keep(made.material); }
        stamps.set(name, made);
      }
      const label = stamps.get(name);
      if (!label) continue;
      scale.set(ART.nameHeight * label.aspect, ART.nameHeight, 1);
      collector.add(paper, [], matrix.compose(position, facing, scale), { material: label.material, order: RENDER_ORDER.tileIcon });
    }
    collector.flush(this.group, materials, false);
  }

  clear(): void {
    if (!this.map) return;
    this.map = null; this.signature = '';
    disposeInstancedGroup(this.group);
    for (const thing of this.owned) thing.dispose();
    this.owned = [];
  }
  dispose(): void { this.clear(); }
}
