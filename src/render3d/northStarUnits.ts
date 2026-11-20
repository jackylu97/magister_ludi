/**
 * The unit pieces of the north-star look (the user, 2026-11-14: "could you
 * create a page for how you'd redesign the units? lets do a single melee piece
 * for now").
 *
 * `NORTH_STAR_UNITS` in src/terrainStudy/northStarAssets.js names the unit
 * types that are drawn with one of these models. A type it does not name keeps
 * today's piece, and an empty table gives back every piece of today exactly.
 *
 * A model is authored in Blender (`scripts/terrain-study/build_northstar_units.py`)
 * and stored as data (`scripts/terrain-study/bake_northstar_units.mjs` writes
 * src/terrainStudy/northStarUnitData.json). The unit layer builds a piece the
 * first time it needs one and cannot wait for a download, so these models are
 * not fetched.
 *
 * What differs from today's pieces:
 * - `paintedOwner` is 0, 1 or 2 on a vertex: its own colour, the seat's first
 *   colour, or the seat's second colour. Today's pieces use only 0 and 1.
 * - `paintedIdle` says how a vertex moves when the piece idles: x for the
 *   breath and the shift of weight, y for a plume or a cape, z the figure's own
 *   phase. `installUnitIdle` adds the motion to a material. It reads the shared
 *   clock and switch 8 (small idle motion), as the herds and the ships do.
 */

import { BufferGeometry, Float32BufferAttribute, type Material } from 'three';

import data from '../terrainStudy/northStarUnitData.json';
// @ts-expect-error The list of north-star models is a plain JavaScript module that Node scripts read too.
import { NORTH_STAR_UNITS } from '../terrainStudy/northStarAssets.js';
import { VIEW3D } from './lookData';
import { VTEST_UNIFORMS } from './visualTestLook';

interface StoredModel { triangles: number; position: number[]; color: number[]; owner: number[]; idle: number[]; index: number[] }
const MODELS = data as unknown as Record<string, StoredModel>;

export interface NorthStarUnitAsset {
  geometry: BufferGeometry;
  height: number;
  radius: number;
  contacts: [number, number, number][];
}

/** The page that reviews the pieces may draw a type with another model, or with today's piece (`null`). */
const overrides = new Map<string, { model: string | null; turn?: number }>();

/** For the review pages only: draw `type` with `model`, or with today's piece when `model` is null. */
export function overrideNorthStarUnit(type: string, model: string | null, turn?: number): void {
  if (model !== null && !MODELS[model]) throw new Error(`No north-star unit model ${model}`);
  overrides.set(type, { model, turn });
}

/** For the review pages only: the turn of a type's piece about the upright, in radians, when a page asked for one. */
export function northStarUnitTurn(type: string): number | undefined {
  return overrides.get(type)?.turn;
}

/** The model that draws a unit type, or null when the type keeps today's piece. */
export function northStarUnitModel(type: string): string | null {
  const override = overrides.get(type);
  if (override) return override.model;
  return (NORTH_STAR_UNITS as Record<string, string>)[type] ?? null;
}

/** Builds the geometry of one model, with the attributes the unit layer expects. */
export function buildNorthStarUnit(name: string): NorthStarUnitAsset {
  const stored = MODELS[name];
  if (!stored) throw new Error(`No north-star unit model ${name}`);
  const count = stored.owner.length;
  const position = new Float32Array(count * 3), color = new Float32Array(count * 3), idle = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let height = 0, radius = 0;
  for (let i = 0; i < count; i++) {
    const x = stored.position[i * 3]! / 1e4, y = stored.position[i * 3 + 1]! / 1e4, z = stored.position[i * 3 + 2]! / 1e4;
    position.set([x, y, z], i * 3);
    for (let k = 0; k < 3; k++) { color[i * 3 + k] = stored.color[i * 3 + k]! / 1e3; idle[i * 3 + k] = stored.idle[i * 3 + k]! / 1e3; }
    // The same flat projection today's pieces carry (`packUnitAsset`).
    uv[i * 2] = (x + z * .37) * 2; uv[i * 2 + 1] = (y + z * .23) * 2;
    height = Math.max(height, y); radius = Math.max(radius, Math.hypot(x, z));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(color, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setAttribute('paintedOwner', new Float32BufferAttribute(Float32Array.from(stored.owner), 1));
  geometry.setAttribute('paintedIdle', new Float32BufferAttribute(idle, 3));
  geometry.setIndex(stored.index);
  geometry.computeVertexNormals();
  geometry.name = `Painted unit ${name}`;
  geometry.userData.paintedUnitAsset = name;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  // The piece rests on the rim of its base: a ring of points and the centre.
  const contacts: [number, number, number][] = [[0, 0, 0]];
  for (let i = 0; i < count; i++) {
    if (position[i * 3 + 1]! < .002) contacts.push([position[i * 3]!, 0, position[i * 3 + 2]!]);
  }
  return { geometry, height, radius, contacts };
}

const idling = new WeakSet<Material>();

/**
 * Adds the pieces' idle motion to a material. Safe to call twice. A piece with
 * no `paintedIdle` reads zero and stands still.
 *
 * The sizes are in `visualTest.unitIdle` (data/view3d.json): the body rises
 * and sinks with a slow breath and leans a little from side to side, and a
 * plume or a cape swings at its free end.
 */
export function installUnitIdle(material: Material): void {
  if (idling.has(material)) return;
  idling.add(material);
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  const m = VIEW3D.visualTest.unitIdle, n = (value: number): string => value.toFixed(4);
  material.onBeforeCompile = function(shader, renderer) {
    previous.call(this, shader, renderer);
    // The shared clock and switch 8, under this file's own names: a material may also carry the ships'
    // swell (`installBob`), which declares the shared names itself.
    shader.uniforms.unitIdleTime = VTEST_UNIFORMS.vtestTime;
    shader.uniforms.unitIdleOn = VTEST_UNIFORMS.vtestIdle;
    shader.vertexShader = `attribute vec3 paintedIdle;\nuniform float unitIdleTime;\nuniform float unitIdleOn;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
if (unitIdleOn > .5 && (paintedIdle.x > 0. || paintedIdle.y > 0.)) {
  float unitPhase = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832 + paintedIdle.z * 6.2832;
  float unitBreath = sin(unitIdleTime * ${n(m.breathSpeed)} + unitPhase);
  transformed.y += paintedIdle.x * ${n(m.breath)} * unitBreath;
  transformed.x += paintedIdle.x * ${n(m.sway)} * sin(unitIdleTime * ${n(m.swaySpeed)} + unitPhase * 1.7);
  float unitGust = .55 + .45 * sin(unitIdleTime * .37 + unitPhase * 2.);
  transformed.x += paintedIdle.y * paintedIdle.y * ${n(m.flutter)} * unitGust * sin(unitIdleTime * ${n(m.flutterSpeed)} + unitPhase + transformed.y * 9.);
  transformed.z += paintedIdle.y * paintedIdle.y * ${n(m.flutter * .6)} * unitGust * cos(unitIdleTime * ${n(m.flutterSpeed * .8)} + unitPhase);
}
#endif`);
  };
  material.customProgramCacheKey = () => `${key()}:unit-idle-v1`;
  const stated = material as Material & { defaultAttributeValues?: Record<string, number[]> };
  stated.defaultAttributeValues = { ...(stated.defaultAttributeValues ?? {}), paintedIdle: [0, 0, 0] };
  material.needsUpdate = true;
}
