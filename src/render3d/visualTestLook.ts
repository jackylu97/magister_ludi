/**
 * The shader side of the visual test version (batch V1, `docs/flags.md` item
 * (nnnnnnn)). `visualTest.ts` says which switches are on; this module turns
 * that into uniforms and holds the shader code each switch adds.
 *
 * The cost rule of the flags item decides the shape of everything here: no
 * full-screen pass, no rebuild on a frame, no new draw call for each hex, and
 * no allocation on a frame. So every switch that can be a uniform is one. The
 * shader code for a switch is always compiled in, and the uniform picks the old
 * or the new picture. A toggle is therefore one uniform write, and the old
 * picture is the same as before batch V1 when the switch is off.
 *
 * Every uniform object below is shared by reference: each material copies the
 * object into its own uniform list, so one write reaches every program.
 *
 * Rendering never touches the simulation's random numbers (CLAUDE.md, hard
 * rule 4). The patterns hash world coordinates in the shader.
 */

import { Color, Vector2, Vector3, Vector4, type IUniform, type Material, type WebGLProgramParametersWithUniforms } from 'three';

import { VIEW3D } from './lookData';
import { type VisualTestState, visualTest } from './visualTest';

const VT = VIEW3D.visualTest;
const sea = VT.sea, clouds = VT.clouds, idle = VT.idle, rimLight = VT.light, tiles = VT.tiles;

/** The shared uniforms. One object for every program, so a write reaches all of them. */
export const VTEST_UNIFORMS = {
  /** Seconds, written on every drawn frame. The one clock every moving thing reads. */
  vtestTime: { value: 0 } as IUniform<number>,
  vtestSea: { value: 1 } as IUniform<number>,
  vtestClouds: { value: 1 } as IUniform<number>,
  vtestIdle: { value: 1 } as IUniform<number>,
  /** Switch 11. 1 while each hex is drawn with a tile's edge. */
  vtestTiles: { value: 1 } as IUniform<number>,
  /** width, soft, dark, light. */
  vtestTile: { value: new Vector4(tiles.width, tiles.soft, tiles.dark, tiles.light) },
  vtestTileLip: { value: tiles.lipWidth } as IUniform<number>,
  /** Switch 10. 1 while the rim light and the deeper shade are on. */
  vtestLight: { value: 1 } as IUniform<number>,
  /** The rim light's colour times its strength, and its power in w. */
  vtestRim: { value: new Vector4(...new Color(rimLight.rim).multiplyScalar(rimLight.rimStrength).toArray(), rimLight.rimPower) },
  /** rimInShade, shadeDeepen. */
  vtestShade: { value: new Vector2(rimLight.rimInShade, rimLight.shadeDeepen) },
  vtestShadeTint: { value: new Vector3(...rimLight.shadeTint) },
  /** The resource pins' size, from the zoom. Written by the renderer when the zoom changes. */
  vtestPinScale: { value: 1 } as IUniform<number>,
  /** The board's wrap period in world units, so the cloud pattern repeats exactly once a map width. */
  vtestPeriod: { value: 0 } as IUniform<number>,

  vtestSeaShallow: { value: new Color(sea.shallow) },
  vtestSeaCoast: { value: new Color(sea.coast) },
  vtestSeaOcean: { value: new Color(sea.ocean) },
  vtestSeaDeep: { value: new Color(sea.deep) },
  vtestSeaLake: { value: new Color(sea.lake) },
  vtestSeaShelfLine: { value: new Color(sea.shelfLine) },
  vtestSeaFoam: { value: new Color(sea.foam) },
  vtestSeaGlint: { value: new Color(sea.glint) },
  /** coastRange, deepRange, edgeSoftness, patch. */
  vtestSeaShape: { value: new Vector4(sea.coastRange, sea.deepRange, sea.edgeSoftness, sea.patch) },
  /** edgeWobble, edgeWobbleScale, edgeFine, edgeBand. The irregular edge between coast and ocean. */
  vtestSeaEdge: { value: new Vector4(sea.edgeWobble, sea.edgeWobbleScale, sea.edgeFine, sea.edgeBand) },
  vtestSeaEdgeTone: { value: sea.edgeBandTone } as IUniform<number>,
  vtestSeaSand: { value: new Color(sea.sand) },
  /** waveSlope, waveScale, waveSpeed, glintPower. */
  vtestSeaWave: { value: new Vector4(sea.waveSlope, sea.waveScale, sea.waveSpeed, sea.glintPower) },
  /** The glint's colour times its strength. */
  vtestSeaSpec: { value: new Color(sea.glint).multiplyScalar(sea.glintStrength) },
  /** glintTilt, sheen. */
  vtestSeaSun: { value: new Vector2(sea.glintTilt, sea.sheen) },
  /** shelfLineInset, shelfLineWidth, shelfLineStrength. */
  vtestSeaShelf: { value: new Vector3(sea.shelfLineInset, sea.shelfLineWidth, sea.shelfLineStrength) },
  /** foamOffset, foamWidth, foamStrength, foamBreak. */
  vtestSeaFoamShape: { value: new Vector4(sea.foamOffset, sea.foamWidth, sea.foamStrength, sea.foamBreak) },
  /** glintStrength, glintSpeed. */
  vtestSeaGlintShape: { value: new Vector2(sea.glintStrength, sea.glintSpeed) },

  /** scale, speed, cover, softness. */
  vtestCloud: { value: new Vector4(clouds.scale, clouds.speed, clouds.cover, clouds.softness) },
  vtestCloudStrength: { value: clouds.strength } as IUniform<number>,

  /** bobHeight, bobSpeed, bobRoll. */
  vtestBob: { value: new Vector3(idle.bobHeight, idle.bobSpeed, idle.bobRoll) },
  /** smokeRise, smokeSize, smokeSpeed, smokeDrift. */
  vtestSmoke: { value: new Vector4(idle.smokeRise, idle.smokeSize, idle.smokeSpeed, idle.smokeDrift) },
  /** flagWave, flagSpeed. */
  vtestFlag: { value: new Vector2(idle.flagWave, idle.flagSpeed) },
};

