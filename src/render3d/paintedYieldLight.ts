/**
 * A rich hex shown by particles and light (the user's review of 2026-11-16,
 * `docs/flags.md` item (nnnnnnn), "Improvements by age, the user's review"):
 * "Could we axe the tile yield-based structures, i think they feel out of
 * place. Let's express this gameplay idea exclusively with particles ... I'm
 * imagining a combination of lighting and particles".
 *
 * Three systems, for the user to compare. `visualTest.yieldLight.show` in
 * `data/view3d.json` picks one:
 * - `a`, motes: small bright motes of the yield's colour rise slowly and fade,
 *   over a faint glow on the ground. More yield, more motes.
 * - `b`, light on the ground: nothing rises. A soft pool of the yield's colour
 *   lies on the hex, with a rim that breathes and small glints that twinkle.
 * - `c`, shapes: a faint glow, and a few drifting shapes that differ by yield,
 *   so the kind reads by shape and motion as well as colour: grain chaff for
 *   food, sparks for production, coin glints for gold, small stars for
 *   science, petals for culture, candle flames for faith.
 * `structures` draws the sheaves, logs and stalls of before
 * (`paintedRichness.ts`) and `off` draws nothing.
 *
 * The rule of which hex shows what is `yieldLightKinds`, and it is the same
 * for the three systems. The yield is the one the yields lens prints
 * (`seenTileYields`), so a resource the seat cannot name adds nothing.
 *
 * The whole layer is one instanced quad, drawn once for each wrap copy: three
 * draw calls for any number of hexes. Nothing moves on the CPU. Each quad
 * carries a seed, and the shaders place and fade it from the shared clock
 * (`vtestTime`), so a held clock holds the picture. The layer is built when
 * the hexes in sight or the works change (`Renderer3D.rebuildYieldLight`),
 * never on a frame. Only a hex the seat sees now shows anything.
 */

