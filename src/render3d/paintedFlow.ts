/**
 * Moving water on the rivers (the visual test of 2026-11-13, `docs/flags.md`
 * item (nnnnnnn)). The user: "the rivers should feel dynamic and something to
 * look at".
 *
 * Small pale glints lie on the water and travel downstream. One instanced mesh
 * for every river, drawn once for each wrap copy. Nothing moves on the CPU:
 * each glint slides along its own short stretch and fades in and out in the
 * vertex shader, from the shared clock (`vtestTime`). They stand still, hidden,
 * while switch 8 (small idle motion) is off.
 *
 * The river's line is worked out again here from the board's own map, by the
 * same function the board used (`createOrganicRivers`), so the glints lie
 * exactly on the water and nothing new crosses from the board's worker.
 */

import {
  BufferGeometry, Color, Float32BufferAttribute, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3,
} from 'three';

import type { GameMap } from '../sim/map';
import { HIDDEN } from '../sim/visibility';
// @ts-expect-error The terrain modules remain JavaScript.
import { surfaceHeight } from '../terrainStudy/surface.js';
import { type FogLevels, levelAt } from './fog3d';
import { VIEW3D } from './lookData';
// @ts-expect-error The river module is plain JavaScript with no declaration file.
import { createOrganicRivers } from './organicRivers';
import { declareUniforms, shareUniforms } from './visualTestLook';
import { cullWrapCopies } from './wrapCulling';

const RIVERS = VIEW3D.visualTest.organicRivers, FLOW = RIVERS.flow;
const FLOW_UNIFORMS = ['vtestTime', 'vtestIdle'] as const;
const ROOT3 = Math.sqrt(3);
type Glint = { x: number; z: number; dx: number; dz: number; half: number; seed: number };
type Placed = { glint: Glint; y: number; col: number; row: number };

/**
 * Every glint of a board, with the ground height it rides at and the hex it
 * stands on, by the board's map.
 *
 * The rivers' line and the ground under it are facts of the board, and the
 * board's map lives as long as the board. The layer used to trace every river
 * again (`createOrganicRivers`) on each build, which is each time the works
 * rebuild, and so each time the seat's sight moved: about a quarter of a second
 * of the turn-end sync at turn 130, measured on a loaded machine. Now a build
 * only asks the fog which glints to keep.
 */
const placedByBoard = new WeakMap<GameMap, readonly Placed[]>();

function placedGlints(prepared: GameMap): readonly Placed[] {
  const known = placedByBoard.get(prepared);
  if (known) return known;
  const glints = (createOrganicRivers(prepared, RIVERS) as { flow(): Glint[] }).flow();
  const period = ROOT3 * prepared.width, wrap = (x: number): number => ((x % period) + period) % period;
  const placed: Placed[] = [];
  for (const glint of glints) {
    const row = Math.round(glint.z / 1.5), col = Math.round(wrap(glint.x) / ROOT3 - (row % 2) * .5);
    const tile = prepared.tiles[row * prepared.width + ((col % prepared.width) + prepared.width) % prepared.width];
    if (!tile || row < 0 || row >= prepared.height) continue;
    const cx = ROOT3 * (tile.col + (tile.row % 2) * .5);
    let lx = wrap(glint.x) - cx; if (lx > period / 2) lx -= period; if (lx < -period / 2) lx += period;
    const ground = surfaceHeight(tile, lx, glint.z - tile.row * 1.5) as number;
    // A hex that was not told the river's line stands uncut; the water is still at the cut's depth.
    placed.push({ glint, y: (tile as { riverCarve?: unknown }).riverCarve ? ground : ground - RIVERS.cutDepth, col: tile.col, row: tile.row });
  }
  placedByBoard.set(prepared, placed);
  return placed;
}

export class PaintedFlowLayer {
  readonly group = new Group();
  private readonly material: MeshBasicMaterial;
  private geometry: BufferGeometry | null = null;
  private meshes: InstancedMesh[] = [];
  private drawn: readonly Placed[] = [];
  private layout = '';