type UniformName = keyof typeof VTEST_UNIFORMS;

/** Writes the on/off uniforms for a state. The renderer calls it on every change. */
export function syncVisualUniforms(state: VisualTestState = visualTest()): void {
  VTEST_UNIFORMS.vtestSea.value = state.sea ? 1 : 0;
  VTEST_UNIFORMS.vtestClouds.value = state.clouds ? 1 : 0;
  VTEST_UNIFORMS.vtestIdle.value = state.idle ? 1 : 0;
  VTEST_UNIFORMS.vtestLight.value = state.light ? 1 : 0;
  VTEST_UNIFORMS.vtestTiles.value = state.tiles ? 1 : 0;
}
syncVisualUniforms();

/** Copies the named uniforms into a program's list, by reference. */
export function shareUniforms(shader: WebGLProgramParametersWithUniforms, names: readonly UniformName[]): void {
  for (const name of names) shader.uniforms[name] = VTEST_UNIFORMS[name];
}

/** The GLSL declarations for the named uniforms. */
export function declareUniforms(names: readonly UniformName[]): string {
  return names.map((name) => {
    const value = VTEST_UNIFORMS[name].value as unknown;
    const type = value instanceof Color ? 'vec3' : value instanceof Vector4 ? 'vec4'
      : value instanceof Vector3 ? 'vec3' : value instanceof Vector2 ? 'vec2' : 'float';
    return `uniform ${type} ${name};`;
  }).join('\n');
}

