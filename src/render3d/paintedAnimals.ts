/**
 * The idle motion of the herds (the user, 2026-11-13: "Lets also give the
 * animals some movement so that's its in line with our other subtle
 * movements").
 *
 * Nothing moves on the CPU and nothing is drawn twice. The animals are
 * instances of the works layer, on the material every work shares. This file
 * adds a few lines to that material's vertex shader. They read the shared
 * clock (`vtestTime`), so the motion stands still when the scene holds the
 * clock, and they stop when switch 8 (small idle motion) is off.
 *
 * A north-star animal carries `herdMove` on each vertex
 * (`build_northstar_animals.py` writes it, `bakeSettlementScene` reads it):
 * x is how much the vertex belongs to the head and neck, y how much to the
 * tail, z is 1 on every vertex of an animal. A building has no `herdMove`, so
 * it reads 0 and does not move. Each animal takes its own phase from where it
 * stands, so a herd does not move as one.
 *
 * The motions, with their sizes in `visualTest.animals` (data/view3d.json):
 * the head dips and lifts slowly; the tail flicks in short bursts; the back
 * leans a little from side to side; and now and then the animal moves a short
 * way forward and back.
 */

import type { Material } from 'three';

import { VIEW3D } from './lookData';
import { declareUniforms, shareUniforms } from './visualTestLook';

const HERD_UNIFORMS = ['vtestTime', 'vtestIdle'] as const;
const moving = new WeakSet<Material>();

/** Adds the herds' idle motion to the material that draws the works. Safe to call twice. */
export function installHerdMotion(material: Material): void {
  if (moving.has(material)) return;
  moving.add(material);
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  const m = VIEW3D.visualTest.animals, n = (value: number): string => value.toFixed(4);
  material.onBeforeCompile = function(shader, renderer) {
    previous.call(this, shader, renderer);
    shareUniforms(shader, HERD_UNIFORMS);
    // An animal looks along +x and stands along +y in its own space.
    shader.vertexShader = `attribute vec3 herdMove;\n${declareUniforms(HERD_UNIFORMS)}\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
if (herdMove.z > .5 && vtestIdle > .5) {
  float herdPhase = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
  float herdHead = herdMove.x * herdMove.x, herdTail = herdMove.y * herdMove.y;
  transformed.y += herdHead * ${n(m.nod)} * sin(vtestTime * ${n(m.nodSpeed)} + herdPhase);
  transformed.x += herdHead * ${n(m.nod * .4)} * cos(vtestTime * ${n(m.nodSpeed)} + herdPhase);
  transformed.z += herdTail * ${n(m.flick)} * sin(vtestTime * ${n(m.flickSpeed)} + herdPhase) * smoothstep(.7, 1., sin(vtestTime * .5 + herdPhase * 3.));
  transformed.z += position.y * ${n(m.sway)} * sin(vtestTime * .35 + herdPhase * 2.);
  transformed.x += ${n(m.step)} * smoothstep(.9, 1., sin(vtestTime * .11 + herdPhase * 5.));
}
#endif`);
  };
  material.customProgramCacheKey = () => `${key()}:herd-motion-v1`;
  // A work that is not an animal has no `herdMove`; three reads this stated zero for it.
  const stated = material as Material & { defaultAttributeValues?: Record<string, number[]> };
  stated.defaultAttributeValues = { ...(stated.defaultAttributeValues ?? {}), herdMove: [0, 0, 0] };
  material.needsUpdate = true;
}
