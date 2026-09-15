/**
 * The painted look's fog: three registers on one chart table.
 *
 * `fog3d.ts` states the rule this finishes — the three states are three
 * *pictures*, never three opacities — and the painted board already keeps half
 * of it: a hex nobody has charted discards every scrap of geometry it owns, in
 * the colour pass and the shadow pass alike, so the table shows through. What it
 * did not yet have was a table worth showing, or a register to remember with.
 * The user's plate (`mockups/fog-study/three-registers.png`) and the four-way
 * review that followed it (`docs/plans/painted-fog-study.md`) settle both:
 *
 *   uncharted  **paper on the table.** A real surface at the ground datum,
 *              wearing the world-space grain and a faint ruled hex, lit by the
 *              same sun and — the point — *receiving the explored relief's cast
 *              shadows*, so the diorama reads as a relief model set down on a
 *              chart rather than as sculpture beside a flat marker. Out in the
 *              margin, where a whole disc is uncharted, the paper takes the
 *              sea's wash (`marginaliaWater`'s rule, and for its reason).
 *   remembered **the same world, in shadow.** Civ's own convention, and the one
 *              the user chose off the plate: full pigment, full geometry, the
 *              sun turned down to `shadowedSun` and shifted a little toward the
 *              ink. Nothing about the hex moves — a hill keeps its silhouette
 *              and its colour — so what separates memory from sight is light,
 *              which is the one thing a player never has to be taught.
 *   visible    **the lit model**, untouched. The sun's warmth is the whole tell
 *              for what a seat is looking at right now.
 *
 * INK IS DISCRETE, LIGHT IS CONTINUOUS
 * ------------------------------------
 * The uncharted frontier is a whole hex either way — it is where the sculpt
 * ends — so the discard reads the vision channel with **nearest** filtering and
 * lands on hex edges. The lit edge is light, not ink, so it fades: a second,
 * **linearly filtered** field carries one weight per cell and the material
 * samples it at the fragment's own world position.
 *
 * That second field is where the hex grid has to be paid for. An offset-row map
 * is sheared against world space — the neighbour above a texel is `(c, r-1)` on
 * even rows and `(c-1, r-1)` on odd ones — so a linear filter over a `W×H`
 * texture would blend the wrong hexes. The field is therefore **doubled in x**:
 * cell `(col, row)` writes texel `2·col + (row & 1)`, which puts every texel
 * exactly under its own hex centre (`x = √3/2 · texelX`), and the interleaved
 * texels are filled with the mean of the two cells they sit between. World
 * space maps onto it linearly and exactly, wrap copies included — `u` repeats
 * with a period of one map width because `2W` texels span one world period.
 *
 * THE REVEAL
 * ----------
 * A cell that changes register eases over `revealMs` rather than cutting: paper
 * dissolves into the world, and the sun comes up on a hex the seat has just
 * looked at. It is a clock, so it is optional — `apply(levels)` with no
 * timestamp completes every transition on the spot, which is what a headless
 * test asks for and what a seat change does. **Nothing here rebuilds anything**:
 * a reveal is texel writes on two small textures, and the geometry a remembered
 * hex owns is the geometry a visible one owns, so no batch changes visibility
 * and no shadow is rebaked. That is the whole of audit finding 2's fog half —
 * see `docs/plans/painted-performance-audit.md`.
 */

import {
  BufferGeometry, Color, DataTexture, Float32BufferAttribute, LinearFilter,
  RGBAFormat, RepeatWrapping, UnsignedByteType, Vector2, type IUniform,
} from 'three';

import { VIEW3D } from './lookData';

const PAINTED_FOG = VIEW3D.painted.fog;

/**
 * A palette name to its colour. The sheet names inks rather than writing them
 * out (`PaintedFogSpec`), and an unknown name is a typo worth failing on rather
 * than a silent black page.
 */
function chartColor(name: string, where: string): Color {
  const value = VIEW3D.palette[name];
  if (value === undefined) throw new Error(`view3d.json: painted.fog.${where} names an unknown palette colour: ${name}`);
  return new Color(value);
}

/** Pointy-top hexes of circumradius 1: √3 between columns, 1.5 between rows. */
const COLUMN_PITCH = Math.sqrt(3);
const ROW_PITCH = 1.5;
/** World x → doubled-grid texel index. The whole reason the field is doubled. */
const TEXEL_PER_X = 2 / COLUMN_PITCH;