/** A cheap hash of a world cell, and smooth value noise over it. GLSL. */
const NOISE = `
float vtestHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vtestNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(vtestHash(i), vtestHash(i + vec2(1.0, 0.0)), u.x),
             mix(vtestHash(i + vec2(0.0, 1.0)), vtestHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

// --- 1. the sea --------------------------------------------------------------

export const SEA_UNIFORMS: readonly UniformName[] = [
  'vtestSea', 'vtestSeaShallow', 'vtestSeaCoast', 'vtestSeaOcean', 'vtestSeaDeep', 'vtestSeaLake',
  'vtestSeaShelfLine', 'vtestSeaFoam', 'vtestSeaGlint', 'vtestSeaShape', 'vtestSeaShelf', 'vtestSeaFoamShape',
  'vtestSeaGlintShape', 'vtestSeaEdge', 'vtestSeaEdgeTone', 'vtestSeaSand', 'vtestSeaWave', 'vtestSeaSpec', 'vtestSeaSun',
];

/**
 * The new sea, painted from the three numbers `seaField.ts` bakes on each water
 * vertex (`paintedWater`):
 * - x: the distance to the nearest shore, in world units. Negative on the
 *   water under a land hex; below −5 on a river, which keeps its old paint;
 * - y: the signed distance to the edge between coast and ocean hexes, positive
 *   inside an ocean hex;
 * - z: how many hexes the water hex is from land, interpolated across the hex;
 *   below zero on a lake.
 *
 * Coast hexes take a light teal and ocean hexes a deep blue, with a thin pale
 * line on the coast side of the edge between them, like a depth line on a sea
 * chart. That line and the change of colour are what make the two kinds of hex
 * read apart at a glance. The ocean darkens further from land. The hard pale
 * ring the old painter drew at every shore is replaced by a soft foam line that
 * breaks up and moves slowly, and sparse glints drift on the open water. The
 * time is `studyTime`, the clock the old water already read.
 */
export const SEA_GLSL = {
  vertexHead: 'attribute vec3 paintedWater;\nvarying vec3 vPaintedWater;\n',
  vertex: 'vPaintedWater = paintedWater;\n',
  fragmentHead: `varying vec3 vPaintedWater;\n${declareUniforms(SEA_UNIFORMS)}\n${NOISE}
// What the lighting stage needs from the paint stage: the wave's normal in
// world space, and 1 on open sea (0 on a river, which keeps its old paint).
vec3 vtestSeaNormal = vec3(0.0, 1.0, 0.0);
float vtestSeaMask = 0.0;
float vtestSeaGlitter = 0.0;
float vtestSwell(vec2 p, float time) {
  float s = vtestSeaWave.y, v = vtestSeaWave.z;
  return vtestNoise(p * s + vec2(time * v, time * v * .6)) * .55
    + vtestNoise(p * s * 2.3 + vec2(-time * v * 1.3, time * v * .9)) * .30
    + vtestNoise(p * s * 5.7 + vec2(time * v * 1.9, -time * v * 1.4)) * .15;
}
vec3 vtestSeaPaint(vec3 water, vec2 p, float time) {
  // The north star is Islanders and Dorfromantik (docs/art-pass.md): the sea is
  // the quietest surface on the board. Two flat, matte tones, a soft pale
  // shore, and a few drawn ripple lines that drift. No swell and no glitter.
  float shore = max(water.x, 0.0);
  float deep = water.z;
  // Shallow against deep: one soft edge that wanders slowly, so it follows no
  // hex line, and is the same tone on each side of it.
  float wobble = (vtestNoise(p * .45) - .5) * 1.0 + (vtestNoise(p * 1.3 + 4.1) - .5) * .25;
  float t = clamp((deep - .55 + wobble) / max(vtestSeaShape.y, 1e-3), 0.0, 1.0);
  vec3 paint = mix(vtestSeaCoast, vtestSeaOcean, smoothstep(.30, .30 + vtestSeaShape.z, t));
  if (deep < 0.0) paint = vtestSeaLake;
  // The shore: the water pales toward land, and ends in one soft light line.
  paint = mix(paint, vtestSeaShallow, exp(-shore * vtestSeaFoamShape.x) * .7);
  float lip = exp(-shore * vtestSeaFoamShape.y);
  paint = mix(paint, vtestSeaFoam, clamp(lip * vtestSeaFoamShape.z, 0.0, 1.0));
  // Ripples: short pale strokes, few and slow, each fading in and out.
  vec2 q = p + vec2(time * vtestSeaGlintShape.y, time * vtestSeaGlintShape.y * .3);
  vec2 g = q * vec2(1.25, 3.1);
  vec2 cell = floor(g), f = fract(g) - .5;
  float pick = vtestHash(cell);
  f.x += (vtestHash(cell + 7.0) - .5) * .5;
  float life = smoothstep(.2, 1.0, .5 + .5 * sin(time * .5 + pick * 60.0));
  float stroke = (1.0 - smoothstep(.035, .075, abs(f.y + sin(f.x * 6.0) * .03))) * (1.0 - smoothstep(.16, .34, abs(f.x)));
  float ripple = step(.80, pick) * stroke * life * smoothstep(.25, .6, shore);
  paint = mix(paint, vtestSeaGlint, ripple * vtestSeaGlintShape.x);
  return paint;
}
`,
  /** After `#include <color_fragment>`, with `p` the world xz and `studyTime` the clock. */
  fragment: 'if (vtestSea > .5 && vPaintedWater.x > -5.0) diffuseColor.rgb = vtestSeaPaint(vPaintedWater, p, studyTime);\n',
};

