import {
  BufferGeometry, Color, DataTexture, DoubleSide, Float32BufferAttribute, Group, LinearFilter,
  Mesh, MeshBasicMaterial, SRGBColorSpace,
} from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GameMap, Tile } from '../sim/map';
import type { PaintedWorksEntry } from './paintedWorks';
import type { GameState } from '../sim/state';
import { VISIBLE } from '../sim/visibility';
import { createPaintedMotes, type PaintedMote } from './paintedYieldLight';
import { hashUnit } from './hash';
import { VIEW3D } from './lookData';
import { createTileSurfaceSampler } from './paintedTileSurface';
// @ts-expect-error The painted terrain kit is JavaScript.
import { centre, isWater, WATER_LEVEL } from '../terrainStudy/surface.js';
// @ts-expect-error The painted terrain kit is JavaScript.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';
// @ts-expect-error The board shares its farm layout with the terrain study.
import { northStarFarmPlan } from '../terrainStudy/northStarWorks.js';

/** A soft, broken edge exposes the terrain and keeps adjoining tiles distinct. */
function ashTexture(water: boolean): DataTexture {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  const noise = new ImprovedNoise();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + .5) / size * 2 - 1;
      const v = (y + .5) / size * 2 - 1;
      // Cover the footprint continuously. Only the outer edge takes the brush shape.
      const broad = noise.noise(u * 2.7, v * 2.2, 3.74);
      const distance = Math.hypot(u * .94 + v * .12, v * (water ? 1.75 : 1.19));
      const edge = Math.max(0, Math.min(1, (.93 - distance + .24 * broad) / .52));
      const coverage = edge * edge * (3 - 2 * edge);
      const pigment = 8 * broad;
      const index = (y * size + x) * 4;
      pixels[index] = (water ? 103 : 114) + pigment;
      pixels[index + 1] = (water ? 126 : 103) + pigment;
      pixels[index + 2] = (water ? 127 : 89) + pigment;
      pixels[index + 3] = coverage * (water ? 100 : 148);
    }
  }
  const texture = new DataTexture(pixels, size, size);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const emberColors = ['#ec6131', '#ffa244', '#ffe095'].map(ink => new Color(ink));

type DamagedWork = NonNullable<PaintedWorksEntry['damage']>;

function makeSite(painted: Tile, work: DamagedWork) {
  const wet = isWater(painted);
  const [top, skirt] = terrainMesh(painted) as [BufferGeometry, BufferGeometry];
  skirt.dispose();
  const center = centre(painted);
  const anchor = work === 'pasture' ? [.21, -.27] : work === 'mine' ? [.06, .08] : [.12, .1];
  let anchorX = anchor[0]!, anchorZ = anchor[1]!;
  if (work === 'farm') {
    const { yard } = northStarFarmPlan(painted, VIEW3D.visualTest.works) as { yard?: [number, number][] };
    if (yard?.length) {
      anchorX = yard.reduce((sum, point) => sum + point[0], 0) / yard.length;
      anchorZ = yard.reduce((sum, point) => sum + point[1], 0) / yard.length;
    }
  }
  const positions = top.getAttribute('position');
  const uv: number[] = [];
  const angle = hashUnit(painted.col, painted.row, 172) * Math.PI * 2;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  for (let i = 0; i < positions.count; i++) {
    const dx = positions.getX(i) - center.x - anchorX, dz = positions.getZ(i) - center.z - anchorZ;
    uv.push(.5 + (dx * cos + dz * sin) * .72, .5 + (dz * cos - dx * sin) * .72);
    positions.setY(i, wet ? WATER_LEVEL + .014 : positions.getY(i) + .018);
  }
  top.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return { top, wet, center, anchorX, anchorZ, work };
}

type Site = ReturnType<typeof makeSite> & { motes?: PaintedMote[] };

/** Old damage needs only the ash surface when a save loads or a tile comes into view. */
function makeMotes(painted: Tile, { top, center, anchorX, anchorZ }: Site): PaintedMote[] {
  const motes: PaintedMote[] = [];

  const height = createTileSurfaceSampler(top, center.x, center.z);
  // Two low lights join the rising marks to the exposed timber.
  for (const offset of [-.10, .13]) {
    const dx = anchorX + offset, dz = anchorZ + .16;
    motes.push({ x: center.x + dx, y: (height(dx, dz) ?? 0) + .15, z: center.z + dz,
      mode: 'glow', size: .30, phase: .3 + offset, rnd: .4, strength: .85, color: emberColors[1]! });
  }
  for (let i = 0; i < 13; i++) {
    const t = i * 2.399 + painted.col;
    const dx = anchorX + .12 + Math.cos(t) * (.13 + i * .013);
    const dz = anchorZ + .16 + Math.sin(t) * (.12 + i * .009);
    const surfaceY = height(dx, dz);
    if (surfaceY === undefined) continue;
    const rnd = hashUnit(painted.col, painted.row, i + 71);
    motes.push({
      mode: i < 5 ? 'spark' : i < 8 ? 'hot' : 'matte',
      x: center.x + dx, y: surfaceY + .09 + rnd * .19, z: center.z + dz,
      size: VIEW3D.visualTest.yieldLight.d.moteSize[2]! * (i < 5 ? 1.8 : .88 + rnd * .44),
      phase: (i + rnd) / 13, rnd, strength: VIEW3D.visualTest.yieldLight.d.moteOpacity,
      color: emberColors[i % emberColors.length]!,
    });
  }
  return motes;
}

