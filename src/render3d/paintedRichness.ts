/**
 * Yields on the board (the visual test of 2026-11-12, `docs/flags.md` item
 * (nnnnnnn), "Yields on the board"). The user: "can we have some visual
 * representation of a tile having more yields? i think that would add a lot
 * to the game".
 *
 * A hex the seat watches shows how rich it is, in three steps, by its
 * strongest yield: sheaves for food, timber and cut stone for production, a
 * market stall for gold. A hex at the third step also gives off a few slow
 * motes of light in that yield's colour.
 *
 * The yield is the one the yields lens prints (`seenTileYields`), so a
 * resource the seat cannot name adds nothing here. The steps and sizes are
 * `visualTest.richness` in `data/view3d.json`.
 *
 * One instanced mesh for each kind of scenery and one for the motes, each
 * drawn once for each wrap copy. Nothing moves on the CPU: the motes rise in
 * the vertex shader from the shared clock. The layer is built with the works
 * layer, and not on a frame.
 */

import {
  type BufferGeometry, Color, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicMaterial,
  type MeshStandardMaterial, Quaternion, Vector3,
} from 'three';

import type { GameMap } from '../sim/map';
import type { GameState } from '../sim/state';
import { VISIBLE } from '../sim/visibility';
// @ts-expect-error The surface module is plain JavaScript with no declaration file.
import { centre, onTileTop, surfaceHeight } from '../terrainStudy/surface.js';
import { type FogLevels, levelAt } from './fog3d';
import { hashUnit } from './hash';
import { seenTileYields } from './lens3d';
import { VIEW3D } from './lookData';
import { declareUniforms, shareUniforms } from './visualTestLook';

const RICH = VIEW3D.visualTest.richness;
const MOTE_UNIFORMS = ['vtestTime', 'vtestIdle'] as const;
const KINDS = ['food', 'production', 'gold'] as const;
type Kind = typeof KINDS[number];
const MODEL: Record<Kind, string> = { food: 'ns-sheaf', production: 'ns-logs', gold: 'ns-stall' };
const WATER = new Set(['ocean', 'coast', 'lake']);

type Assets = { material: MeshStandardMaterial } & Record<string, BufferGeometry | MeshStandardMaterial | undefined>;

/** How rich a yield is: the number of `steps` it reaches, 0 to 3. */
export function richnessStep(amount: number, steps: readonly number[]): number {
  let step = 0;
  for (const at of steps) if (amount >= at) step++;
  return step;
}

/** A hex's strongest kind and its step, or null when no kind reaches the first step. */
export function richestKind(yields: Record<Kind, number>): { kind: Kind; step: number } | null {
  let best: { kind: Kind; step: number; share: number } | null = null;
  for (const kind of KINDS) {
    const steps = RICH.steps[kind], step = richnessStep(yields[kind], steps), share = yields[kind] / steps[steps.length - 1]!;
    if (step > 0 && (!best || step > best.step || (step === best.step && share > best.share))) best = { kind, step, share };
  }
  return best;
}

export class PaintedRichnessLayer {
  readonly group = new Group();
  private readonly moteMaterial: MeshBasicMaterial;
  private moteGeometry: IcosahedronGeometry | null = null;
  private meshes: InstancedMesh[] = [];
  /**
   * Hexes that show a stated kind and step whatever their yield, by cell. Only
   * the visual test scene sets this, to put one example of every step side by
   * side (the user, 2026-11-12: "please add some tiles with examples of all
   * first/second/third step tiles"). The game never does.
   */
  showcase: ReadonlyMap<number, { kind: Kind; step: number }> | null = null;