import {
  Color, CustomBlending, DoubleSide, Group, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, OneFactor, OneMinusSrcAlphaFactor, PlaneGeometry, ShaderMaterial,
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
import { VTEST_UNIFORMS } from './visualTestLook';

const LIGHT = VIEW3D.visualTest.yieldLight;
export const YIELD_LIGHT_KINDS = ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const;
export type YieldLightKind = typeof YIELD_LIGHT_KINDS[number];
export type YieldLightPick = { kind: YieldLightKind; step: number };
/** The systems `visualTest.yieldLight.show` may name. */
export const YIELD_LIGHT_SHOWS = ['off', 'structures', 'a', 'b', 'c'] as const;
export type YieldLightShow = typeof YIELD_LIGHT_SHOWS[number];
const WATER = new Set(['ocean', 'coast', 'lake']);

/** What a quad is. The shaders branch on it. */
const MOTE = 0, GLOW = 1, POOL = 2, GLINT = 3, SHAPE = 4;

/**
 * Which yields a hex shows, strongest first, and the step of each.
 *
 * - A yield counts when it reaches the first of its three `steps`
 *   (`visualTest.yieldLight.steps`); its step, 1 to 3, is how many it reaches.
 * - The hex shows the `kinds` strongest yields at most (two): the higher step
 *   first, and between two of one step the one nearer its top step.
 * - A hex where no yield reaches a first step shows nothing, so an ordinary
 *   worked hex stays quiet.
 */
export function yieldLightKinds(yields: Record<YieldLightKind, number>): YieldLightPick[] {
  const reached: (YieldLightPick & { share: number })[] = [];
  for (const kind of YIELD_LIGHT_KINDS) {
    const steps = LIGHT.steps[kind];
    let step = 0;
    for (const at of steps) if (yields[kind] >= at) step++;
    if (step > 0) reached.push({ kind, step, share: yields[kind] / steps[steps.length - 1]! });
  }
  reached.sort((a, b) => b.step - a.step || b.share - a.share);
  return reached.slice(0, LIGHT.kinds).map(({ kind, step }) => ({ kind, step }));
}

/** How many particles a yield gets: `perStep` for each step, and `secondShare` of that for a hex's second yield. */
export function yieldLightCount(perStep: number, step: number, second: boolean): number {
  return Math.max(1, Math.round(perStep * step * (second ? LIGHT.secondShare : 1)));
}

const VERTEX = /* glsl */`
attribute vec3 aAt;
attribute vec4 aSeed;   // x: where in its life the quad starts; y: a second seed; z: what it is; w: the yield's index
attribute vec4 aTint;   // the colour, and the strength in w
attribute float aSize;
uniform float vtestTime;
varying vec2 vUv;
varying vec4 vTint;
varying vec4 vSeed;
varying float vFade;
varying float vSpin;
void main() {
  float phase = aSeed.x, rnd = aSeed.y, type = aSeed.z, kind = aSeed.w;
  float t = vtestTime;
  vec3 at = aAt;
  vec2 corner = position.xy;
  float size = aSize, fade = 1.0, spin = 0.0;
  bool ground = type > 0.5 && type < 3.5;
  if (type < 0.5) {
    // A mote: a slow rise with a small sway, in and out by a smooth curve.
    float life = fract(t * ${LIGHT.speed.toFixed(4)} * (0.7 + 0.6 * rnd) + phase);
    at.y += ${LIGHT.rise.toFixed(4)} * life;
    at.x += 0.045 * sin(t * 0.7 + rnd * 40.0) * life;
    at.z += 0.03 * cos(t * 0.5 + rnd * 23.0) * life;
    fade = pow(sin(3.14159 * life), 1.3);
    size *= 0.75 + 0.5 * rnd;
  } else if (type > 3.5) {
    float speed = ${LIGHT.speed.toFixed(4)}, rise = ${LIGHT.rise.toFixed(4)};
    float life;
    if (kind < 0.5) {
      // Chaff: it lifts a little and blows to one side, turning as it goes.
      life = fract(t * speed * (0.8 + 0.4 * rnd) + phase);
      at.y += rise * 0.55 * life; at.x += 0.30 * life - 0.10 + 0.04 * sin(t * 1.3 + rnd * 30.0);
      spin = rnd * 6.28 + t * (0.6 + rnd);
      fade = sin(3.14159 * life);
    } else if (kind < 1.5) {
      // A spark: it leaves fast, slows, and dies bright to dark.
      life = fract(t * speed * 2.4 * (0.8 + 0.4 * rnd) + phase);
      at.y += rise * 0.8 * (1.0 - pow(1.0 - life, 2.2));
      at.x += (rnd - 0.5) * 0.22 * life; at.z += (fract(rnd * 7.3) - 0.5) * 0.12 * life;
      fade = pow(1.0 - life, 1.4) * smoothstep(0.0, 0.06, life);
      size *= 0.8;
    } else if (kind < 2.5) {
      // A coin glint: it hangs low and turns, so it flashes and goes thin.
      life = fract(t * speed * 0.9 * (0.8 + 0.4 * rnd) + phase);
      at.y += rise * 0.30 * life + 0.03;
      spin = t * (1.6 + rnd) + rnd * 20.0;
      fade = sin(3.14159 * life) * (0.45 + 0.55 * pow(abs(cos(spin)), 3.0));
    } else if (kind < 3.5) {
      // A small star: it rises straight and twinkles.
      life = fract(t * speed * (0.8 + 0.4 * rnd) + phase);
      at.y += rise * life;
      fade = sin(3.14159 * life) * (0.6 + 0.4 * sin(t * 3.0 + rnd * 50.0));
    } else if (kind < 4.5) {
      // A petal: it drifts round in a slow curl and turns.
      life = fract(t * speed * 0.8 * (0.8 + 0.4 * rnd) + phase);
      float turn = t * 0.55 + rnd * 30.0;
      at.y += rise * 0.5 * life + 0.03 * sin(turn * 2.0);
      at.x += 0.10 * sin(turn); at.z += 0.07 * cos(turn);
      spin = turn * 1.7;
      fade = sin(3.14159 * life);
    } else {
      // A candle flame: it rises straight and slow, and flickers.
      life = fract(t * speed * 0.9 * (0.8 + 0.4 * rnd) + phase);
      at.y += rise * 0.85 * life;
      at.x += 0.012 * sin(t * 2.3 + rnd * 40.0);
      fade = sin(3.14159 * life) * (0.78 + 0.22 * sin(t * 7.0 + rnd * 60.0));
    }
    size *= 0.8 + 0.4 * rnd;
  } else if (type > 2.5) {
    // A glint on the ground: dark most of the time, then a short bright moment.
    fade = pow(max(0.0, sin(t * (0.5 + 0.5 * rnd) + phase * 6.28318)), 10.0);
    spin = rnd * 1.57;
  } else if (type > 1.5) {
    // The pool breathes.
    fade = 0.8 + 0.2 * sin(t * 0.6 + phase * 6.28318);
  } else {
    fade = 0.85 + 0.15 * sin(t * 0.5 + phase * 6.28318);
  }
  vUv = corner; vTint = aTint; vSeed = aSeed; vFade = fade; vSpin = spin;
  if (ground) {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(at + vec3(corner.x, 0.0, corner.y) * size, 1.0);
  } else {
    vec4 eye = viewMatrix * modelMatrix * vec4(at, 1.0);
    eye.xy += corner * size;
    gl_Position = projectionMatrix * eye;
  }
}`;

const FRAGMENT = /* glsl */`
uniform float vtestTime;
varying vec2 vUv;
varying vec4 vTint;
varying vec4 vSeed;
varying float vFade;
varying float vSpin;
vec2 turned(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// A star of four thin rays with a soft middle.
float star(vec2 p, float thin) {
  float r = length(p);
  float rays = exp(-abs(p.x) * thin) * exp(-abs(p.y) * 3.0) + exp(-abs(p.y) * thin) * exp(-abs(p.x) * 3.0);
  return (rays * 0.8 + exp(-r * r * 30.0)) * (1.0 - smoothstep(0.75, 1.0, r));
}
void main() {
  float type = vSeed.z, kind = vSeed.w, r = length(vUv);
  float edge = 1.0 - smoothstep(0.82, 1.0, r);
  float light = 0.0, white = 0.0;
  if (type < 0.5) {
    // A mote: a small white-hot middle in a wide soft halo of the colour.
    float core = exp(-r * r * 14.0);
    light = core + 0.5 * exp(-r * r * 3.2);
    white = core;
  } else if (type < 1.5) {
    light = pow(max(0.0, 1.0 - r), 2.2);
  } else if (type < 2.5) {
    // The pool: a soft fill that moves like light through water, and a rim.
    vec2 p = vUv * 3.2;
    float t = vtestTime * 0.35;
    float caustic = sin(p.x * 2.1 + t + sin(p.y * 1.7 - t * 0.8)) * sin(p.y * 2.3 - t * 0.9 + sin(p.x * 1.3 + t * 0.6));
    // The edge of the pool wanders, so it is a patch of light and not a drawn circle.
    float wander = 0.06 * sin(atan(vUv.y, vUv.x) * 3.0 + vSeed.y * 20.0 + t * 0.4) + 0.04 * sin(atan(vUv.y, vUv.x) * 5.0 - t * 0.3);
    float fill = (0.6 + 0.4 * caustic) * (1.0 - smoothstep(0.30, 0.86 + wander, r));
    float rim = exp(-pow((r - 0.74 - wander) / 0.13, 2.0));
    light = fill * 0.8 + rim * 0.38;
  } else if (type < 3.5) {
    light = star(turned(vUv, vSpin), 9.0);
    white = exp(-r * r * 30.0);
  } else {
    vec2 p = turned(vUv, vSpin);
    if (kind < 0.5) {
      // Chaff: a thin husk.
      light = exp(-(p.x * p.x * 3.5 + p.y * p.y * 60.0));
      white = light * 0.5;
    } else if (kind < 1.5) {
      // A spark: a hot point with a short tail under it.
      float tail = exp(-vUv.x * vUv.x * 70.0) * smoothstep(-0.9, 0.0, vUv.y) * (1.0 - smoothstep(0.0, 0.15, vUv.y));
      float point = exp(-r * r * 22.0);
      light = point + tail * 0.6; white = point;
    } else if (kind < 2.5) {
      // A coin: a disc seen at an angle, so it is a thin ellipse most of the time.
      float thin = 0.25 + 0.75 * abs(cos(vSpin));
      vec2 q = vec2(vUv.x / thin, vUv.y);
      float disc = 1.0 - smoothstep(0.42, 0.5, length(q));
      float flash = star(vUv, 12.0) * pow(abs(cos(vSpin)), 6.0);
      light = disc * 0.8 + flash; white = flash + disc * 0.25;
    } else if (kind < 3.5) {
      light = star(vUv, 11.0);
      white = exp(-r * r * 30.0);
    } else if (kind < 4.5) {
      // A petal: a pointed oval.
      float along = p.y * 0.5 + 0.5;
      float width = 0.42 * sin(3.14159 * clamp(along, 0.0, 1.0)) * (1.15 - 0.5 * along);
      light = (1.0 - smoothstep(width * 0.75, width, abs(p.x))) * step(abs(p.y), 0.98);
      white = light * 0.3 * (1.0 - smoothstep(0.0, 0.3, abs(p.x)));
    } else {
      // A flame: round below, pointed above.
      float up = vUv.y * 0.5 + 0.5;
      float width = 0.34 * sqrt(clamp(up * 1.6, 0.0, 1.0)) * (1.0 - smoothstep(0.35, 1.0, up));
      float body = 1.0 - smoothstep(width * 0.55, width + 0.02, abs(vUv.x));
      float halo = 0.35 * exp(-r * r * 4.0);
      light = body * step(0.02, up) + halo; white = body * (1.0 - smoothstep(0.1, 0.6, up)) * 0.8;
    }
  }
  light *= edge * vFade * vTint.w;
  // The faint outer part of a light is a deeper tone of the ink, so it still has a colour on pale ground; the bright part is the ink, and the hottest part is near white.
  vec3 colour = mix(vTint.rgb * vTint.rgb * 1.15, vTint.rgb, clamp(light * 1.6, 0.0, 1.0));
  colour = mix(colour, vec3(1.0), clamp(white, 0.0, 1.0) * 0.7);
  light = clamp(light, 0.0, 1.0);
  gl_FragColor = vec4(colour * light, light * ${LIGHT.body.toFixed(3)});
}`;

type Quad = { x: number; y: number; z: number; size: number; type: number; kind: number; phase: number; rnd: number; strength: number };

export class PaintedYieldLightLayer {
  readonly group = new Group();
  private readonly material: ShaderMaterial;
  private geometry: InstancedBufferGeometry | null = null;
  private meshes: Mesh[] = [];
  /** The quads of the last build, by what they are. For tests and for the cost report. */
  readonly counts = { hexes: 0, motes: 0, glows: 0, pools: 0, glints: 0, shapes: 0 };
  /** The hexes of the last build and what each shows, by cell. */
  readonly shown = new Map<number, YieldLightPick[]>();
  /**
   * Hexes that show stated yields whatever they really yield, by cell. Only the
   * visual test scene sets this, to put an example of every kind and step side
   * by side. The game never does.
   */
  showcase: ReadonlyMap<number, YieldLightPick[]> | null = null;

  constructor() {
    this.group.name = 'painted-yield-light';
    this.material = new ShaderMaterial({
      vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms: { vtestTime: VTEST_UNIFORMS.vtestTime },
      // Light that also has a little body: the colour is added, and `alpha` takes away some of what is behind it, so a
      // tinted halo still shows on bright grass, where light that is only added turns to white.
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor, transparent: true, depthWrite: false, depthTest: true,
      // A flat quad on the ground is seen from its back.
      side: DoubleSide,
    });
  }

  /** `prepared` is the board's own map, whose tiles carry the ground's heights. `period` is the wrap width in world units. */
  build(state: GameState, prepared: GameMap, levels: FogLevels, seat: number, period: number): void {
    this.clear();
    const show = LIGHT.show as YieldLightShow;
    if (show !== 'a' && show !== 'b' && show !== 'c') return;
    const width = state.map.width;
    const cities = new Set(state.cities.map((city) => city.row * width + city.col));
    // A hex the seat sees now, on land, with no town and no mountain on it. Remembered and uncharted ground shows nothing.
    const watched = state.map.tiles.filter((tile, cell) => !WATER.has(tile.terrain) && tile.terrain !== 'mountain' && !cities.has(cell)
      && (this.showcase?.has(cell) || levelAt(levels, state.map, tile.col, tile.row) === VISIBLE));
    const yields = seenTileYields(state, seat, watched);
    const colours = Object.fromEntries(YIELD_LIGHT_KINDS.map((kind) => [kind, new Color(LIGHT.colors[kind])])) as Record<YieldLightKind, Color>;
    const quads: Quad[] = [], tints: Color[] = [];
    const push = (quad: Quad, colour: Color): void => { quads.push(quad); tints.push(colour); };
    watched.forEach((original, index) => {
      const cell = original.row * width + original.col;
      const picks = this.showcase?.get(cell) ?? yieldLightKinds(yields[index]!);
      const tile = prepared.tiles[cell];
      if (!picks.length || !tile) return;
      this.shown.set(cell, picks); this.counts.hexes++;
      const c = centre(tile) as { x: number; z: number };
      const h = (n: number): number => hashUnit(tile.col, tile.row, n);
      // The ground's height under a flat quad: the highest of a few places, so a quad on a hill is not buried.
      const top = (radius: number): number => Math.max(...[[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]].map(([x, z]) => surfaceHeight(tile, x, z) as number));
      // A place for a particle: inside the hex, clear of its middle where a piece stands.
      const place = (n: number): { x: number; z: number } => {
        for (let attempt = 0; attempt < 4; attempt++) {
          const angle = h(n + attempt * 53) * Math.PI * 2, radius = LIGHT.inner + h(n + 7 + attempt * 53) * (LIGHT.outer - LIGHT.inner);
          const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
          if (onTileTop(tile, x, z, .04)) return { x, z };
        }
        return { x: 0, z: LIGHT.inner };
      };
      const first = picks[0]!, strength = (step: number): number => LIGHT.strength[Math.min(3, step) - 1]!;
      if (show === 'a' || show === 'c') {
        push({ x: c.x, y: top(LIGHT.glowRadius * .5) + LIGHT.lift, z: c.z, size: LIGHT.glowRadius, type: GLOW, kind: YIELD_LIGHT_KINDS.indexOf(first.kind),
          phase: h(1200), rnd: h(1201), strength: LIGHT.glow * strength(first.step) }, colours[first.kind]);
        this.counts.glows++;
      }
      picks.forEach((pick, order) => {
        const kind = YIELD_LIGHT_KINDS.indexOf(pick.kind), colour = colours[pick.kind], second = order > 0;
        if (show === 'b') {
          // The first yield's pool fills the hex; a second yield's is a smaller ring inside it.
          const radius = LIGHT.poolRadius * (second ? .5 : 1);
          push({ x: c.x, y: top(radius * .6) + LIGHT.lift * (second ? 1.5 : 1), z: c.z, size: radius, type: POOL, kind,
            phase: h(1210 + order), rnd: h(1212 + order), strength: LIGHT.pool * strength(pick.step) }, colour);
          this.counts.pools++;
        }
        const perStep = show === 'a' ? LIGHT.motes : show === 'b' ? LIGHT.glints : LIGHT.shapes;
        const count = yieldLightCount(perStep, pick.step, second);
        for (let i = 0; i < count; i++) {
          const n = 1300 + order * 400 + i * 11, p = place(n);
          const ground = surfaceHeight(tile, p.x, p.z) as number;
          if (show === 'b') {
            push({ x: c.x + p.x, y: ground + LIGHT.lift * 2, z: c.z + p.z, size: LIGHT.glintSize, type: GLINT, kind, phase: h(n + 1), rnd: h(n + 2), strength: 1 }, colour);
            this.counts.glints++;
          } else {
            // Spread the starts over the whole life, so the hex never pulses as one.
            push({ x: c.x + p.x, y: ground + .05, z: c.z + p.z, size: show === 'a' ? LIGHT.moteSize : LIGHT.shapeSize[pick.kind], type: show === 'a' ? MOTE : SHAPE, kind,
              phase: (i + h(n + 1)) / count, rnd: h(n + 2), strength: 1 }, colour);
            if (show === 'a') this.counts.motes++; else this.counts.shapes++;
          }
        }
      });
    });
    if (!quads.length) return;
    const geometry = this.geometry = new InstancedBufferGeometry();
    const plane = new PlaneGeometry(2, 2);
    geometry.setIndex(plane.getIndex()); geometry.setAttribute('position', plane.getAttribute('position'));
    const at = new Float32Array(quads.length * 3), seed = new Float32Array(quads.length * 4), tint = new Float32Array(quads.length * 4), size = new Float32Array(quads.length);
    quads.forEach((quad, i) => {
      at.set([quad.x, quad.y, quad.z], i * 3);
      seed.set([quad.phase, quad.rnd, quad.type, quad.kind], i * 4);
      tint.set([tints[i]!.r, tints[i]!.g, tints[i]!.b, quad.strength], i * 4);
      size[i] = quad.size;
    });
    geometry.setAttribute('aAt', new InstancedBufferAttribute(at, 3));
    geometry.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4));
    geometry.setAttribute('aTint', new InstancedBufferAttribute(tint, 4));
    geometry.setAttribute('aSize', new InstancedBufferAttribute(size, 1));
    geometry.instanceCount = quads.length;
    for (const offset of [-period, 0, period]) {
      const mesh = new Mesh(geometry, this.material);
      // The quads move in the shader, so the bounds three would measure are wrong; the layer is small and is never culled.
      mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.position.x = offset; mesh.renderOrder = 6;
      this.group.add(mesh); this.meshes.push(mesh);
    }
  }

  private clear(): void {
    for (const mesh of this.meshes) this.group.remove(mesh);
    this.meshes = [];
    this.geometry?.dispose(); this.geometry = null;
    this.shown.clear();
    this.counts.hexes = this.counts.motes = this.counts.glows = this.counts.pools = this.counts.glints = this.counts.shapes = 0;
  }

  dispose(): void { this.clear(); this.material.dispose(); }
}
