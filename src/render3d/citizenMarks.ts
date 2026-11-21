import {
  CanvasTexture, DoubleSide, Group, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3,
  type BufferGeometry, type Material, type Texture,
} from 'three';
import { assignableTiles, takeableTiles } from '../sim/cities';
import { getTileAt, type GameMap } from '../sim/map';
import type { City, GameState } from '../sim/state';
import { knowsCell, type FogLevels } from './fog3d';
import { hexDecal } from './geometry';
import { disposeInstancedGroup, InstanceCollector, RENDER_ORDER } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D } from './lookData';
import { frontierRibbon } from './movementBoundary';
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
 * `citizenOutlines` is what the outlines were. `overlays.ts` still imports it
 * and is now handed no hexes; it can be deleted with that call.
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

// --- the outlines -------------------------------------------------------------

const STATIONS_PER_EDGE = 3;

/**
 * One closed, level ring a little inside each of these hexes, for
 * `frontierRibbon`. `round` is the share of each edge's end that the corner's
 * curve takes. The ring's height is the mean of the ground under it, read
 * from the painted terrain, or the hex's top where there is no painted
 * terrain (the toon board, a test).
 */
function insetLoops(map: GameMap, cells: readonly Cell[], inset: number, round: number) {
  const radius = VIEW3D.board.hexRadius * (1 - inset);
  const at = (k: number) => ({ x: radius * Math.sin((k * Math.PI) / 3), z: radius * Math.cos((k * Math.PI) / 3) });
  const mix = (a: { x: number; z: number }, b: { x: number; z: number }, t: number) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  const ring: { x: number; z: number }[] = [];
  for (let k = 0; k < 6; k++) {
    const a = at(k), b = at(k + 1), c = at(k + 2);
    for (let i = 0; i <= STATIONS_PER_EDGE; i++) ring.push(mix(a, b, round + (1 - 2 * round) * (i / STATIONS_PER_EDGE)));
    // The corner at b: a curve from the end of this edge to the start of the next, with b as its control point.
    const from = mix(a, b, 1 - round), to = mix(b, c, round);
    for (const t of [0.25, 0.5, 0.75]) ring.push(mix(mix(from, b, t), mix(b, to, t), t));
  }
  const loops = [];
  for (const cell of cells) {
    const tile = getTileAt(map, cell.col, cell.row);
    if (!tile) continue;
    const centre = cellCenter(tile.col, tile.row);
    let sum = 0, count = 0;
    for (const p of ring) {
      const ground = samplePaintedWorld(map, centre.x + p.x, centre.z + p.z);
      if (ground !== undefined) { sum += ground; count++; }
    }
    const y = (count > 0 ? sum / count : tileTopY(tile)) + ART.outlineLift;
    loops.push({ stations: ring.map((p) => ({ x: centre.x + p.x, z: centre.z + p.z, y })) });
  }
  return loops;
}

/** One strip of the outlines: a shape, its colour, its opacity, and where it stands in the draw order. */
export interface OutlineStrip { geometry: BufferGeometry; color: number; opacity: number; order: number }

/**
 * The outlines of a city's worked hexes: one ring on each worked hex, and a
 * second ring inside the first on each pinned hex. `pinned` is a subset of
 * `worked`. Each ring is two strips, the ink over its dark backing. The caller
 * owns the geometries and disposes them.
 */
export function citizenOutlines(map: GameMap, worked: readonly Cell[], pinned: readonly Cell[]): OutlineStrip[] {
  const strips: OutlineStrip[] = [];
  const rings: [readonly Cell[], number][] = [[worked, ART.outlineInset], [pinned, ART.outlineInset + ART.doubleGap]];
  rings.forEach(([cells, inset], layer) => {
    if (cells.length === 0) return;
    const loops = insetLoops(map, cells, inset, ART.outlineRound);
    strips.push(
      { geometry: frontierRibbon(loops, ART.outlineWidth + ART.outlineBackingExtra), color: ART.outlineBacking, opacity: ART.outlineBackingOpacity, order: RENDER_ORDER.onTop - 2 + layer * 0.2 },
      { geometry: frontierRibbon(loops, ART.outlineWidth), color: ART.outlineColor, opacity: ART.outlineOpacity, order: RENDER_ORDER.onTop - 1.9 + layer * 0.2 },
    );
  });
  return strips;
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
