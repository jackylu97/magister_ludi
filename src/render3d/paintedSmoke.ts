/**
 * Smoke over the towns: part of switch 8 (small idle motion) of the visual
 * test version (batch V1, `visualTest.ts`).
 *
 * A few small faceted puffs rise from each town the seat can see now, grow,
 * drift and shrink away. The whole layer is one instanced mesh, drawn once for
 * each wrap copy, so it costs three draw calls however many towns there are.
 * Nothing moves on the CPU: each puff carries a seed, and the vertex shader
 * places it from the shared clock (`vtestTime`). The layer is built again only
 * when the towns are (`Renderer3D.rebuildCities`), never on a frame.
 *
 * A town on remembered ground has no smoke: smoke would tell the player the
 * town is still there, which is news the fog must not give.
 */

import {
  Color, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshStandardMaterial,
} from 'three';

import type { GameState } from '../sim/state';
import { VISIBLE } from '../sim/visibility';
import { type FogLevels, levelAt } from './fog3d';
import { hashUnit } from './hash';
import { VIEW3D } from './lookData';
import { declareUniforms, shareUniforms } from './visualTestLook';

const IDLE = VIEW3D.visualTest.idle;
const ROOT3 = Math.sqrt(3);
const SMOKE_UNIFORMS = ['vtestTime', 'vtestIdle', 'vtestSmoke'] as const;

type Register = (material: MeshStandardMaterial, options?: { terrain?: boolean }) => unknown;

/** The top of a chimney that smokes, in world units, and the hex it stands on. */
export interface SmokeSource { x: number; y: number; z: number; col: number; row: number }

export class PaintedSmokeLayer {
  readonly group = new Group();
  /** Built again with the layer, because the seeds are an attribute on it. */
  private geometry: IcosahedronGeometry | null = null;
  private readonly material: MeshStandardMaterial;
  private meshes: InstancedMesh[] = [];

  constructor(register: Register) {
    this.group.name = 'painted-smoke';
    this.material = new MeshStandardMaterial({ color: new Color(IDLE.smokeColor), roughness: 1, metalness: 0, flatShading: true });
    register(this.material);
    const previous = this.material.onBeforeCompile, key = this.material.customProgramCacheKey.bind(this.material);
    this.material.onBeforeCompile = function(shader, renderer) {
      previous.call(this, shader, renderer);
      shareUniforms(shader, SMOKE_UNIFORMS);
      shader.vertexShader = `attribute vec2 smokeSeed;\n${declareUniforms(SMOKE_UNIFORMS)}\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', `#include <begin_vertex>
float smokeRise = fract(vtestTime * vtestSmoke.z * (.8 + .4 * smokeSeed.y) + smokeSeed.x);
float smokeSize = vtestSmoke.y * pow(sin(3.14159 * smokeRise), .7) * (.6 + smokeRise * .9) * step(.5, vtestIdle);
transformed = transformed * smokeSize + vec3(vtestSmoke.w * smokeRise * (.6 + smokeSeed.y), vtestSmoke.x * smokeRise, -vtestSmoke.w * .4 * smokeRise);`);
    };
    this.material.customProgramCacheKey = () => `${key()}:painted-smoke-v1`;
  }

  /**
   * One chimney a town the seat watches now, `idle.smokePuffs` puffs a
   * chimney. `heights` is the tallest stone of each town
   * (`PaintedCityLayer.cityHeights`), so the smoke starts at the roofs.
   * `chimneys` are more places that smoke, each the top of a chimney in world
   * units with the hex it stands on (the manufactory's tall chimney). They
   * follow the same fog rule as a town.
   */
  build(state: GameState | null, levels: FogLevels, heights: ReadonlyMap<number, number>, on: boolean, chimneys: readonly SmokeSource[] = []): void {
    this.clear();
    if (!state || !on) return;
    const towns = state.cities.filter((city) => levelAt(levels, state.map, city.col, city.row) === VISIBLE);
    const stacks = chimneys.filter((stack) => levelAt(levels, state.map, stack.col, stack.row) === VISIBLE);
    const puffs = Math.max(1, Math.round(IDLE.smokePuffs));
    const count = (towns.length + stacks.length) * puffs;
    if (!count) return;
    const seeds = new Float32Array(count * 2);
    const geometry = this.geometry = new IcosahedronGeometry(1, 0);
    const mesh = new InstancedMesh(geometry, this.material, count);
    const matrix = new Matrix4();
    towns.forEach((city, t) => {
      // One chimney a town, on the houses at the town's lower left, clear of
      // the pieces in the middle and of the name banner over them.
      const x = ROOT3 * (city.col + (city.row % 2) * 0.5) + IDLE.smokeAt[0], z = city.row * 1.5 + IDLE.smokeAt[1];
      const y = 0.12 + (heights.get(city.id) ?? 0.3) * IDLE.smokeAt[2];
      for (let p = 0; p < puffs; p++) {
        const i = t * puffs + p;
        matrix.makeTranslation(x, y, z);
        mesh.setMatrixAt(i, matrix);
        seeds[i * 2] = p / puffs + hashUnit(city.col, city.row, 801) * 0.37;
        seeds[i * 2 + 1] = hashUnit(city.col, city.row, 810 + p);
      }
    });
    stacks.forEach((stack, s) => {
      for (let p = 0; p < puffs; p++) {
        const i = (towns.length + s) * puffs + p;
        matrix.makeTranslation(stack.x, stack.y, stack.z);
        mesh.setMatrixAt(i, matrix);
        seeds[i * 2] = p / puffs + hashUnit(stack.col, stack.row, 821) * 0.37;
        seeds[i * 2 + 1] = hashUnit(stack.col, stack.row, 830 + p);
      }
    });
    geometry.setAttribute('smokeSeed', new InstancedBufferAttribute(seeds, 2));
    mesh.instanceMatrix.needsUpdate = true;
    // The puffs move in the shader, so the bounds three would measure are
    // wrong; the layer is small and is simply never culled.
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const period = ROOT3 * state.map.width;
    for (const offset of [-period, 0, period]) {
      const copy = offset === 0 ? mesh : new InstancedMesh(geometry, this.material, 0);
      if (copy !== mesh) { copy.instanceMatrix = mesh.instanceMatrix; copy.count = mesh.count; copy.frustumCulled = false; }
      copy.position.x = offset;
      this.group.add(copy);
      this.meshes.push(copy);
    }
  }

  private clear(): void {
    for (const mesh of this.meshes) this.group.remove(mesh);
    this.meshes[0]?.dispose();
    this.meshes = [];
    this.geometry?.dispose();
    this.geometry = null;
  }

  dispose(): void {
    this.clear();
    this.material.dispose();
  }
}
