import { CanvasTexture, CircleGeometry, DoubleSide, Group, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3 } from 'three';
import { assignableTiles, takeableTiles } from '../sim/cities';
import type { City, GameState } from '../sim/state';
import { knowsCell, type FogLevels } from './fog3d';
import { hexDecal, hexRing } from './geometry';
import { disposeInstancedGroup, InstanceCollector, RENDER_ORDER } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { playerPieceColor, VIEW3D } from './lookData';
import type { MaterialLibrary } from './toon';

const ART = VIEW3D.territory.citizens;
type Kind = 'centre' | 'worked' | 'pinned' | 'free' | 'unavailable';
type CitizenCells = ReturnType<typeof citizenCells>;

/** A spare hex in another town can be pinned here. Its current worker, if any, stays visible until the player does that. */
export function citizenCells(state: GameState, city: City, levels: FogLevels) {
  const map = state.map;
  const index = (cell: { col: number; row: number }) => cell.row * map.width + cell.col;
  const known = (tile: { col: number; row: number }) => knowsCell(levels, map, tile.col, tile.row);
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

function stamp(name: string | null, ink: number): { material: MeshBasicMaterial; aspect: number } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const font = 'italic 38px Georgia, serif';
  ctx.font = font;
  canvas.width = name === null ? 56 : Math.ceil(ctx.measureText(name).width) + 18;
  canvas.height = 56;
  if (name === null) {
    ctx.strokeStyle = '#f6edda'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(28, 23, 12, Math.PI, 0); ctx.lineTo(40, 34); ctx.stroke();
    ctx.strokeStyle = '#' + ink.toString(16).padStart(6, '0'); ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#f6edda'; ctx.fillRect(7, 23, 42, 31);
    ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(9, 25, 38, 27);
  } else {
    ctx.fillStyle = '#f6edda'; ctx.strokeStyle = '#28221e'; ctx.lineWidth = 3;
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(name, canvas.width / 2, 28); ctx.fillText(name, canvas.width / 2, 28);
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  return { material: new MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: DoubleSide }), aspect: canvas.width / canvas.height };
}

/** Keep the board-wide shade separate from hover marks and yield figures. A changed income can reuse the same shapes. */
export class CitizenMarks {
  readonly group = new Group();
  private map: GameState['map'] | null = null;
  private signature = '';
  private readonly wash = hexDecal(VIEW3D.board.hexRadius);
  private readonly edge = hexRing(ART.outlineRadius, ART.edgeWidth);
  private readonly line = hexRing(ART.outlineRadius - ART.edgeInset, ART.lineWidth);
  private readonly dot = new CircleGeometry(1, 24);
  private readonly paper = new PlaneGeometry(1, 1);
  private readonly stamps = new Map<string, ReturnType<typeof stamp>>();

  update(state: GameState, city: City, cells: CitizenCells, dots: boolean, facing: Quaternion, materials: MaterialLibrary): void {
    const map = state.map;
    const ink = playerPieceColor(state.players[city.ownerId]?.color ?? '', city.ownerId);
    const signature = JSON.stringify([city.id, dots, ink, facing.toArray(), [...cells.kinds], [...cells.names]]);
    if (this.map === map && this.signature === signature) return;
    this.clear(); this.map = map; this.signature = signature;
    const period = wrapWidth(map), collector = new InstanceCollector({ copyOffsets: [-period, 0, period] });
    const flat = new Quaternion(), matrix = new Matrix4(), up = new Vector3(0, 1, 0).applyQuaternion(facing);
    const position = new Vector3(), scale = new Vector3(1, 1, 1);
    const paint = (geo: typeof this.dot | typeof this.edge, color: number, opacity: number, order: number, q = flat) =>
      collector.add(geo, [color], matrix.compose(position, q, scale), { onTop: true, opacity, order });
    const print = (name: string | null, size: number) => {
      const key = JSON.stringify(name);
      if (!this.stamps.has(key)) this.stamps.set(key, stamp(name, ink));
      const entry = this.stamps.get(key);
      if (!entry) return;
      scale.set(size * entry.aspect, size, 1);
      collector.add(this.paper, [], matrix.compose(position, facing, scale), { material: entry.material, order: RENDER_ORDER.tileIcon });
    };
    for (const [cell, tile] of map.tiles.entries()) {
      const kind = cells.kinds.get(cell) ?? 'unavailable';
      if (kind === 'centre') continue;
      const c = cellCenter(tile.col, tile.row);
      position.set(c.x, tileTopY(tile) + VIEW3D.overlay.lift, c.z); scale.set(1, 1, 1);
      if (kind === 'unavailable' || kind === 'free') {
        paint(this.wash, ART.ink, kind === 'free' ? ART.freeOpacity : ART.darkOpacity, RENDER_ORDER.onTop - 3);
        const name = cells.names.get(cell);
        if (name) print(name, ART.nameHeight);
        continue;
      }
      const pinned = kind === 'pinned';
      paint(this.edge, ART.ink, 1, RENDER_ORDER.onTop - 2);
      const color = pinned ? ink : VIEW3D.territory.workedColor;
      paint(this.line, color, 1, RENDER_ORDER.onTop - 1);
      position.addScaledVector(up, ART.markOffset);
      if (dots) {
        scale.setScalar(ART.dotRadius);
        paint(this.dot, ART.ink, 1, RENDER_ORDER.tileIcon, facing);
        scale.setScalar(ART.dotRadius - ART.dotEdge);
        paint(this.dot, color, 1, RENDER_ORDER.tileIcon + .1, facing);
      } else if (pinned) print(null, ART.lockHeight);
    }
    collector.flush(this.group, materials, false);
  }

  clear(): void {
    if (!this.map) return;
    this.map = null; this.signature = '';
    disposeInstancedGroup(this.group);
    for (const entry of this.stamps.values()) { entry?.material.map?.dispose(); entry?.material.dispose(); }
    this.stamps.clear();
  }
  dispose(): void {
    this.clear();
    for (const shape of [this.wash, this.edge, this.line, this.dot, this.paper]) shape.dispose();
  }
}
