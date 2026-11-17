/**
 * A few small flocks of pale birds that cross the board (the visual test of
 * 2026-11-12, `docs/flags.md` item (nnnnnnn), "Rendering, second step").
 *
 * One instanced mesh for every bird, drawn once for each wrap copy. Nothing
 * moves on the CPU: the vertex shader carries a bird along its line and beats
 * its wings from the shared clock (`vtestTime`). The birds are hidden while
 * switch 8 (small idle motion) is off. They cast no shadow and tell the player
 * nothing about the game.
 */

import {
  BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedBufferAttribute, InstancedMesh, Matrix4,
  MeshStandardMaterial, Quaternion, Vector3,
} from 'three';

import { hashUnit } from './hash';
import { VIEW3D } from './lookData';
import { declareUniforms, shareUniforms } from './visualTestLook';
import { cullWrapCopies } from './wrapCulling';

const BIRDS = VIEW3D.visualTest.birds;
const BIRD_UNIFORMS = ['vtestTime', 'vtestIdle'] as const;
const ROOT3 = Math.sqrt(3);

type Register = (material: MeshStandardMaterial, options?: { terrain?: boolean }) => unknown;

/** A bird seen from above: a small body and two wings. `birdWing` is 0 at the body and 1 at a wing tip. */
function birdGeometry(): BufferGeometry {
  const positions = [
    // Body, nose toward +x.
    .5, 0, 0, -.45, 0, .12, -.45, 0, -.12,
    // The two wings.
    .2, 0, .08, -.25, 0, .08, -.15, 0, 1,
    .2, 0, -.08, -.15, 0, -1, -.25, 0, -.08,
  ];
  const wing = [0, 0, 0, 0, 0, 1, 0, 1, 0];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('birdWing', new Float32BufferAttribute(wing, 1));
  geometry.computeVertexNormals();
  return geometry;
}

export class PaintedBirdsLayer {
  readonly group = new Group();
  private readonly material: MeshStandardMaterial;
  private geometry: BufferGeometry | null = null;
  private meshes: InstancedMesh[] = [];
  private builtFor = '';

  constructor(register: Register) {
    this.group.name = 'painted-birds';
    this.material = new MeshStandardMaterial({ color: new Color(BIRDS.color), roughness: 1, metalness: 0, flatShading: true, side: DoubleSide });
    register(this.material);
    const previous = this.material.onBeforeCompile, key = this.material.customProgramCacheKey.bind(this.material);
    this.material.onBeforeCompile = function(shader, renderer) {
      previous.call(this, shader, renderer);
      shareUniforms(shader, BIRD_UNIFORMS);
      shader.uniforms.birdFlight = { value: [BIRDS.speed / BIRDS.size, BIRDS.flap] };
      // x: how far along its line the bird starts (0 to 1); y: the line's length in the bird's own units; z: a second seed.
      shader.vertexShader = `attribute vec3 birdSeed;\nattribute float birdWing;\nuniform vec2 birdFlight;\n${declareUniforms(BIRD_UNIFORMS)}\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', `#include <begin_vertex>
float birdBeat = sin(vtestTime * birdFlight.y * (.85 + .3 * birdSeed.z) + birdSeed.z * 40.0);
transformed.y += birdWing * (.55 * birdBeat + .15);
transformed.z *= 1.0 - .25 * birdWing * (.5 + .5 * birdBeat);
transformed.x += (fract(birdSeed.x + vtestTime * birdFlight.x / birdSeed.y) - .5) * birdSeed.y;
transformed.y += .6 * sin(vtestTime * .7 + birdSeed.z * 9.0);
transformed *= step(.5, vtestIdle);`);
    };
    this.material.customProgramCacheKey = () => `${key()}:painted-birds-v1`;
  }

  /** Builds the flocks for a board of `width` by `height` hexes. Built again only when the size changes. */
  build(width: number, height: number): void {
    const sign = `${width}x${height}`;
    if (sign === this.builtFor) return;
    this.clear(); this.builtFor = sign;
    const flocks = Math.max(0, Math.round(BIRDS.flocks)), each = Math.max(1, Math.round(BIRDS.flockSize));
    if (!flocks) return;
    const period = ROOT3 * width, depth = 1.5 * height, count = flocks * each;
    const geometry = this.geometry = birdGeometry();
    const mesh = new InstancedMesh(geometry, this.material, count);
    const seeds = new Float32Array(count * 3);
    const up = new Vector3(0, 1, 0), turn = new Quaternion(), matrix = new Matrix4(), scale = new Vector3(BIRDS.size, BIRDS.size, BIRDS.size);
    // A line as long as the board is wide, so a bird leaves one wrap copy as it enters the next.
    const line = period / BIRDS.size;
    for (let f = 0; f < flocks; f++) {
      const heading = (hashUnit(f, width, 921) - .5) * .7 + (hashUnit(f, height, 922) > .5 ? Math.PI : 0);
      const z = depth * (.12 + .76 * hashUnit(f, width + height, 923)), start = hashUnit(f, width, 924);
      turn.setFromAxisAngle(up, heading);
      for (let b = 0; b < each; b++) {
        const i = f * each + b, back = Math.ceil(b / 2) * 1.6, side = (b % 2 ? 1 : -1) * Math.ceil(b / 2) * 1.3;
        // A loose V behind the first bird.
        const offset = new Vector3(-back * BIRDS.size, 0, side * BIRDS.size).applyQuaternion(turn);
        matrix.compose(new Vector3(period / 2 + offset.x, BIRDS.height + hashUnit(f, b, 925) * .25, z + offset.z), turn, scale);
        mesh.setMatrixAt(i, matrix);
        seeds[i * 3] = start; seeds[i * 3 + 1] = line; seeds[i * 3 + 2] = hashUnit(f, b, 926);
      }
    }
    geometry.setAttribute('birdSeed', new InstancedBufferAttribute(seeds, 3));
    mesh.instanceMatrix.needsUpdate = true;
    for (const at of [-period, 0, period]) {
      const copy = at === 0 ? mesh : new InstancedMesh(geometry, this.material, 0);
      if (copy !== mesh) { copy.instanceMatrix = mesh.instanceMatrix; copy.count = mesh.count; }
      copy.castShadow = false; copy.receiveShadow = false;
      copy.position.x = at;
      this.group.add(copy); this.meshes.push(copy);
    }
    // The birds move in the shader: half a line either way along their heading (a line is one period long), a wing
    // beat and a slow rise and fall. The bounds are widened by that, so each copy is culled like any other mesh
    // (`wrapCulling.ts`).
    cullWrapCopies(this.meshes, period / 2 + BIRDS.size * 2 + .6 + .2);
  }

  private clear(): void {
    for (const mesh of this.meshes) this.group.remove(mesh);
    this.meshes[0]?.dispose(); this.meshes = [];
    this.geometry?.dispose(); this.geometry = null; this.builtFor = '';
  }

  dispose(): void { this.clear(); this.material.dispose(); }
}