/** The three registers, as the vision channel spells them. */
export const PAINTED_VISION = { uncharted: 0, remembered: 127, visible: 255 } as const;

export interface PaintedRegisterReading {
  /** Whether the cell's geometry is drawn at all. The one discrete edge. */
  drawn: boolean;
  /** The sun's weight on it: the lit model's tell, and nothing else's. */
  sun: number;
}

/**
 * One cell's register, read off the vision byte the fog texture carries.
 *
 * The whole of the rule, as a function rather than as three places that each
 * re-derive it: 0 is discarded, 127 is drawn in shadow, 255 is lit. The
 * material's discard and the CPU's bookkeeping both answer to this.
 */
export function paintedFogRegister(vision: number): PaintedRegisterReading {
  if (vision < 64) return { drawn: false, sun: 0 };
  if (vision < 192) return { drawn: true, sun: 0 };
  return { drawn: true, sun: 1 };
}

/**
 * The lit weight a linearly-filtered sample carries, given the falloff in hexes.
 *
 * The sample ramps linearly from 1 at a visible cell's centre to 0 at a
 * remembered one's, so it *is* the fraction of the way across, and the edge
 * between them sits at a half. `falloff` is therefore read in hexes directly: a
 * half fades over half a hex, centred on the edge. The GLSL is the same
 * smoothstep; this is its dual, and the register test holds the two together.
 */
export function paintedSunWeight(sample: number, falloff: number): number {
  const half = Math.max(0.01, falloff) * 0.5;
  const t = (sample - (0.5 - half)) / (2 * half);
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return clamped * clamped * (3 - 2 * clamped);
}

/** Where a cell writes in the doubled grid: its own hex centre, exactly. */
export function paintedLightIndex(cell: number, width: number): { x: number; y: number } {
  const row = Math.floor(cell / width), col = cell - row * width;
  return { x: col * 2 + (row & 1), y: row };
}

/** World position → doubled-grid coordinates, in texels. Linear and exact. */
export function paintedLightCoords(x: number, z: number): { x: number; y: number } {
  return { x: x * TEXEL_PER_X, y: z / ROW_PITCH };
}

export interface PaintedLightField {
  texture: DataTexture;
  size: Vector2;
  /** Per-cell state, so the in-between texels can be re-meaned in place. */
  lit: Uint8Array;
  charted: Uint8Array;
  write(cell: number, lit: number, charted: number): boolean;
  /** The CPU's reading of what the shader samples. Bilinear, wrapped in x. */
  read(x: number, z: number): { lit: number; charted: number };
  dispose(): void;
}

/**
 * The continuous field: one texel per cell at its own hex centre, doubled in x
 * so the filter blends the hexes that are actually adjacent in the world.
 *
 * Red is how lit a cell is, green how far the world has soaked through the
 * paper. Both are sampled with `LinearFilter` — green at a texel centre, where
 * a bilinear filter returns that texel exactly, which is how the chart paper
 * gets a hex-hard dissolve out of a smooth texture.
 */
