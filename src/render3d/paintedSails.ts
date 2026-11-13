/**
 * The turning sails of the farms' windmills (the visual test of 2026-11-12,
 * `docs/flags.md` item (nnnnnnn)). The user: "could you add an alternate farm
 * tile with a spinning windmill".
 *
 * The mill's tower is an ordinary building of the works layer. This layer adds
 * the sails: one instanced mesh for all mills, drawn once for each wrap copy.
 * Nothing moves on the CPU. The vertex shader turns the sails about their hub
 * from the shared clock (`vtestTime`), and stops them when switch 8 (small idle
 * motion) is off. Sails on remembered ground stand still under the fog's wash,
 * because a turning sail would say the farm is still there.
 */

import {
  type BufferGeometry, Color, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3,
} from 'three';

import { EXPLORED } from '../sim/visibility';
import { hashUnit } from './hash';
import { VIEW3D } from './lookData';
import { declareUniforms, shareUniforms } from './visualTestLook';

const SAIL_UNIFORMS = ['vtestTime', 'vtestIdle'] as const;
const ROOT3 = Math.sqrt(3);

type Register = (material: MeshStandardMaterial, options?: { terrain?: boolean }) => unknown;
/** A mill's tower, as the works layer placed it. */
export interface MillPlacement { cell: number; asset: string; x: number; y: number; z: number; scale: number; yaw: number }

export class PaintedSailsLayer {
  readonly group = new Group();
  private readonly material: MeshStandardMaterial;
  private geometry: BufferGeometry | null = null;
  private meshes: InstancedMesh[] = [];

  constructor(private readonly sails: BufferGeometry | undefined, register: Register) {
    this.group.name = 'painted-sails';
    this.material = new MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .94, metalness: 0, flatShading: true });
    register(this.material);
    const previous = this.material.onBeforeCompile, key = this.material.customProgramCacheKey.bind(this.material);
    const speed = VIEW3D.visualTest.works.sailSpeed.toFixed(4);
    this.material.onBeforeCompile = function(shader, renderer) {
      previous.call(this, shader, renderer);
      shareUniforms(shader, SAIL_UNIFORMS);
      shader.uniforms.sailWash = { value: new Color(VIEW3D.fog.exploredWash) };
      // x: where in the turn the sails start; y: 1 while the seat watches the hex.
      shader.vertexShader = `attribute vec2 sailSeed;\nvarying float sailLive;\n${declareUniforms(SAIL_UNIFORMS)}\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', `#include <begin_vertex>
sailLive = sailSeed.y;
float sailTurn = sailSeed.x + vtestTime * ${speed} * sailSeed.y * step(.5, vtestIdle);
float sailC = cos(sailTurn), sailS = sin(sailTurn);
transformed.xy = vec2(transformed.x * sailC - transformed.y * sailS, transformed.x * sailS + transformed.y * sailC);`);
      shader.fragmentShader = `uniform vec3 sailWash;\nvarying float sailLive;\n${shader.fragmentShader}`.replace('#include <opaque_fragment>',
        `if (sailLive < .5) outgoingLight = mix(outgoingLight, sailWash, ${VIEW3D.fog.exploredDim.toFixed(5)}) * ${VIEW3D.fog.exploredShade.toFixed(5)};\n#include <opaque_fragment>`);
    };
    this.material.customProgramCacheKey = () => `${key()}:painted-sails-v1`;
  }

  /** `placements` are the works layer's; `levelOf` is the fog level of a cell. `period` is the board's wrap width in world units. */
  build(placements: readonly MillPlacement[], levelOf: (cell: number) => number, period: number, shadows: boolean): void {
    this.clear();
    const mills = placements.filter((p) => p.asset === 'ns-windmill');
    if (!this.sails || !mills.length) return;
    const hub = VIEW3D.visualTest.works.windmillHub;
    const geometry = this.geometry = this.sails.clone();
    const seeds = new Float32Array(mills.length * 2);
    const mesh = new InstancedMesh(geometry, this.material, mills.length);
    const up = new Vector3(0, 1, 0), turn = new Quaternion(), matrix = new Matrix4(), offset = new Vector3();
    mills.forEach((mill, i) => {
      turn.setFromAxisAngle(up, mill.yaw);
      offset.set(hub[0]!, hub[1]!, hub[2]!).multiplyScalar(mill.scale).applyQuaternion(turn);
      matrix.compose(new Vector3(mill.x + offset.x, mill.y + offset.y, mill.z + offset.z), turn, new Vector3(mill.scale, mill.scale, mill.scale));
      mesh.setMatrixAt(i, matrix);
      seeds[i * 2] = hashUnit(Math.round(mill.x / ROOT3 * 2), Math.round(mill.z / 1.5), 905) * 6.2832;
      seeds[i * 2 + 1] = levelOf(mill.cell) === EXPLORED ? 0 : 1;
    });
    geometry.setAttribute('sailSeed', new InstancedBufferAttribute(seeds, 2));
    mesh.instanceMatrix.needsUpdate = true;
    // The sails turn in the shader, so measured bounds would be wrong. The layer is small and is never culled.
    for (const at of [-period, 0, period]) {
      const copy = at === 0 ? mesh : new InstancedMesh(geometry, this.material, 0);
      if (copy !== mesh) { copy.instanceMatrix = mesh.instanceMatrix; copy.count = mesh.count; }
      copy.frustumCulled = false; copy.castShadow = shadows; copy.receiveShadow = true;
      copy.position.x = at;
      this.group.add(copy); this.meshes.push(copy);
    }
  }

  private clear(): void {
    for (const mesh of this.meshes) this.group.remove(mesh);
    this.meshes[0]?.dispose(); this.meshes = [];
    this.geometry?.dispose(); this.geometry = null;
  }

  dispose(): void { this.clear(); this.material.dispose(); }
}