// --- 7. cloud shadows ----------------------------------------------------------

export const CLOUD_UNIFORMS: readonly UniformName[] = ['vtestTime', 'vtestClouds', 'vtestCloud', 'vtestCloudStrength', 'vtestPeriod'];

/**
 * One slow pattern of cloud shadows, multiplied into the sun term of the
 * painterly shading. It moves the fragment toward the cast-shadow paint, so a
 * cloud's shadow is the same blue as a hill's. The noise lattice repeats once a
 * map width (`vtestPeriod`), so the pattern meets itself at the wrap seam and
 * does not jump when the camera wraps.
 */
export const CLOUD_GLSL = {
  head: `${declareUniforms(CLOUD_UNIFORMS)}
float vtestCloudHash(vec2 p, float n) { p.x = mod(p.x, n); return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vtestCloudNoise(vec2 p, float n) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(vtestCloudHash(i, n), vtestCloudHash(i + vec2(1.0, 0.0), n), u.x),
             mix(vtestCloudHash(i + vec2(0.0, 1.0), n), vtestCloudHash(i + vec2(1.0, 1.0), n), u.x), u.y);
}
float vtestCloudShade(vec2 p) {
  if (vtestClouds < .5) return 1.0;
  float cells = max(1.0, floor(vtestPeriod * vtestCloud.x + .5));
  float sx = vtestPeriod > 0.0 ? cells / vtestPeriod : vtestCloud.x;
  vec2 q = vec2(p.x * sx, p.y * vtestCloud.x) + vec2(vtestTime * vtestCloud.y, vtestTime * vtestCloud.y * .4);
  float n = vtestCloudNoise(q, cells) * .62 + vtestCloudNoise(q * 2.0 + 5.3, cells * 2.0) * .28
    + vtestCloudNoise(q * 4.0 + 1.7, cells * 4.0) * .10;
  float cloud = smoothstep(vtestCloud.z - vtestCloud.w, vtestCloud.z + vtestCloud.w, n);
  return 1.0 - cloud * vtestCloudStrength;
}
`,
  find: 'float visible=smoothstep(.10,.95,getShadowMask());',
  replace: 'float visible=smoothstep(.10,.95,getShadowMask())*vtestCloudShade(paintPosition.xz);',
};

/**
 * Adds the cloud shadows to a material the painterly style has registered.
 * Chains its compile hook, so it runs after the painterly code it edits.
 */
