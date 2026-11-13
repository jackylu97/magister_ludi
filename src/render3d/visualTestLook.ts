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

import { Color, DataTexture, Matrix4, Texture, Vector2, Vector3, Vector4, type IUniform, type Material, type WebGLProgramParametersWithUniforms } from 'three';

import { VIEW3D } from './lookData';
import { type VisualTestState, visualTest } from './visualTest';

const VT = VIEW3D.visualTest;
const sea = VT.sea, clouds = VT.clouds, idle = VT.idle, rimLight = VT.light, tiles = VT.tiles;
// A free coast (`freeCoast.js`) is smooth already, so its bands wander less and its painted sand is thin.
const bands = VT.coast.free ? { ...sea.bands, ...VT.coast.bands } : sea.bands;
// The tone of the study's plain water (`body` in `waterPigment.js`, #4b7db6), which a baked stroke is measured against.
const BODY_TONE = (c => .2126 * c.r + .7152 * c.g + .0722 * c.b)(new Color('#4b7db6'));
const shelfBands = VT.coast.shelf, mouthBands = VT.coast.mouth, open = VT.coast.open, sun = open.sun, mirror = open.mirror;

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
  /** Switch 12. 1 while things that stand up take a tone by height. */
  vtestGradient: { value: 1 } as IUniform<number>,
  /** foot, top, span. */
  vtestGradientShape: { value: new Vector3(VT.gradient.foot, VT.gradient.top, VT.gradient.span) },
  /** The resource pins' size, from the zoom. Written by the renderer when the zoom changes. */
  vtestPinScale: { value: 1 } as IUniform<number>,
  /** The board's wrap period in world units, so the cloud pattern repeats exactly once a map width. */
  vtestPeriod: { value: 0 } as IUniform<number>,

  /**
   * The sea's distances as a picture of the map (`seaDistances.js`): to the
   * waterline, to the line between coast and ocean, and to the nearest river
   * mouth. The renderer sets it for each board that has a free coast.
   */
  vtestSeaField: { value: new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1) } as IUniform<Texture>,
  /** 1 while `vtestSeaField` holds a board's distances. */
  vtestSeaFieldOn: { value: 0 } as IUniform<number>,
  /** The picture's west edge and north edge in world units, then one over its width and one over its depth. */
  vtestSeaFieldShape: { value: new Vector4(0, 0, 1, 1) },
  /** The river's water, which the sea takes at a river mouth. */
  vtestSeaMouth: { value: new Color(VT.organicRivers.water) },
  /** Which pattern the open water of a free coast carries: 1 contours, 2 cells, 3 soft patches, 4 swell lines, 5 calm water with the sun's glare. The scene page's `sea=` option sets it. */
  vtestSeaPattern: { value: VT.coast.open.pattern } as IUniform<number>,
  /** Pattern 5: the sun's glare on calm water, the sky's tone far from the eye, and the size of the picture in pixels (the renderer writes it each frame). */
  vtestSeaSunGlare: { value: new Color(VT.coast.open.sun.color) },
  vtestSeaSky: { value: new Color(VT.coast.open.sun.skyColor) },
  vtestSeaCalm: { value: new Color(VT.coast.open.sun.calmColor) },
  vtestSeaSunStroke: { value: new Color(VT.coast.open.sun.strokeColor) },
  vtestViewport: { value: new Vector2(1, 1) },
  /** The mirror's picture, the matrix from a world point to its place in it, and 1 while this frame has one (`seaMirror.ts`). */
  vtestMirrorMap: { value: new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1) } as IUniform<Texture>,
  vtestMirrorMatrix: { value: new Matrix4() },
  vtestMirrorOn: { value: 0 } as IUniform<number>,
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
  /** beachFalloff, beachStrength. */
  vtestSeaBeach: { value: new Vector2(sea.beachFalloff, sea.beachStrength) },
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
  VTEST_UNIFORMS.vtestGradient.value = state.gradient ? 1 : 0;
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
    const type = value instanceof Texture ? 'sampler2D' : value instanceof Matrix4 ? 'mat4' : value instanceof Color ? 'vec3' : value instanceof Vector4 ? 'vec4'
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
  'vtestSea', 'vtestSeaField', 'vtestSeaFieldOn', 'vtestSeaFieldShape', 'vtestSeaMouth', 'vtestSeaPattern', 'vtestMirrorMap', 'vtestMirrorMatrix', 'vtestMirrorOn', 'vtestSeaSunGlare', 'vtestSeaSky', 'vtestSeaCalm', 'vtestSeaSunStroke', 'vtestViewport', 'vtestSeaShallow', 'vtestSeaCoast', 'vtestSeaOcean', 'vtestSeaDeep', 'vtestSeaLake',
  'vtestSeaShelfLine', 'vtestSeaFoam', 'vtestSeaGlint', 'vtestSeaShape', 'vtestSeaShelf', 'vtestSeaFoamShape',
  'vtestSeaGlintShape', 'vtestSeaEdge', 'vtestSeaEdgeTone', 'vtestSeaSand', 'vtestSeaBeach', 'vtestSeaWave', 'vtestSeaSpec', 'vtestSeaSun',
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
  vertexHead: 'attribute vec3 paintedWater;\nvarying vec3 vPaintedWater;\nuniform mat4 vtestMirrorMatrix;\nvarying vec4 vMirror;\n',
  vertex: 'vPaintedWater = paintedWater;\nvMirror = vtestMirrorMatrix * modelMatrix * vec4(position, 1.0);\n',
  fragmentHead: `varying vec3 vPaintedWater;\nvarying vec4 vMirror;\n${declareUniforms(SEA_UNIFORMS.filter(name => name !== 'vtestMirrorMatrix'))}\n${NOISE}
// What the lighting stage needs from the paint stage: the wave's normal in
// world space, and 1 on open sea (0 on a river, which keeps its old paint).
vec3 vtestSeaNormal = vec3(0.0, 1.0, 0.0);
float vtestSeaMask = 0.0;
float vtestSeaGlitter = 0.0;
// How much of the swell's own shading the lighting stage keeps. Pattern 5 keeps little: a smooth surface with glints on it.
// The water's baked paint, before the sea's own colours replace it.
vec3 vtestSeaBase = vec3(1.0);
float vtestSeaSheen = 1.0;
// 1 where a stroke of the sun's road is lit at this point. The mirror's picture gives way to it: the light is on the surface.
float vtestSunLit = 0.0;
// What the water mirrors at this point, and how much of it shows (seaMirror.ts).
vec4 vtestSeaMirror = vec4(0.0);
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
  // A beach: wet sand shows under the last of the water, with a slow, uneven
  // reach so the shore is not a copy of the hex line. Then one thin pale line
  // where the water ends.
  float reach = 1.0 + (vtestNoise(p * 1.6) - .5) * .9;
  float sand = exp(-shore * vtestSeaBeach.x / reach);
  paint = mix(paint, vtestSeaSand, clamp(sand * vtestSeaBeach.y, 0.0, 1.0));
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

// The sun's road on calm water: a soft warm glow, and on it short level strokes
// of light, many at the middle and few at the edge, each coming and going.
// The glare is 1 at the middle of the road and falls to 0 away from it.
float vtestSunGlare() {
  vec2 screen = gl_FragCoord.xy / vtestViewport;
  vec2 from = (screen - vec2(${sun.x.toFixed(3)}, ${sun.y.toFixed(3)})) / vec2(${sun.width.toFixed(3)}, ${sun.height.toFixed(3)});
  // The road is wider near the eye, at the bottom of the screen, and narrower far off.
  from.x /= mix(1.0 + ${sun.spread.toFixed(3)}, 1.0 - ${sun.spread.toFixed(3)}, screen.y);
  return exp(-dot(from, from));
}
vec3 vtestSunRoad(vec3 paint, vec2 p, float time, float glare, float wet, float glow) {
  // The glow lifts the water's own blue and adds a trace of the sun's tone. Mixing toward the warm tone alone turned the blue grey.
  paint *= 1.0 + glare * ${sun.strength.toFixed(3)} * wet * glow;
  paint = mix(paint, vtestSeaSunGlare, glare * glare * ${sun.warm.toFixed(3)} * wet * glow);
  // The strokes lie on the water, but their size follows the zoom in steps of two, so they are a few pixels thick at any distance and never turn into grain.
  float grain = exp2(floor(log2((fwidth(p.x) + 1e-5) * ${sun.strokePixels.toFixed(1)}) + .5));
  vec2 sg = p / grain * vec2(${sun.strokeLength.toFixed(3)}, ${sun.strokeRows.toFixed(3)});
  float srow = floor(sg.y);
  sg.x += vtestHash(vec2(srow, 3.0)) * 7.0 + time * ${sun.strokeDrift.toFixed(3)} * (vtestHash(vec2(srow, 9.0)) - .5);
  vec2 sc = vec2(floor(sg.x), srow), sf = fract(sg) - .5;
  float pick = vtestHash(sc + 31.7);
  // Longer and closer together at the middle of the road, so they nearly join there.
  // Never longer than its own cell, or the next cell would cut it off.
  float long_ = min(.46, (.14 + .26 * vtestHash(sc + 5.3)) * (.7 + .9 * glare));
  float shape = 1.0 - smoothstep(.75, 1.0, length(sf / vec2(long_, .5 * ${sun.strokeFill.toFixed(3)})));
  float alive = .5 + .5 * sin(time * ${sun.strokeFlicker.toFixed(3)} + pick * 50.0);
  // A stroke comes in gradually as the road reaches it. A hard switch made strokes pop in and out while the board was panned.
  float lit = smoothstep(0.0, .12, pick - (1.0 - glare * glare * ${sun.strokes.toFixed(3)})) * shape * smoothstep(.15, .6, alive);
  // Not every stroke is as bright as the next.
  lit *= .55 + .45 * vtestHash(sc + 11.9);
  vtestSunLit = lit * wet;
  paint = mix(paint, vtestSeaSunStroke, lit * wet * ${sun.strokeStrength.toFixed(3)});
  // Glints (the user, 2026-11-13: fewer sparkles, and those that do sparkle
  // shimmer more, in the shape of bloom, with light that goes up and down as
  // well as sideways). A few points on the road flare: a bright core, a soft
  // halo, and four thin rays, two level and two upright. Each one swells and
  // fades in its own time.
  vec2 gg = p / grain * ${sun.glintCells.toFixed(3)};
  vec2 gc = floor(gg), gf = fract(gg) - .5;
  float gpick = vtestHash(gc + 71.3);
  // The glint moves a little inside its cell and is faded to nothing before the cell's edge, so a ray is never cut off by the next cell.
  float inside = (1.0 - smoothstep(.34, .5, abs(gf.x))) * (1.0 - smoothstep(.34, .5, abs(gf.y)));
  gf -= (vec2(vtestHash(gc + 2.7), vtestHash(gc + 8.1)) - .5) * .3;
  float pulse = pow(.5 + .5 * sin(time * ${sun.glintSpeed.toFixed(3)} * (.6 + .8 * vtestHash(gc + 4.4)) + gpick * 60.0), 4.0);
  float size = ${sun.glintSize.toFixed(3)} * (.6 + .6 * vtestHash(gc + 6.6)) * (.45 + .55 * pulse);
  vec2 ga = abs(gf) / size;
  float core = exp(-dot(ga, ga) * 30.0);
  float halo = exp(-dot(ga, ga) * 2.2) * ${sun.glintHalo.toFixed(3)};
  float rays = exp(-ga.y * 22.0) * exp(-ga.x * 1.6) + exp(-ga.x * 22.0) * exp(-ga.y * 2.4) * ${sun.glintUp.toFixed(3)};
  float flare = smoothstep(0.0, .1, gpick - (1.0 - glare * glare * ${sun.glints.toFixed(3)})) * inside * pulse * clamp(core + halo + rays, 0.0, 1.0);
  vtestSunLit = max(vtestSunLit, flare * wet);
  paint = mix(paint, vtestSeaSunStroke, flare * wet);
  return paint;
}

// The coast in bands (2026-11-13, after A Short Hike, as the river was). From
// the land outward: pale sand, a thin white foam line that laps in and out, a
// crisp band of turquoise shallows, the coast's blue, then the ocean's deeper
// blue. Every edge is a crisp step, and two slow noises make each step wander,
// so none of them copies the hex line. Coast and ocean meet in a step with a
// drawn pale line on the coast side, which keeps the two kinds of hex apart.
float vtestSeaContour(vec2 q) {
  return vtestNoise(q) * .62 + vtestNoise(q * 2.3 + vec2(5.2, 1.3)) * .38;
}
vec3 vtestSeaBands(vec3 water, vec2 p, float time) {
  float shore = max(water.x, 0.0), deep = water.z;
  float slow = vtestNoise(p * 1.7) - .5, fine = vtestNoise(p * 4.3 + 3.7) - .5;
  vec3 paint;
  float mouth = 9.0, free = 0.0, cn = 0.0;
  vec2 cq = vec2(0.0);
  if (vtestSeaFieldOn > .5) {
    // A free coast: the distances come from the picture of the map, so every
    // band's edge is a smooth curve (seaDistances.js). Coast and ocean meet on
    // the smooth line between their hexes, with a small slow wander.
    vec4 field = texture2D(vtestSeaField, (p - vtestSeaFieldShape.xy) * vtestSeaFieldShape.zw);
    shore = max(field.r, 0.0);
    mouth = field.b;
    // One loose edge between the coast's blue and the ocean's, with no drawn line and no second step (after A Short Hike).
    // The edge leans on the same noise as the open water's shapes, so it runs along them and not across them.
    cq = p * ${open.scale.toFixed(3)} + vec2(time * ${open.drift.toFixed(4)}, time * ${(open.drift * .4).toFixed(4)});
    cn = vtestSeaContour(cq);
    float shelf = field.g + (vtestNoise(p * .45) - .5) * ${shelfBands.wander.toFixed(3)} + (cn - .5) * ${open.shelfFine.toFixed(3)};
    // With the sea's brush strokes on (sea.brushed), coast and ocean swap whole painted patches across their edge, as two kinds of land do (the user, 2026-11-13). water.y is then the stroke's own kind: above zero for ocean.
    ${sea.brushed ? 'shelf = water.y;' : ''}
    float width = fwidth(shelf) * 1.2 + 1e-4;
    paint = mix(vtestSeaCoast, vtestSeaOcean, smoothstep(-width, width, shelf));
    free = 1.0;
  } else {
    float wobble = (vtestNoise(p * .45) - .5) * 1.0 + (vtestNoise(p * 1.3 + 4.1) - .5) * .25;
    float t = clamp((deep - .55 + wobble) / max(vtestSeaShape.y, 1e-3), 0.0, 1.0);
    float width = fwidth(t) * 1.2 + 1e-4;
    paint = mix(vtestSeaCoast, vtestSeaOcean, smoothstep(.30 - width, .30 + width, t));
    paint = mix(paint, vtestSeaDeep, smoothstep(${bands.deepAt.toFixed(3)} - width, ${bands.deepAt.toFixed(3)} + width, t));
    // The drawn line on the coast side of the step.
    float drawn = (1.0 - smoothstep(0.0, width * 2.0, abs(t - .30 + ${bands.stepLine.toFixed(4)}) - ${bands.stepLine.toFixed(4)} * .5));
    paint = mix(paint, vtestSeaShelfLine, drawn * ${bands.stepLineStrength.toFixed(3)});
  }
  if (deep < 0.0) paint = vtestSeaLake;
  // The open water (after A Short Hike): large loose shapes in close blues,
  // each with a thin lighter outline, that drift slowly and follow nothing.
  // They are the level lines of a slow noise. The distance to a level is the
  // difference in value over the noise's slope, so a line keeps one width.
  if (free > .5) {
    float pixel = fwidth(p.x) + fwidth(p.y) + 1e-4;
    vec3 line = mix(paint, vtestSeaShallow, ${open.line.toFixed(3)});
    vec3 light = mix(paint, vtestSeaShallow, ${open.light.toFixed(3)}), dark = paint * ${open.dark.toFixed(3)};
    if (vtestSeaPattern < 1.5) {
      // 1. Contours: the level lines of a slow noise, with a tone between them.
      float slope = length(vec2(vtestSeaContour(cq + vec2(.03, 0.0)) - cn, vtestSeaContour(cq + vec2(0.0, .03)) - cn)) / .03 * ${open.scale.toFixed(3)};
      float d1 = (cn - ${open.levels[0]!.toFixed(3)}) / max(slope, .05), d2 = (cn - ${open.levels[1]!.toFixed(3)}) / max(slope, .05), d3 = (cn - ${open.levels[2]!.toFixed(3)}) / max(slope, .05);
      paint = mix(paint, light, smoothstep(-pixel, pixel, d1));
      paint = mix(paint, dark, smoothstep(-pixel, pixel, d2));
      paint = mix(paint, light, smoothstep(-pixel, pixel, d3));
      float drawn = max(max(1.0 - smoothstep(${open.lineWidth.toFixed(4)} - pixel, ${open.lineWidth.toFixed(4)} + pixel, abs(d1)), 1.0 - smoothstep(${open.lineWidth.toFixed(4)} - pixel, ${open.lineWidth.toFixed(4)} + pixel, abs(d2))),
        1.0 - smoothstep(${open.lineWidth.toFixed(4)} - pixel, ${open.lineWidth.toFixed(4)} + pixel, abs(d3)));
      paint = mix(paint, line, drawn);
    } else if (vtestSeaPattern < 2.5) {
      // 2. Cells: a net of thin pale lines, as light makes on shallow water. Each
      // cell has a point that moves slowly; a line runs where two points are equally near.
      vec2 g = p * ${open.cellScale.toFixed(3)} + (vec2(vtestNoise(p * .9), vtestNoise(p * .9 + 7.3)) - .5) * ${open.cellWarp.toFixed(3)};
      vec2 ci = floor(g), cf = fract(g);
      float f1 = 9.0, f2 = 9.0, id = 0.0;
      for (int cy = -1; cy <= 1; cy++) for (int cx = -1; cx <= 1; cx++) {
        vec2 o = vec2(float(cx), float(cy));
        vec2 h = vec2(vtestHash(ci + o), vtestHash(ci + o + 17.3));
        h = .5 + .36 * sin(time * ${open.cellSpeed.toFixed(3)} + 6.2832 * h);
        float d = length(o + h - cf);
        if (d < f1) { f2 = f1; f1 = d; id = vtestHash(ci + o + 3.1); } else if (d < f2) f2 = d;
      }
      float edge = (f2 - f1) / ${open.cellScale.toFixed(3)} * .5;
      paint = mix(paint, id > .5 ? light : dark, ${open.cellTone.toFixed(3)});
      paint = mix(paint, line, 1.0 - smoothstep(${open.lineWidth.toFixed(4)} - pixel, ${open.lineWidth.toFixed(4)} + pixel, edge));
    } else if (vtestSeaPattern < 3.5) {
      // 3. Soft patches, after Islanders: broad lighter and darker areas with no outline.
      paint = mix(paint, mix(paint, vtestSeaShallow, ${open.patchLight.toFixed(3)}), smoothstep(.50, .72, cn));
      paint = mix(paint, paint * ${open.patchDark.toFixed(3)}, smoothstep(.50, .30, cn));
    } else if (vtestSeaPattern > 4.5) {
      // 5. Calm water (the user's reference pictures, 2026-11-13): a deeper,
      // quieter blue, which mirrors the sky. Clouds show in it as broad pale
      // shapes with soft edges, longer from side to side than they are deep.
      paint = mix(paint, vtestSeaCalm, ${sun.deepen.toFixed(3)});
      vec2 sky = vec2(p.x * ${sun.cloudScale.toFixed(3)}, p.y * ${(sun.cloudScale * sun.cloudSquash).toFixed(3)}) + vec2(time * ${sun.cloudDrift.toFixed(4)}, 0.0);
      float cloud = vtestNoise(sky) * .65 + vtestNoise(sky * 2.1 + 4.7) * .35;
      paint = mix(paint, vtestSeaSky, smoothstep(${sun.cloudFrom.toFixed(3)}, ${sun.cloudTo.toFixed(3)}, cloud) * ${sun.cloud.toFixed(3)});
    } else {
      // 4. Swell: long thin pale lines that lie one way, bend a little, break, and travel slowly.
      vec2 sq = vec2(p.x * .96 + p.y * .28, p.y * .96 - p.x * .28);
      float sv = sq.y * ${open.swellRows.toFixed(3)} + (vtestNoise(sq * vec2(.45, .8)) - .5) * ${open.swellBend.toFixed(3)} - time * ${open.swellSpeed.toFixed(3)};
      float row = floor(sv), across = abs(fract(sv) - .5) / ${open.swellRows.toFixed(3)};
      float gate = vtestNoise(vec2(sq.x * ${open.swellBreak.toFixed(3)} + row * 13.7, row * .37));
      float stroke = (1.0 - smoothstep(${open.lineWidth.toFixed(4)} - pixel, ${open.lineWidth.toFixed(4)} + pixel, across)) * smoothstep(.50, .58, gate);
      paint = mix(paint, line, stroke);
    }
  }
  float reach = shore + slow * ${bands.wander.toFixed(3)} + fine * ${(bands.wander * .3).toFixed(3)};
  float soft = fwidth(shore) * 1.2 + 1e-4;
  // Shallows, with a pale drawn line at their outer edge.
  // The shallows' outer edge takes a broader, slower wander of its own, so it does not copy the shore's shape.
  float outer = reach + (vtestNoise(p * .62 + 11.0) - .5) * ${bands.shallowsWander.toFixed(3)};
  // With a free coast the band at the shore is the only band, so its width is uneven at a second, smaller size.
  outer += free * (vtestNoise(p * ${open.scallopScale.toFixed(3)} + 2.0) - .5) * ${open.scallop.toFixed(3)};
  // At a river mouth the river's channel runs out through the shallows to the
  // open water. The channel is joined to the open water with a rounded corner,
  // so the shallows and their drawn line turn in along it and meet the river's
  // own banks. Neither the foam line nor the painted sand crosses the mouth.
  float channel = ${mouthBands.plume.toFixed(3)} - mouth - (vtestNoise(p * 2.3 + 7.0) - .5) * ${mouthBands.wander.toFixed(3)};
  float beyond = outer - ${bands.shallows.toFixed(3)};
  float blend = max(${mouthBands.round.toFixed(3)} - abs(beyond - channel), 0.0) / ${mouthBands.round.toFixed(3)};
  float deepWater = max(beyond, channel) + blend * blend * ${mouthBands.round.toFixed(3)} * .25;
  float clear = smoothstep(${mouthBands.gap.toFixed(3)} - .04, ${mouthBands.gap.toFixed(3)} + .04, mouth);
  float shallows = 1.0 - smoothstep(-soft, soft, deepWater);
  float rim = 1.0 - smoothstep(0.0, soft * 2.0, abs(deepWater) - ${bands.line.toFixed(4)});
  paint = mix(paint, vtestSeaShallow, shallows);
  paint = mix(paint, vtestSeaFoam, rim * ${bands.lineStrength.toFixed(3)});
  // The waterline laps in and out, each stretch of shore in its own time.
  float lap = sin(time * ${bands.lapSpeed.toFixed(3)} + vtestNoise(p * .8) * 6.2832) * ${bands.lap.toFixed(4)};
  float sandEdge = ${bands.sand.toFixed(3)} * (1.0 + slow * ${bands.sandVary.toFixed(3)}) + lap;
  float foam = 1.0 - smoothstep(0.0, soft * 2.0, abs(reach - sandEdge - ${bands.foam.toFixed(4)} * .5) - ${bands.foam.toFixed(4)} * .5);
  foam *= step(${bands.foamGaps.toFixed(3)}, vtestNoise(p * 5.5 + vec2(time * .05, 0.0)));
  // A second, fainter line a little further out, left by the last wave.
  float trail = 1.0 - smoothstep(0.0, soft * 2.0, abs(reach - sandEdge - ${bands.foam.toFixed(4)} * 4.0) - ${bands.foam.toFixed(4)} * .3);
  trail *= step(.55, vtestNoise(p * 4.1 + 9.3 + vec2(0.0, time * .04)));
  paint = mix(paint, vtestSeaFoam, max(foam, trail * .6) * clear);
  paint = mix(paint, vtestSeaSand, (1.0 - smoothstep(sandEdge - soft, sandEdge + soft, reach)) * clear);
  // Ripples: short pale strokes, few and slow, each fading in and out.
  vec2 q = p + vec2(time * vtestSeaGlintShape.y, time * vtestSeaGlintShape.y * .3);
  vec2 g = q * vec2(1.25, 3.1);
  vec2 cell = floor(g), f = fract(g) - .5;
  float pick = vtestHash(cell);
  f.x += (vtestHash(cell + 7.0) - .5) * .5;
  float life = smoothstep(.2, 1.0, .5 + .5 * sin(time * .5 + pick * 60.0));
  float stroke = (1.0 - smoothstep(.035, .075, abs(f.y + sin(f.x * 6.0) * .03))) * (1.0 - smoothstep(.16, .34, abs(f.x)));
  float ripple = step(.80, pick) * stroke * life * smoothstep(${(bands.shallows + .1).toFixed(3)}, ${(bands.shallows + .4).toFixed(3)}, shore);
  // Painted water (the user, 2026-11-13): the open water takes the light and dark of the study's own brush strokes, which the board bakes on the water as it does on the land. vtestSeaBase is that baked paint; its tone against the study's plain water is made stronger and laid on the sea's colour, outside the band at the shore.
  if (free > .5) {
    float tone = dot(vtestSeaBase, vec3(.2126, .7152, .0722)) / ${BODY_TONE.toFixed(4)};
    paint *= 1.0 + clamp((tone - 1.0) * ${open.strokes.toFixed(2)}, -.3, .3) * (1.0 - shallows);
  }
  paint = mix(paint, vtestSeaGlint, ripple * vtestSeaGlintShape.x * mix(1.0, vtestSeaPattern > 4.5 ? 0.0 : ${open.ripples.toFixed(3)}, free));
  if (free > .5 && vtestSeaPattern > 4.5) {
    // 5, the sun. A mirror's picture belongs to the eye and not to the ground,
    // so the sun's road is placed on the screen and stays there while the
    // board moves under it. Calm water is deeper near the eye and paler far off.
    vec2 screen = gl_FragCoord.xy / vtestViewport;
    float wet = smoothstep(sandEdge, sandEdge + .03, reach);
    paint = mix(paint, vtestSeaSky, smoothstep(${sun.skyFrom.toFixed(3)}, 1.0, screen.y) * ${sun.sky.toFixed(3)} * wet);
    paint *= 1.0 - (1.0 - smoothstep(0.0, ${sun.nearTo.toFixed(3)}, screen.y)) * ${sun.near.toFixed(3)} * wet;
    float glare = vtestSunGlare();
    paint = vtestSunRoad(paint, p, time, glare, wet, 1.0);
    // What stands beside the water, upside down (seaMirror.ts): read from the
    // mirror's picture at this point's own place in it, with a small ripple,
    // and laid over the lit water in the lighting stage.
    if (vtestMirrorOn > .5) {
      vec2 at = vMirror.xy / vMirror.w + vec2(sin(p.y * 38.0 + time * 1.3) * ${mirror.ripple.toFixed(4)}, 0.0);
      vec4 seen = texture2D(vtestMirrorMap, at) * .5 + texture2D(vtestMirrorMap, at + vec2(0.0, ${mirror.smear.toFixed(4)})) * .25 + texture2D(vtestMirrorMap, at - vec2(0.0, ${mirror.smear.toFixed(4)})) * .25;
      vtestSeaMirror = vec4(seen.rgb, seen.a * ${mirror.strength.toFixed(3)} * wet * (1.0 - vtestSunLit));
      vtestSeaMask = 1.0; vtestSeaSheen = 0.0;
    }
  }
  return paint;
}
`,
  /** After `#include <color_fragment>`, with `p` the world xz and `studyTime` the clock. */
  fragment: `vtestSeaBase = diffuseColor.rgb;\nif (vtestSea > .5 && vPaintedWater.x > -5.0) diffuseColor.rgb = ${sea.style === 'bands' ? 'vtestSeaBands' : 'vtestSeaPaint'}(vPaintedWater, p, studyTime);\n// A river keeps its own paint, and takes the strokes of the sun's road where it runs under it: a wider road, since a river is thin, and no glow, which greys its blue.\nelse if (vtestSea > .5 && vtestSeaFieldOn > .5 && vtestSeaPattern > 4.5) diffuseColor.rgb = vtestSunRoad(diffuseColor.rgb, p, studyTime, sqrt(vtestSunGlare()), ${sun.river.toFixed(3)}, 0.0);\n`,
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

export const LIGHT_UNIFORMS: readonly UniformName[] = ['vtestLight', 'vtestRim', 'vtestShade', 'vtestShadeTint', 'vtestGradient', 'vtestGradientShape'];

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
  /**
   * Switch 12, before the pigment is read: a thing is darker at its foot and
   * lighter at its top, as in the reference games. `paintFoot` is the world
   * height of the thing's own origin.
   */
  gradient: 'if (vtestGradient > .5) diffuseColor.rgb *= mix(vtestGradientShape.x, vtestGradientShape.y, smoothstep(0.0, vtestGradientShape.z, paintPosition.y - paintFoot));\n',
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
  outgoingLight *= 1.0 + (dot(seaN, seaL) - dot(seaUp, seaL)) * vtestSeaSun.y * vtestSeaSheen;
  outgoingLight += vtestSeaSpec * seaGlint * vtestSeaGlitter * (.25 + .75 * visible);
  outgoingLight = mix(outgoingLight, vtestSeaMirror.rgb * ${mirror.tone.toFixed(3)}, clamp(vtestSeaMirror.a, 0.0, 1.0));
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