  constructor() {
    this.group.name = 'painted-flow';
    this.material = new MeshBasicMaterial({ color: new Color(FLOW.color), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const travel = (FLOW.travel / FLOW.length).toFixed(4), speed = FLOW.speed.toFixed(4);
    this.material.onBeforeCompile = (shader) => {
      shareUniforms(shader, FLOW_UNIFORMS);
      // x: where in its trip a glint starts; y: a second seed.
      shader.vertexShader = `attribute vec2 flowSeed;\n${declareUniforms(FLOW_UNIFORMS)}\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', `#include <begin_vertex>
float flowAt = fract(vtestTime * ${speed} * (.6 + .8 * flowSeed.y) + flowSeed.x);
float flowShow = sin(3.14159 * flowAt) * step(.5, vtestIdle);
transformed.x = transformed.x * (.5 + .5 * flowShow) + (flowAt - .5) * ${travel};
transformed.z *= flowShow;`);
    };
    this.material.customProgramCacheKey = () => 'painted-flow-v1';
  }

  /** `prepared` is the board's own map. Built with the works layer, never on a frame. */
  build(prepared: GameMap, levels: FogLevels, map: GameMap, organic: boolean): void {
    if (!organic || !FLOW.length) { this.clear(); return; }
    const period = ROOT3 * prepared.width, wrap = (x: number): number => ((x % period) + period) % period;
    const kept = placedGlints(prepared).filter((placed) => levelAt(levels, map, placed.col, placed.row) !== HIDDEN);
    // Visible and remembered river tiles use the same glints. Keep their buffers
    // when a unit changes sight without revealing a new stretch of river.
    const layout = [period, FLOW.length, FLOW.width, FLOW.lift, FLOW.travel].join('/');
    if (layout === this.layout && kept.length === this.drawn.length && kept.every((point, i) => point === this.drawn[i])) return;
    this.clear();
    this.layout = layout; this.drawn = kept;
    if (!kept.length) return;
    const geometry = this.geometry = new BufferGeometry();
    // A flat dash, one unit long in x and one wide in z, with pointed ends.
    geometry.setAttribute('position', new Float32BufferAttribute([-.5, 0, 0, 0, 0, .5, 0, 0, -.5, 0, 0, .5, .5, 0, 0, 0, 0, -.5], 3));
    const mesh = new InstancedMesh(geometry, this.material, kept.length);
    const seeds = new Float32Array(kept.length * 2), up = new Vector3(0, 1, 0), turn = new Quaternion(), matrix = new Matrix4();
    kept.forEach(({ glint, y }, i) => {
      turn.setFromAxisAngle(up, Math.atan2(-glint.dz, glint.dx));
      // Each glint keeps to its own lane across the water.
      const lane = (glint.seed - .5) * 1.3 * glint.half, nx = -glint.dz, nz = glint.dx;
      matrix.compose(new Vector3(wrap(glint.x) + nx * lane, y + FLOW.lift, glint.z + nz * lane), turn, new Vector3(FLOW.length, 1, glint.half * FLOW.width));
      mesh.setMatrixAt(i, matrix);
      seeds[i * 2] = (glint.seed * 7.3) % 1; seeds[i * 2 + 1] = (glint.seed * 3.1) % 1;
    });
    geometry.setAttribute('flowSeed', new InstancedBufferAttribute(seeds, 2));
    mesh.instanceMatrix.needsUpdate = true;
    for (const at of [-period, 0, period]) {
      const copy = at === 0 ? mesh : new InstancedMesh(geometry, this.material, 0);
      if (copy !== mesh) { copy.instanceMatrix = mesh.instanceMatrix; copy.count = mesh.count; }
      copy.castShadow = false; copy.receiveShadow = false;
      copy.position.x = at;
      this.group.add(copy); this.meshes.push(copy);
    }
    // A glint travels half of `travel` either way along its river in the shader. The bounds are widened by that, so
    // each copy is culled like any other mesh (`wrapCulling.ts`).
    cullWrapCopies(this.meshes, FLOW.travel / 2 + FLOW.length + .1);
  }

  private clear(): void {
    this.drawn = []; this.layout = '';
    for (const mesh of this.meshes) this.group.remove(mesh);
    this.meshes[0]?.dispose(); this.meshes = [];
    this.geometry?.dispose(); this.geometry = null;
  }

  dispose(): void { this.clear(); this.material.dispose(); }
}
