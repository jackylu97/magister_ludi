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
 * So there are three situations:
 *
 *   1. **The pointer rests on a city on the main map.** Each worked hex has
 *      one outline a little smaller than the hex. A pinned hex has two. No
 *      shade and no tokens. `overlays.ts` draws these with `citizenOutlines`.
 *   2. **A city screen is open and Manage citizens is off.** The ground the
 *      city does not work is set back a little, in the painted board's own
 *      materials, and each worked hex keeps the sun and has a warm rim inside
 *      its edge (`SET_BACK_PAINT` in `paintedFogLook.ts`; this file only says
 *      which hex is which, `citizenGroundKinds`). The yields of the city's
 *      hexes show. No outline, and a click does not pin. A pinned hex looks like a worked hex. The user
 *      removed the tokens that an earlier round put here.
 *   3. **Manage citizens is on.** The outlines of 1. The ground is set back
 *      fully and the rim is fainter. Another town's hex has that town's name
 *      in the city banner's face.
 *
 * **The outline** is the movement range's ink (`frontierRibbon`): joined at
 * the corners, in a neutral parchment colour over a faint dark backing. Its
 * corners are rounded so that it reads as drawn and not as a selection box.
 * It is inset so that a gap of ground shows between it and the territory
 * border. It is level, at the mean height of the ground under it: a ring laid
 * over a hill's slopes came out bent, and a ring at the height of the hex's
 * centre stood above the ground and looked shifted up the screen.
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
   * The marks of the Manage citizens mode: the outlines, the names, and (on
   * the toon board) the fallback wash. With the mode off this draws nothing.
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

    const worked: Cell[] = [], pinned: Cell[] = [];
    for (const [cell, tile] of map.tiles.entries()) {
      const kind = cells.kinds.get(cell) ?? 'unavailable';
      if (kind === 'centre') continue;
      if (kind === 'worked' || kind === 'pinned') {
        worked.push(tile);
        if (kind === 'pinned') pinned.push(tile);
        continue;
      }
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
    for (const strip of citizenOutlines(map, worked, pinned)) {
      collector.add(this.keep(strip.geometry), [strip.color], matrix.identity(), { onTop: true, opacity: strip.opacity, order: strip.order });
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