  constructor(private readonly assets: Assets) {
    this.group.name = 'painted-richness';
    this.moteMaterial = new MeshBasicMaterial({ color: 0xffffff });
    const rise = RICH.moteRise.toFixed(4), speed = RICH.moteSpeed.toFixed(4), size = RICH.moteSize.toFixed(4);
    this.moteMaterial.onBeforeCompile = (shader) => {
      shareUniforms(shader, MOTE_UNIFORMS);
      // x: where in its rise a mote starts; y: a second seed.
      shader.vertexShader = `attribute vec2 moteSeed;\n${declareUniforms(MOTE_UNIFORMS)}\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', `#include <begin_vertex>
float moteAt = fract(vtestTime * ${speed} * (.7 + .6 * moteSeed.y) + moteSeed.x);
transformed *= ${size} * sin(3.14159 * moteAt) * (.7 + .6 * moteSeed.y) * step(.5, vtestIdle);
transformed.y += ${rise} * moteAt;
transformed.x += .05 * sin(vtestTime * .9 + moteSeed.y * 30.0);`);
    };
    this.moteMaterial.customProgramCacheKey = () => 'painted-richness-motes-v1';
  }

  /** `prepared` is the board's own map, whose tiles carry the ground's heights. `period` is the wrap width in world units. */
  build(state: GameState, prepared: GameMap, levels: FogLevels, seat: number, period: number, shadows: boolean): void {
    this.clear();
    // The scenery is one of the ways to show a rich hex. `visualTest.yieldLight.show` picks the way (`paintedYieldLight.ts`).
    if (!RICH.on || VIEW3D.visualTest.yieldLight.show !== 'structures') return;
    const cities = new Set(state.cities.map((city) => city.row * state.map.width + city.col));
    const watched = state.map.tiles.filter((tile, cell) => !WATER.has(tile.terrain) && tile.terrain !== 'mountain' && !cities.has(cell)
      && (this.showcase?.has(cell) || levelAt(levels, state.map, tile.col, tile.row) === VISIBLE));
    const yields = seenTileYields(state, seat, watched);
    const places: Record<Kind, Matrix4[]> = { food: [], production: [], gold: [] };
    const motes: { x: number; y: number; z: number; kind: Kind; seed: [number, number] }[] = [];
    const up = new Vector3(0, 1, 0), turn = new Quaternion();
    const fit: Partial<Record<Kind, number>> = {};
    for (const kind of KINDS) {
      const geometry = this.assets[MODEL[kind]] as BufferGeometry | undefined;
      if (!geometry) continue;
      geometry.computeBoundingBox();
      const span = geometry.boundingBox!.getSize(new Vector3());
      fit[kind] = RICH.size / Math.max(span.x, span.z);
    }
    watched.forEach((original, index) => {
      const rich = this.showcase?.get(original.row * state.map.width + original.col) ?? richestKind(yields[index]!);
      // The scene's examples of science, culture and faith have no scenery: only the light shows those.
      if (!rich || !(KINDS as readonly string[]).includes(rich.kind) || fit[rich.kind] === undefined) return;
      const tile = prepared.tiles[original.row * state.map.width + original.col];
      if (!tile) return;
      const c = centre(tile) as { x: number; z: number };
      const first = hashUnit(tile.col, tile.row, 951) * Math.PI * 2;
      for (let i = 0; i < rich.step; i++) {
        // Round the rim of the hex, clear of the piece that stands in the middle.
        for (const radius of [RICH.radius, RICH.radius * .82, RICH.radius * .66]) {
          const angle = first + i * 2.2 + (hashUnit(tile.col, tile.row, 960 + i) - .5) * .5;
          const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
          if (!onTileTop(tile, x, z, RICH.size * .6)) continue;
          const scale = fit[rich.kind]! * (.9 + hashUnit(tile.col, tile.row, 970 + i) * .25);
          turn.setFromAxisAngle(up, (hashUnit(tile.col, tile.row, 980 + i) - .5) * 1.2);
          places[rich.kind].push(new Matrix4().compose(new Vector3(c.x + x, surfaceHeight(tile, x, z) as number, c.z + z), turn, new Vector3(scale, scale, scale)));
          break;
        }
      }
      if (rich.step < 3) return;
      for (let m = 0; m < RICH.motes; m++) {
        const angle = hashUnit(tile.col, tile.row, 990 + m) * Math.PI * 2, radius = .15 + hashUnit(tile.col, tile.row, 1000 + m) * .45;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        motes.push({ x: c.x + x, y: (surfaceHeight(tile, 0, 0) as number) + .06, z: c.z + z, kind: rich.kind,
          seed: [m / RICH.motes + hashUnit(tile.col, tile.row, 1010) * .5, hashUnit(tile.col, tile.row, 1020 + m)] });
      }
    });
    const add = (mesh: InstancedMesh, cast: boolean): void => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      for (const at of [-period, 0, period]) {
        const copy = at === 0 ? mesh : new InstancedMesh(mesh.geometry, mesh.material, 0);
        if (copy !== mesh) { copy.instanceMatrix = mesh.instanceMatrix; copy.instanceColor = mesh.instanceColor; copy.count = mesh.count; }
        // The layer is small, and the motes move in the shader, so it is never culled.
        copy.frustumCulled = false; copy.castShadow = cast; copy.receiveShadow = cast;
        copy.position.x = at;
        this.group.add(copy); this.meshes.push(copy);
      }
    };
    for (const kind of KINDS) {
      const list = places[kind];
      if (!list.length) continue;
      const mesh = new InstancedMesh(this.assets[MODEL[kind]] as BufferGeometry, this.assets.material, list.length);
      list.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      add(mesh, shadows);
    }
    if (motes.length) {
      const geometry = this.moteGeometry = new IcosahedronGeometry(1, 0);
      const mesh = new InstancedMesh(geometry, this.moteMaterial, motes.length);
      const seeds = new Float32Array(motes.length * 2), matrix = new Matrix4();
      const colours: Record<Kind, Color> = { food: new Color(RICH.colors.food), production: new Color(RICH.colors.production), gold: new Color(RICH.colors.gold) };
      motes.forEach((mote, i) => {
        mesh.setMatrixAt(i, matrix.makeTranslation(mote.x, mote.y, mote.z));
        mesh.setColorAt(i, colours[mote.kind]);
        seeds[i * 2] = mote.seed[0]; seeds[i * 2 + 1] = mote.seed[1];
      });
      geometry.setAttribute('moteSeed', new InstancedBufferAttribute(seeds, 2));
      add(mesh, false);
    }
  }

  private clear(): void {
    for (const mesh of this.meshes) this.group.remove(mesh);
    // The scenery's geometry and material belong to the look; only the instance buffers are this layer's.
    for (const mesh of this.meshes) if (mesh.count > 0 || mesh.material !== this.moteMaterial) mesh.dispose();
    this.meshes = [];
    this.moteGeometry?.dispose(); this.moteGeometry = null;
  }

  dispose(): void { this.clear(); this.moteMaterial.dispose(); }
}