export function installClouds(material: Material): void {
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = function(shader, renderer) {
    previous.call(this, shader, renderer);
    if (!shader.fragmentShader.includes(CLOUD_GLSL.find)) return;
    shareUniforms(shader, CLOUD_UNIFORMS);
    shader.fragmentShader = `${CLOUD_GLSL.head}\n${shader.fragmentShader.replace(CLOUD_GLSL.find, CLOUD_GLSL.replace)}`;
  };
  material.customProgramCacheKey = () => `${key()}:vtest-clouds`;
  material.needsUpdate = true;
}

// --- 8. idle motion ------------------------------------------------------------

export const BOB_UNIFORMS: readonly UniformName[] = ['vtestTime', 'vtestIdle', 'vtestBob'];

/**
 * Ships and embarked pieces ride a slow swell. `paintedBob` is 1 on a hull's
 * vertices and absent (read as 0) on everything else, so the material can be
 * shared by every piece of a seat. The phase comes from the instance's own
 * place, so two ships side by side do not move as one. The body, its outline
 * shell and its x-ray ghost all read the same attribute through the same
 * geometry, so all three move together.
 */
const BOB_GLSL = {
  head: `attribute float paintedBob;\n${declareUniforms(BOB_UNIFORMS)}\n`,
  vertex: `
#ifdef USE_INSTANCING
if (vtestIdle > .5 && paintedBob > .5) {
  vec2 vtestAt = instanceMatrix[3].xz;
  float vtestPhase = vtestAt.x * 1.7 + vtestAt.y * 2.3;
  float vtestSwell = vtestTime * vtestBob.y + vtestPhase;
  transformed.y += vtestBob.x * sin(vtestSwell) + transformed.z * vtestBob.z * sin(vtestSwell * .83 + 1.3);
}
#endif
`,
};

const bobbing = new WeakSet<Material>();