/** The board already places the works. Only changes to damaged sites rebuild these batches. */
export class PaintedPillageLayer {
  readonly group = new Group();
  readonly ash = new Group();
  readonly fire = new Group();
  private terrain?: GameMap;
  private sites = new Map<number, Site>();
  private ashMeshes: Mesh[] = [];
  private fireMesh?: ReturnType<typeof createPaintedMotes>;
  private materials = new Map<boolean, MeshBasicMaterial>();
  private burning: Site[] = [];
  private turn = -1;

  constructor() {
    this.group.name = 'pillaged-ground-and-embers';
    this.group.add(this.ash, this.fire);
  }

  private material(wet: boolean) {
    let material = this.materials.get(wet);
    if (!material) {
      material = new MeshBasicMaterial({ map: ashTexture(wet), transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, side: DoubleSide });
      material.forceSinglePass = true;
      this.materials.set(wet, material);
    }
    return material;
  }

  /** A change of turn removes last turn's embers without touching the ground geometry. */
  expire(turn: number): void {
    if (this.turn !== turn && this.burning.length) {
      for (const site of this.burning) delete site.motes;
      this.clearFire();
    }
  }

  update(state: GameState, prepared: GameMap, entries: readonly PaintedWorksEntry[]): void {
    const newMap = this.terrain !== prepared;
    if (newMap) { this.clearSites(); this.terrain = prepared; }
    if (!entries.length && !this.sites.size) return;
    const visible = entries.filter(entry => entry.damage && entry.level === VISIBLE);
    if (!visible.length && !this.sites.size) return;
    const period = Math.sqrt(3) * prepared.width;
    const next = new Map<number, Site>();
    const burning: Site[] = [];
    let moved = newMap || visible.length !== this.sites.size;
    for (const { cell, damage } of visible) {
      const previous = this.sites.get(cell);
      let site = previous;
      if (!site || site.work !== damage) {
        site = makeSite(prepared.tiles[cell]!, damage!);
        moved = true;
      }
      next.set(cell, site);
      if (!site.wet && state.map.tiles[cell]?.damagedImprovement?.pillagedOn === state.turn) {
        site.motes ??= makeMotes(prepared.tiles[cell]!, site);
        burning.push(site);
      }
    }
    for (const [cell, old] of this.sites) if (old !== next.get(cell)) old.top.dispose();
    this.sites = next;

    if (moved) {
      this.clearAsh();
      for (const wet of [false, true]) {
        const parts = [...next.values()].filter(site => site.wet === wet).map(site => site.top);
        if (!parts.length) continue;
        const mesh = new Mesh(mergeGeometries(parts)!, this.material(wet));
        mesh.geometry.computeBoundingSphere();
        mesh.renderOrder = 1;
        this.addCopies(mesh, this.ash, period);
        this.ashMeshes.push(mesh);
      }
    }
    if (burning.length !== this.burning.length || burning.some((site, i) => site !== this.burning[i])) {
      this.clearFire();
      this.burning = burning;
      if (burning.length) {
        this.fireMesh = createPaintedMotes(burning.flatMap(site => site.motes!));
        this.addCopies(this.fireMesh, this.fire, period);
      }
    }
    this.turn = state.turn;
  }

  private addCopies(mesh: Mesh, group: Group, period: number): void {
    for (const offset of [-period, 0, period]) {
      const copy = offset === 0 ? mesh : mesh.clone();
      copy.position.x = offset;
      group.add(copy);
    }
  }

  private clearFire(): void {
    this.fire.clear();
    this.fireMesh?.geometry.dispose();
    this.fireMesh?.material.dispose();
    this.fireMesh = undefined;
    this.burning = [];
  }

  private clearAsh(): void {
    this.ash.clear();
    for (const mesh of this.ashMeshes) mesh.geometry.dispose();
    this.ashMeshes = [];
  }

  private clearSites(): void {
    this.clearAsh();
    this.clearFire();
    for (const site of this.sites.values()) site.top.dispose();
    this.sites.clear();
  }

  dispose(): void {
    this.clearSites();
    for (const material of this.materials.values()) { material.map?.dispose(); material.dispose(); }
    this.materials.clear();
    this.group.removeFromParent();
  }
}