export function createPaintedLightField(width: number, height: number): PaintedLightField {
  const lightWidth = width * 2, cells = width * height;
  const data = new Uint8Array(lightWidth * height * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const texture = new DataTexture(data, lightWidth, height, RGBAFormat, UnsignedByteType);
  texture.minFilter = texture.magFilter = LinearFilter;
  // The board's three wrap copies sample one field: 2W texels are one world
  // period, so a repeating u wraps exactly onto the canonical cell.
  texture.wrapS = RepeatWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const lit = new Uint8Array(cells), charted = new Uint8Array(cells);
  function paint(x: number, y: number, litValue: number, chartedValue: number): void {
    const i = (y * lightWidth + ((x % lightWidth) + lightWidth) % lightWidth) * 4;
    data[i] = litValue; data[i + 1] = chartedValue;
  }
  function mean(col: number, row: number, step: number): void {
    // The interleaved texel sits halfway between two same-row hexes, so it
    // carries their mean and the ramp between two cell centres stays straight.
    const other = ((col + step) % width + width) % width;
    const a = row * width + col, b = row * width + other;
    paint(col * 2 + (row & 1) + step, row, (lit[a]! + lit[b]!) / 2, (charted[a]! + charted[b]!) / 2);
  }
  return {
    texture, size: new Vector2(lightWidth, height), lit, charted,
    write(cell, litValue, chartedValue) {
      if (cell < 0 || cell >= cells) return false;
      if (lit[cell] === litValue && charted[cell] === chartedValue) return false;
      lit[cell] = litValue; charted[cell] = chartedValue;
      const row = Math.floor(cell / width), col = cell - row * width;
      paint(col * 2 + (row & 1), row, litValue, chartedValue);
      mean(col, row, 1); mean(col, row, -1);
      texture.needsUpdate = true;
      return true;
    },
    read(x, z) {
      const coords = paintedLightCoords(x, z);
      // A texel's centre sits at its own index: the shader's half-texel offset
      // is inside the uv, so the reading is taken in texel units directly.
      const u = coords.x, v = Math.max(0, Math.min(height - 1, coords.y));
      const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
      const at = (tx: number, ty: number, channel: number): number => {
        const cx = ((tx % lightWidth) + lightWidth) % lightWidth;
        const cy = Math.max(0, Math.min(height - 1, ty));
        return data[(cy * lightWidth + cx) * 4 + channel]! / 255;
      };
      const bilinear = (channel: number): number =>
        (at(x0, y0, channel) * (1 - fx) + at(x0 + 1, y0, channel) * fx) * (1 - fy) +
        (at(x0, y0 + 1, channel) * (1 - fx) + at(x0 + 1, y0 + 1, channel) * fx) * fy;
      return { lit: bilinear(0), charted: bilinear(1) };
    },
    dispose() { texture.dispose(); },
  };
}

export type PaintedFogUniforms = Record<string, IUniform>;

/** Every knob the three registers read, as uniforms a slider can move live. */
export function paintedFogUniforms(light: PaintedLightField): PaintedFogUniforms {
  return {
    paintedLight: { value: light.texture },
    paintedLightSize: { value: light.size },
    paintedFogPaper: { value: chartColor(PAINTED_FOG.paper, 'paper') },
    paintedFogInk: { value: chartColor(PAINTED_FOG.ink, 'ink') },
    paintedFogEdge: { value: PAINTED_FOG.sunFalloff },
    paintedFogChartRule: { value: PAINTED_FOG.chartRule },
    paintedFogRuleWidth: { value: PAINTED_FOG.ruleWidth },
    paintedFogShadowedSun: { value: PAINTED_FOG.shadowedSun },
    paintedFogShadowedCool: { value: PAINTED_FOG.shadowedCool },
    paintedFogShadowedShade: { value: PAINTED_FOG.shadowedShade },
    paintedFogSoak: { value: PAINTED_FOG.chartSoak },
  };
}

// --- the shader ------------------------------------------------------------

/**
 * The painterly style composes the sun into the face pigment on one line, so
 * that is the line the remembered register takes the sun back out of. A missing
 * match is silent by construction — `String.replace` returns the source — and
 * `test/render/paintedFog.test.ts` compiles the real painterly source to make
 * sure it is never silently missing.
 */
export const PAINTERLY_SUN = {
  find: 'facePaint=mix(facePaint,sunPaint,light);',
  replace: 'facePaint=mix(facePaint,sunPaint,light*paintedSun);',
};

/** Shared by every register: where this fragment is, and how lit it is. */
const LIGHT_HEAD = `
uniform sampler2D paintedLight;
uniform vec2 paintedLightSize;
varying vec2 vPaintedLightUv;
varying vec3 vPaintedWorld;
`;

const LIGHT_VERTEX = `
vec4 paintedWorldPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  paintedWorldPosition = instanceMatrix * paintedWorldPosition;
#endif
paintedWorldPosition = modelMatrix * paintedWorldPosition;
vPaintedWorld = paintedWorldPosition.xyz;
vPaintedLightUv = vec2(
  (paintedWorldPosition.x * ${TEXEL_PER_X.toFixed(7)} + .5) / paintedLightSize.x,
  (paintedWorldPosition.z / ${ROW_PITCH.toFixed(1)} + .5) / paintedLightSize.y);
`;

/**
 * The chart's own ruling: the hex a point stands in, then how far out of it the
 * point is. The rounding is cube rounding rather than a rectangle's, so the line
 * lands on the hex's own six edges instead of on a circle inscribed in them.
 */
const RULE_FUNCTIONS = `
vec2 paintedCellCentre(vec2 p) {
  float q = p.x * 0.5773503 - p.y / 3.0, r = p.y * 0.6666667;
  float cx = q, cz = r, cy = -q - r;
  float rx = floor(cx + .5), ry = floor(cy + .5), rz = floor(cz + .5);
  float dx = abs(rx - cx), dy = abs(ry - cy), dz = abs(rz - cz);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  return vec2(1.7320508 * (rx + rz * .5), 1.5 * rz);
}
float paintedHexRule(vec2 p, float width) {
  vec2 d = p - paintedCellCentre(p);
  float edge = max(abs(d.x), max(abs(d.x * .5 + d.y * .8660254), abs(-d.x * .5 + d.y * .8660254))) / .8660254;
  // The antialiasing width is taken from the position rather than from the
  // edge: the edge's own derivative explodes where the nearest cell changes,
  // which is exactly the line, and the line would come out dotted.
  float aa = fwidth(p.x + p.y) * 1.2 + 1e-4;
  return smoothstep(1.0 - width - aa, 1.0 - width + aa, edge);
}
`;

const REGISTER_HEAD = `
uniform vec3 paintedFogPaper;
uniform vec3 paintedFogInk;
uniform float paintedFogEdge;
uniform float paintedFogChartRule;
uniform float paintedFogRuleWidth;
uniform float paintedFogShadowedSun;
uniform float paintedFogShadowedCool;
uniform float paintedFogShadowedShade;
`;

/**
 * Declared at the top of `main` so the painterly block, further down the same
 * function, can take the sun out through `PAINTERLY_SUN`: a remembered hex keeps
 * `shadowedSun` of the light it would have had, and the fill is left alone, so
 * what comes out is the same pigment under a cloud rather than a different
 * colour. The weight itself is the continuous field's, smoothstepped over
 * `sunFalloff` hexes so the edge of sight is a soft one.
 */
const REGISTER_WEIGHT = `
float paintedLit = smoothstep(.5 - paintedFogEdge * .5, .5 + paintedFogEdge * .5,
  texture2D(paintedLight, vPaintedLightUv).r);
float paintedSun = mix(paintedFogShadowedSun, 1.0, paintedLit);
`;

/**
 * And the other half of the same claim, after the light has been composed: a
 * shadow on this table is blue, so memory is shifted that way too and knocked
 * back a little. Both terms are multiplied out by the lit weight, so watched
 * ground is untouched to the bit.
 */
const REGISTER_PAINT = `
vec3 paintedCool = mix(outgoingLight, paintedFogInk, paintedFogShadowedCool) * paintedFogShadowedShade;
outgoingLight = mix(paintedCool, outgoingLight, paintedLit);
`;

/** The board's materials: the head, the vertex hook and the register paint. */
export const PAINTED_FOG_GLSL = {
  lightHead: LIGHT_HEAD,
  lightVertex: LIGHT_VERTEX,
  registerHead: REGISTER_HEAD + RULE_FUNCTIONS,
  registerWeight: REGISTER_WEIGHT,
  registerPaint: REGISTER_PAINT,
  painterlySun: PAINTERLY_SUN,
  /**
   * The paper's own shader. It reads the world's progress at its cell centre —
   * where a linear filter returns the texel exactly — so the dissolve is a
   * whole hex even though the field it comes from is smooth.
   */
  chartHead: `
attribute float paintedCell;
uniform sampler2D paintedFog;
uniform vec2 paintedFogSize;
varying vec2 vPaintedChartUv;
`,
  chartVertex: `
vec2 paintedChartCell = vec2(mod(paintedCell, paintedFogSize.x), floor(paintedCell / paintedFogSize.x));
vPaintedChartUv = (vec2(paintedChartCell.x * 2.0 + mod(paintedChartCell.y, 2.0), paintedChartCell.y) + .5)
  / paintedLightSize;
`,
  chartFragmentHead: `
varying vec2 vPaintedChartUv;
uniform float paintedFogSoak;
float paintedSoakNoise(vec2 p) {
  return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
}
`,
  chartDiscard: `
float paintedCharted = texture2D(paintedLight, vPaintedChartUv).g;
if (paintedCharted > .98) discard;
if (paintedCharted > 0.0 && paintedSoakNoise(floor(vPaintedWorld.xz * paintedFogSoak)) < paintedCharted) discard;
`,
  /**
   * **The paper takes the sun's shadow, and not its colour.**
   *
   * The table is a lit surface on purpose — that is the whole reason it is a
   * plane at the ground datum and not a flat marker: the explored relief throws
   * its shadows across it, and a mountain standing in charted country tells you
   * where the light is coming from even over ground nobody has walked. But a
   * chart is a chart at every hour, and at golden hour a cream page lit by a
   * warm directional light came out **peach** — the user saw it on the plate.
   *
   * So the light reaching the paper is reduced to one number before it is used.
   * `outgoingLight / diffuseColor` is what the rig contributed and nothing the
   * page itself is; its luminance is the shading — the cast shadow, the ambient
   * fill, the hour's strength — and that scalar re-tints the page's own cream
   * (and the margin's sea wash, which rides the same vertex colour). Nothing of
   * the sun's hue survives the fold, and every scrap of its shadow does.
   */
  chartPaint: `
vec3 paintedPaperLight = outgoingLight / max(diffuseColor.rgb, vec3(1e-4));
float paintedPaperShade = dot(paintedPaperLight, vec3(.2126, .7152, .0722));
outgoingLight = diffuseColor.rgb * paintedPaperShade;
outgoingLight = mix(outgoingLight, paintedFogInk,
  paintedHexRule(vPaintedWorld.xz, paintedFogRuleWidth) * paintedFogChartRule);
`,
};

// --- the paper -------------------------------------------------------------

interface ChartTile { col: number; row: number; water: boolean; }

/**
 * The table's paper, as one merged fan of hexagons at the ground datum.
 *
 * Six triangles a cell and no more: the ruling is drawn in the material off the
 * world position, not built as geometry, so the whole of a standard map's chart
 * is a single draw call that never changes again. `paintedCell` rides every
 * vertex exactly as the board's own terrain carries it, because the paper is
 * fog's other half and answers to the same texture.
 */
export function paintedChartGeometry(
  tiles: readonly ChartTile[], width: number, height: number, lift: number,
  sea: { color: Color; mix: number; region: number },
): BufferGeometry {
  const corners = Array.from({ length: 6 }, (_, i) => {
    const angle = (i + 0.5) * Math.PI / 3;
    return [Math.cos(angle), Math.sin(angle)] as const;
  });
  const water = new Set<number>();
  for (const tile of tiles) if (tile.water) water.add(tile.row * width + tile.col);
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], cells: number[] = [];
  const paper = chartColor(PAINTED_FOG.paper, 'paper'), wash = new Color();
  for (const tile of tiles) {
    const cell = tile.row * width + tile.col;
    const x = COLUMN_PITCH * (tile.col + (tile.row % 2) * 0.5), z = tile.row * ROW_PITCH;
    // Only a hex whose whole disc is sea takes the margin's wash: a wash that
    // followed every hidden coast would chart the coastline for free.
    let open = tile.water;
    for (let dr = -sea.region; open && dr <= sea.region; dr++) {
      for (let dc = -sea.region; open && dc <= sea.region; dc++) {
        const row = tile.row + dr;
        if (row < 0 || row >= height) continue;
        const col = ((tile.col + dc) % width + width) % width;
        if (!water.has(row * width + col)) open = false;
      }
    }
    wash.copy(paper);
    if (open) wash.lerp(sea.color, sea.mix);
    for (let i = 0; i < 6; i++) {
      // Wound the other way round on purpose: increasing angle in (x, z) is
      // clockwise seen from above, which is the back face, and the paper would
      // be culled from the only side anybody looks at it from.
      const a = corners[(i + 1) % 6]!, b = corners[i]!;
      positions.push(x, lift, z, x + a[0], lift, z + a[1], x + b[0], lift, z + b[1]);
      for (let v = 0; v < 3; v++) {
        normals.push(0, 1, 0);
        colors.push(wash.r, wash.g, wash.b);
        cells.push(cell);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('paintedCell', new Float32BufferAttribute(cells, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** The chart's own tunables, so the board need not reach into the look data. */
export const PAINTED_CHART = {
  lift: PAINTED_FOG.chartLift,
  sea: {
    color: chartColor(PAINTED_FOG.chartSea, 'chartSea'),
    mix: PAINTED_FOG.chartSeaMix,
    region: PAINTED_FOG.chartSeaRegion,
  },
};

/** The reveal's own clock, in milliseconds. Zero completes on the spot. */
export const PAINTED_REVEAL_MS = PAINTED_FOG.revealMs;

/** Smoothstep: the ease both channels of a reveal are written along. */
export function paintedRevealEase(t: number): number {
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return clamped * clamped * (3 - 2 * clamped);
}