/** Adds the swell to a material that draws pieces. Safe to call twice. */
export function installBob(material: Material): void {
  if (bobbing.has(material)) return;
  bobbing.add(material);
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = function(shader, renderer) {
    previous.call(this, shader, renderer);
    shareUniforms(shader, BOB_UNIFORMS);
    shader.vertexShader = `${BOB_GLSL.head}${shader.vertexShader}`
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${BOB_GLSL.vertex}`);
  };
  material.customProgramCacheKey = () => `${key()}:vtest-bob`;
  // A piece that is not a hull has no `paintedBob`; three reads this stated
  // zero for it on any material that names one (`paintedBoard.js` relies on
  // the same thing for its surfaces).
  const stated = material as Material & { defaultAttributeValues?: Record<string, number[]> };
  stated.defaultAttributeValues = { ...(stated.defaultAttributeValues ?? {}), paintedBob: [0] };
  material.needsUpdate = true;
}

// --- 6. quieter pins -------------------------------------------------------------

/**
 * The resource pin's size for a zoom: full size at `pins.nearPixels` pixels a
 * hex and above, `pins.farScale` at `pins.farPixels` and below, smooth between.
 */
export function pinScaleFor(pixelsPerHex: number): number {
  const pins = VT.pins;
  const span = Math.max(1e-6, pins.nearPixels - pins.farPixels);
  const t = Math.max(0, Math.min(1, (pixelsPerHex - pins.farPixels) / span));
  const eased = t * t * (3 - 2 * t);
  return pins.farScale + (1 - pins.farScale) * eased;
}

// --- 10. rim light and a deeper cool shade -----------------------------------

export const LIGHT_UNIFORMS: readonly UniformName[] = ['vtestLight', 'vtestRim', 'vtestShade', 'vtestShadeTint'];

/**
 * Two small terms in the painterly shading (`painterly.js` splices them in):
 * - the shade and cast-shadow paint is made a little deeper and cooler, so a
 *   thing's dark side separates from its lit side by colour as well as value;
 * - a rim light on things that stand up (trees, rocks, buildings, pieces): a
 *   facet that turns away from the camera takes a pale cool light, strongest
 *   on the side the sun does not reach. The camera is orthographic, so the view
 *   direction is one fixed vector and the term is a few instructions.
 * The ground and the water take the shade term only.
 */
export const LIGHT_GLSL = {
  head: declareUniforms(LIGHT_UNIFORMS),
  /** After `shadowPaint` is computed. */
  shade: 'if (vtestLight > .5) shadowPaint *= vtestShade.y * vtestShadeTint;\n',
  /** After `outgoingLight` is composed; `light` is the sun term, `visible` the cast shadow. */
  rim: `if (vtestLight > .5) {
  float vtestEdge = pow(1.0 - clamp(nonPerturbedNormal.z, 0.0, 1.0), vtestRim.w);
  float vtestLit = light * visible;
  outgoingLight += vtestRim.rgb * vtestEdge * mix(1.0, vtestShade.x, vtestLit);
}
`,
};

/**
 * The sea's light, spliced into the painterly shading of the water material
 * after the paint is lit. The paint stage left the swell's normal in
 * `vtestSeaNormal`. A facet of the swell that tilts toward the sun by the right
 * amount flashes, which gives broken, moving glints, and the whole surface takes
 * a soft sheen from the same slope. The camera is orthographic, so the view
 * direction is fixed and no reflection vector is needed.
 */
export const SEA_LIGHT_GLSL = `if (vtestSea > .5 && vtestSeaMask > .5) {
  vec3 seaN = normalize((viewMatrix * vec4(vtestSeaNormal, 0.0)).xyz);
  vec3 seaUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  vec3 seaL = directionalLights[0].direction;
  vec3 seaAim = normalize(seaUp + seaL * vtestSeaSun.x);
  float seaGlint = pow(max(dot(seaN, seaAim), 0.0), vtestSeaWave.w);
  outgoingLight *= 1.0 + (dot(seaN, seaL) - dot(seaUp, seaL)) * vtestSeaSun.y;
  outgoingLight += vtestSeaSpec * seaGlint * vtestSeaGlitter * (.25 + .75 * visible);
}
`;

// --- 11. hexes as tiles ----------------------------------------------------------

export const TILE_UNIFORMS: readonly UniformName[] = ['vtestTiles', 'vtestTile', 'vtestTileLip'];

/**
 * Draws each land hex as a tile: a fine dark groove on the hex line and a
 * slightly lighter lip just inside it, like the bevel of a cut tile. The
 * distance to the hex's edge is worked out from the world position in the
 * fragment (pointy-top hexes of radius 1, centres at x = sqrt(3)(col + row/2)
 * in axial terms and z = 1.5 row), so nothing is added to the geometry. The
 * groove fades out when a hex covers few pixels, so a far view does not shimmer.
 */
export const TILE_GLSL = {
  head: `${declareUniforms(TILE_UNIFORMS)}
float vtestHexEdge(vec2 p) {
  float xf = p.x * 0.57735027 - p.y * 0.33333333, zf = p.y * 0.66666667, yf = -xf - zf;
  float rx = floor(xf + .5), ry = floor(yf + .5), rz = floor(zf + .5);
  float dx = abs(rx - xf), dy = abs(ry - yf), dz = abs(rz - zf);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy <= dz) rz = -rx - ry;
  vec2 d = abs(p - vec2(1.7320508 * (rx + rz * .5), 1.5 * rz));
  return 0.8660254 - max(d.x, d.x * .5 + d.y * 0.8660254);
}
`,
  /** After the land's pigment is set, with `p` the world xz. */
  fragment: `if (vtestTiles > .5) {
  float tileEdge = vtestHexEdge(p);
  float tileAa = fwidth(tileEdge) * 1.2;
  float tileFar = 1.0 - smoothstep(.012, .05, fwidth(p.x));
  float groove = 1.0 - smoothstep(vtestTile.x, vtestTile.x + vtestTile.y + tileAa, tileEdge);
  float lip = (1.0 - smoothstep(vtestTileLip, vtestTileLip * 2.2, tileEdge)) * (1.0 - groove);
  diffuseColor.rgb *= (1.0 - groove * vtestTile.z * tileFar) * (1.0 + lip * vtestTile.w * tileFar);
}
`,
};
