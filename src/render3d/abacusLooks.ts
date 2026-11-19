/**
 * Style options for the 3D Abacus (the styling pass of 2026-11-18).
 *
 * This file is a set of named looks for the user to choose from. It is not the
 * shipped look. `today` is the shipped look, and it is the default: with no
 * switch set, `AbacusStage` draws exactly what it drew before this file.
 *
 * The switch
 * ----------
 * - `?abacusLook=B` on any page (the game, `abacus.html`, `abacus-stages.html`).
 * - `?look=B` on the two abacus pages only, as a short form.
 * - `?abacusPlaces=8` draws 8 places on a rod and not `bead.perRod`. The number
 *   of places is an open rule question, so every look is checked at 8 and 13.
 * - `?abacusAge=III` sets the numeral on the age plaque of the looks that have one.
 * - `?abacusFreeze=0.5` stops a slide at that share of its time, for a still picture.
 *
 * How to remove it
 * ----------------
 * Delete this file, `abacusLooks.css`, `abacus-stages.html` and
 * `src/abacusSpike/stages.ts`, then remove the lines in `abacus3d.ts` that
 * read `this.look` and `this.kit`. Each of those lines has a `today` branch
 * that is the old code.
 *
 * What a real build changes
 * -------------------------
 * The colours and sizes here are numbers in code, which the project does not
 * allow in shipped code. The look the user chooses moves to `data/view3d.json`
 * (palette names, sizes) and the other looks are deleted.
 */

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  PlaneGeometry,
  RedFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';

import { chamferedBar, uprightBar, weld } from './geometry';
import './abacusLooks.css';

export type AbacusLookId = 'today' | 'A' | 'B' | 'C' | 'D';

/** How a surface takes the light: the bands of its toon ramp. */
export type LookRamp = 'matte' | 'gloss' | 'metal';

const RAMPS: Record<LookRamp, readonly number[]> = {
  // The board's own three bands.
  matte: [0.45, 0.725, 1],
  // A darker shadow band and a wide bright band: enamel or glass.
  gloss: [0.36, 0.6, 0.86, 1, 1],
  // High contrast with a narrow dark band: polished metal.
  metal: [0.3, 0.52, 0.8, 0.8, 1, 1],
};

export interface AbacusLook {
  id: AbacusLookId;
  /** The name on the board the user reads. */
  name: string;
  /** Multiplies `look.outline`. */
  outline: number;
  /** The colour of the ink outline, or null for the board's ink. */
  outlineColor: number | null;
  camera: { elevation: number; azimuth: number } | null;
  light: { elevation: number; azimuth: number; key: number; hemi: number; ambient: number } | null;
  ground: {
    /** The colour under the frame and the colour at the edge of the view. */
    center: number;
    edge: number;
    /** Half sizes of the lighter pool on the ground, in world units. */
    poolX: number;
    poolZ: number;
    shadow: number;
    shadowOpacity: number;
  } | null;
  frame: {
    kind: 'timber' | 'fitted' | 'reliquary';
    rail: number;
    stile: number;
    foot: number;
    ramp: LookRamp;
    /** The metal of the fittings. */
    fitting: number;
    /** The line let into the front of each rail, or null for none. */
    inlay: number | null;
    /** A plaque on the top rail that carries the age numeral. */
    plaque: boolean;
  } | null;
  rod: {
    color: number;
    ramp: LookRamp;
    /** Multiplies `rod.radius`. */
    radius: number;
    /** A stud in the seat's colour on the left stile, at each rod. */
    seatStud: boolean;
  } | null;
  bead: {
    shape: 'bicone' | 'round' | 'gem';
    segments: number;
    ramp: LookRamp;
    /** The colour of a place that is not earned yet. */
    waiting: number;
    waitingRamp: LookRamp;
    /** The size of a place that is not earned yet, as a share of an earned bead. */
    waitingScale: number;
    /** A metal band round the middle of an earned bead, or null. */
    band: number | null;
    /** The four family colours, or null for the board's. */
    families: Record<string, number> | null;
    golden: number;
  } | null;
  motion: {
    slideSeconds: number;
    /** The share of the slide spent going out, before the settle. */
    travel: number;
    overshoot: number;
    /** How far the beads already earned move when the new bead hits them. */
    knock: number;
    knockSeconds: number;
    swayRadians: number;
    swaySeconds: number;
  } | null;
  /** True when the ground is dark, so the page's words must be light. */
  darkPage: boolean;
}

const TODAY: AbacusLook = {
  id: 'today',
  name: 'Today',
  outline: 1,
  outlineColor: null,
  camera: null,
  light: null,
  ground: null,
  frame: null,
  rod: null,
  bead: null,
  motion: null,
  darkPage: false,
};

export const ABACUS_LOOKS: Record<AbacusLookId, AbacusLook> = {
  today: TODAY,

  // A: the same object, cleaned. Thinner ink, a richer timber, real brass,
  // boxwood for the places not earned, and a soft shadow under the feet.
  A: {
    id: 'A',
    name: 'Polished timber',
    outline: 0.5,
    outlineColor: null,
    camera: null,
    light: { elevation: 56, azimuth: 150, key: 2.2, hemi: 1.15, ambient: 0.4 },
    ground: { center: 0xe7dcbe, edge: 0xd2c29c, poolX: 9, poolZ: 15, shadow: 0x4a3a28, shadowOpacity: 0.42 },
    frame: {
      kind: 'timber',
      rail: 0x8a5a36,
      stile: 0x6e4529,
      foot: 0x5c3921,
      ramp: 'matte',
      fitting: 0xd0a650,
      inlay: null,
      plaque: false,
    },
    rod: { color: 0xd3ad55, ramp: 'metal', radius: 0.9, seatStud: false },
    bead: {
      shape: 'bicone',
      segments: 12,
      ramp: 'gloss',
      waiting: 0xd9c8a0,
      waitingRamp: 'matte',
      waitingScale: 0.9,
      band: null,
      families: null,
      golden: 0xf0c23a,
    },
    motion: {
      slideSeconds: 0.5,
      travel: 0.78,
      overshoot: 0.05,
      knock: 0.012,
      knockSeconds: 0.22,
      swayRadians: 0.06,
      swaySeconds: 9,
    },
    darkPage: false,
  },

  // B: a desk instrument. Dark walnut, gilt shoes on the rail ends, a gilt line
  // let into the rails, a plaque for the age, turned feet, ivory places and
  // enamel beads with a gilt band.
  B: {
    id: 'B',
    name: 'Walnut and gilt',
    outline: 0.42,
    outlineColor: 0x241a17,
    camera: { elevation: 20, azimuth: 71 },
    light: { elevation: 54, azimuth: 148, key: 2.3, hemi: 1.1, ambient: 0.42 },
    ground: { center: 0xeadfc2, edge: 0xcbb98f, poolX: 8.5, poolZ: 14, shadow: 0x3d2c1d, shadowOpacity: 0.5 },
    frame: {
      kind: 'fitted',
      rail: 0x5f3d27,
      stile: 0x4d301f,
      foot: 0x3d2619,
      ramp: 'matte',
      fitting: 0xcfa03a,
      inlay: 0xe3b84c,
      plaque: true,
    },
    rod: { color: 0xdcb659, ramp: 'metal', radius: 0.8, seatStud: true },
    bead: {
      shape: 'round',
      segments: 14,
      ramp: 'gloss',
      waiting: 0xece2c9,
      waitingRamp: 'matte',
      waitingScale: 0.78,
      band: 0xe6bb4a,
      families: { conquest: 0xb5402f, culture: 0x7a4f94, philosophy: 0x2f57a6, commerce: 0xc77f1c },
      golden: 0xf4c63a,
    },
    motion: {
      slideSeconds: 0.56,
      travel: 0.76,
      overshoot: 0.045,
      knock: 0.018,
      knockSeconds: 0.26,
      swayRadians: 0.05,
      swaySeconds: 10,
    },
    darkPage: false,
  },

  // C: the boldest. A gilt reliquary on dark cloth: columns for stiles, lapis
  // panels with gilt studs, an arch with a medallion, a stepped base, and cut
  // glass beads. A place not earned is a small dark pearl.
  C: {
    id: 'C',
    name: 'Lapis and gilt',
    outline: 0.3,
    outlineColor: 0x15121c,
    camera: { elevation: 15, azimuth: 77 },
    light: { elevation: 50, azimuth: 140, key: 2.5, hemi: 0.95, ambient: 0.4 },
    ground: { center: 0x222b52, edge: 0x0e1226, poolX: 8, poolZ: 13, shadow: 0x05060f, shadowOpacity: 0.6 },
    frame: {
      kind: 'reliquary',
      rail: 0xc8962e,
      stile: 0xe6ba4c,
      foot: 0x1e1a26,
      ramp: 'metal',
      fitting: 0xf0c654,
      inlay: 0x2c4c9c,
      plaque: false,
    },
    rod: { color: 0xcfd3d6, ramp: 'metal', radius: 0.7, seatStud: true },
    bead: {
      shape: 'gem',
      segments: 8,
      ramp: 'gloss',
      waiting: 0x5f6b98,
      waitingRamp: 'gloss',
      waitingScale: 0.6,
      band: null,
      families: { conquest: 0xcf3d33, culture: 0x9a55c4, philosophy: 0x3f7fe0, commerce: 0xe8951c },
      golden: 0xffd24a,
    },
    motion: {
      slideSeconds: 0.62,
      travel: 0.74,
      overshoot: 0.04,
      knock: 0.02,
      knockSeconds: 0.3,
      swayRadians: 0.04,
      swaySeconds: 12,
    },
    darkPage: true,
  },

  // D: the interface's own language as an object. Ivory rails with an oxblood
  // line, ebony shoes and stiles, dark steel rods, on parchment.
  D: {
    id: 'D',
    name: 'Ivory and ink',
    outline: 0.36,
    outlineColor: 0x1d1a20,
    camera: { elevation: 20, azimuth: 71 },
    light: { elevation: 56, azimuth: 148, key: 2.15, hemi: 1.15, ambient: 0.45 },
    ground: { center: 0xf3ecd8, edge: 0xd9cba6, poolX: 8.5, poolZ: 14, shadow: 0x4a4038, shadowOpacity: 0.4 },
    frame: {
      kind: 'fitted',
      rail: 0xe9dfc4,
      stile: 0x37323a,
      foot: 0x2a262e,
      ramp: 'matte',
      fitting: 0x37323a,
      inlay: 0xa8402c,
      plaque: true,
    },
    rod: { color: 0x4a454e, ramp: 'metal', radius: 0.75, seatStud: true },
    bead: {
      shape: 'round',
      segments: 14,
      ramp: 'gloss',
      waiting: 0xe4d8ba,
      waitingRamp: 'matte',
      waitingScale: 0.72,
      band: null,
      families: { conquest: 0xb5402f, culture: 0x7a4f94, philosophy: 0x2f57a6, commerce: 0xc08a2b },
      golden: 0xf0c23a,
    },
    motion: {
      slideSeconds: 0.5,
      travel: 0.78,
      overshoot: 0.04,
      knock: 0.014,
      knockSeconds: 0.22,
      swayRadians: 0.05,
      swaySeconds: 10,
    },
    darkPage: false,
  },
};

// --- the switches ------------------------------------------------------------

function query(name: string): string | null {
  if (typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get(name);
}

/** The look the page asked for, or `today`. Sets `data-abacus-look` for the stylesheet. */
export function activeAbacusLook(): AbacusLook {
  const onAbacusPage = typeof location !== 'undefined' && /abacus[^/]*\.html$/.test(location.pathname);
  const asked = query('abacusLook') ?? (onAbacusPage ? query('look') : null);
  const look = asked !== null && asked in ABACUS_LOOKS ? ABACUS_LOOKS[asked as AbacusLookId] : TODAY;
  if (typeof document !== 'undefined' && look.id !== 'today') {
    document.documentElement.dataset.abacusLook = look.id;
    if (look.darkPage) document.documentElement.dataset.abacusDark = '1';
  }
  return look;
}

/** `?abacusPlaces=8`: the places on a rod, or null for the data's number. */
export function placesOverride(): number | null {
  const asked = Number(query('abacusPlaces'));
  return Number.isInteger(asked) && asked >= 1 && asked <= 20 ? asked : null;
}

/** `?abacusFreeze=0.5`: the share of a slide at which it stops, or null. */
export function slideFreeze(): number | null {
  const raw = query('abacusFreeze');
  if (raw === null) return null;
  const asked = Number(raw);
  return Number.isFinite(asked) && asked > 0 && asked < 1 ? asked : null;
}

function ageMark(): string {
  return query('abacusAge') ?? 'II';
}

// --- shapes ------------------------------------------------------------------

/** A flat-shaded geometry with positions and normals only, so `weld` can merge it. */
function plain(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.deleteAttribute('uv');
  flat.computeVertexNormals();
  return flat;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number): BufferGeometry {
  const geometry = plain(new BoxGeometry(w, h, d));
  geometry.translate(x, y, z);
  return geometry;
}

/**
 * A surface of revolution about the x axis, flat-shaded. `profile` is a list of
 * `[radius, x]` pairs with x rising. A radius of 0 at an end closes that end.
 */
export function latheX(profile: readonly (readonly [number, number])[], segments: number): BufferGeometry {
  const out: number[] = [];
  const point = (i: number, k: number): [number, number, number] => {
    const [r, x] = profile[i]!;
    const angle = (k / segments) * Math.PI * 2;
    return [x, r * Math.cos(angle), r * Math.sin(angle)];
  };
  for (let i = 0; i < profile.length - 1; i++) {
    for (let k = 0; k < segments; k++) {
      const a = point(i, k);
      const b = point(i + 1, k);
      const c = point(i + 1, k + 1);
      const d = point(i, k + 1);
      // Outward for a profile whose x rises: (A, D, C) and (A, C, B).
      if (profile[i]![0] > 0) out.push(...a, ...d, ...c);
      if (profile[i + 1]![0] > 0) out.push(...a, ...c, ...b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(out), 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** The same, stood up: a surface of revolution about the y axis. */
function latheY(profile: readonly (readonly [number, number])[], segments: number): BufferGeometry {
  const geometry = latheX(profile, segments);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

/** The same, facing the reader: a surface of revolution about the z axis. */
function latheZ(profile: readonly (readonly [number, number])[], segments: number): BufferGeometry {
  const geometry = latheX(profile, segments);
  geometry.rotateY(-Math.PI / 2);
  return geometry;
}

/** A bead for a look: `round` is a full barrel, `gem` is a cut stone. */
export function lookBead(
  shape: 'round' | 'gem',
  radius: number,
  halfThickness: number,
  bore: number,
  segments: number,
): BufferGeometry {
  const r = radius;
  const h = halfThickness;
  const b = bore;
  if (shape === 'gem') {
    // Table, crown, girdle, crown, table: five hard rings on eight sides.
    return latheX(
      [
        [b, -h],
        [r * 0.5, -h],
        [r * 0.96, -h * 0.22],
        [r, 0],
        [r * 0.96, h * 0.22],
        [r * 0.5, h],
        [b, h],
      ],
      segments,
    );
  }
  return latheX(
    [
      [b, -h],
      [r * 0.42, -h],
      [r * 0.74, -h * 0.72],
      [r * 0.95, -h * 0.34],
      [r, 0],
      [r * 0.95, h * 0.34],
      [r * 0.74, h * 0.72],
      [r * 0.42, h],
      [b, h],
    ],
    segments,
  );
}

/** The metal band round the middle of an earned bead. */
export function lookBand(radius: number, halfThickness: number, segments: number): BufferGeometry {
  const w = halfThickness * 0.16;
  const r = radius * 1.035;
  return latheX(
    [
      [radius * 0.9, -w * 1.6],
      [r, -w],
      [r, w],
      [radius * 0.9, w * 1.6],
    ],
    segments,
  );
}

/** A ball on a short neck, pointing along +x: the end of a rod in the looks. */
export function lookFinial(size: number, segments: number): BufferGeometry {
  return latheX(
    [
      [0, 0],
      [0.5 * size, 0],
      [0.5 * size, 0.14 * size],
      [0.3 * size, 0.24 * size],
      [0.62 * size, 0.42 * size],
      [0.8 * size, 0.62 * size],
      [0.62 * size, 0.84 * size],
      [0, 1.0 * size],
    ],
    segments,
  );
}

// --- the frame ---------------------------------------------------------------

/** The sizes the frame is cut from: `view3d.json`'s `abacus.frame`, with the stacked heights. */
export interface LookFrameSizes {
  width: number;
  stileWidth: number;
  stileDepth: number;
  railHeight: number;
  railDepth: number;
  innerHeight: number;
  footWidth: number;
  footHeight: number;
  footDepth: number;
  chamfer: number;
  footTop: number;
  innerBottom: number;
  innerTop: number;
  totalHeight: number;
}

/** One welded part of a frame: its shape, its colour and how it takes the light. */
export interface LookPart {
  geometry: BufferGeometry;
  color: number;
  ramp: LookRamp;
  outline: boolean;
}

class PartList {
  private readonly groups = new Map<string, { parts: BufferGeometry[]; color: number; ramp: LookRamp; outline: boolean }>();

  add(geometry: BufferGeometry, color: number, ramp: LookRamp, outline = true): void {
    const key = `${color}|${ramp}|${outline ? 1 : 0}`;
    const group = this.groups.get(key) ?? { parts: [], color, ramp, outline };
    group.parts.push(geometry);
    this.groups.set(key, group);
  }

  welded(): LookPart[] {
    return [...this.groups.values()].map((group) => ({
      geometry: weld(group.parts),
      color: group.color,
      ramp: group.ramp,
      outline: group.outline,
    }));
  }
}

/** A turned bun foot standing on the ground at (x, z). */
function bunFoot(x: number, z: number, radius: number, height: number): BufferGeometry {
  const foot = latheY(
    [
      [0, 0],
      [radius * 0.55, 0],
      [radius, height * 0.32],
      [radius, height * 0.62],
      [radius * 0.5, height],
      [0, height],
    ],
    10,
  );
  foot.translate(x, 0, z);
  return foot;
}

/** A turned knob standing at (x, y): the top of a stile. */
function topKnob(x: number, y: number, size: number): BufferGeometry {
  const knob = latheY(
    [
      [0, 0],
      [size * 0.62, 0],
      [size * 0.62, size * 0.16],
      [size * 0.3, size * 0.3],
      [size * 0.7, size * 0.62],
      [size * 0.62, size * 0.95],
      [size * 0.2, size * 1.3],
      [0, size * 1.36],
    ],
    10,
  );
  knob.translate(x, y, 0);
  return knob;
}

/**
 * B and D: the timber frame with fittings. Shoes on the rail ends, a line let
 * into the front of each rail, a knob over each stile, and a thin sledge on
 * four turned feet.
 */
function fittedFrame(look: AbacusLook, s: LookFrameSizes): LookPart[] {
  const frame = look.frame!;
  const parts = new PartList();
  const half = s.width / 2;
  const railY = [s.footTop + s.railHeight / 2, s.innerTop + s.railHeight / 2];

  for (const y of railY) {
    const rail = chamferedBar(s.width, s.railHeight, s.railDepth, s.chamfer);
    rail.translate(0, y, 0);
    parts.add(rail, frame.rail, frame.ramp);
    // A shoe on each end: one closed bar a little larger than the rail.
    for (const side of [-1, 1]) {
      const shoe = chamferedBar(0.34, s.railHeight + 0.05, s.railDepth + 0.05, s.chamfer * 1.6);
      shoe.translate(side * (half - 0.15), y, 0);
      parts.add(shoe, frame.fitting, 'metal');
    }
    if (frame.inlay !== null) {
      const front = s.railDepth / 2 + 0.004;
      parts.add(box(s.width - 1.3, 0.034, 0.012, 0, y, front), frame.inlay, 'metal', false);
    }
  }

  for (const side of [-1, 1]) {
    const x = side * (half - s.stileWidth / 2);
    const stile = uprightBar(s.innerHeight + s.railHeight, s.stileWidth, s.stileDepth, s.chamfer);
    stile.translate(x, s.innerBottom + s.innerHeight / 2, 0);
    parts.add(stile, frame.stile, frame.ramp);
    parts.add(topKnob(x, s.totalHeight, 0.15), frame.fitting, 'metal');

    // The sledge stands on two feet, so the frame clears the ground.
    const lift = s.footHeight * 0.5;
    const sledge = chamferedBar(s.footWidth, s.footHeight - lift, s.footDepth, s.chamfer * 0.8);
    sledge.translate(side * (half - s.footWidth / 2), lift + (s.footHeight - lift) / 2, 0);
    parts.add(sledge, frame.foot, frame.ramp);
    for (const zSide of [-1, 1]) {
      parts.add(
        bunFoot(side * (half - s.footWidth / 2), zSide * (s.footDepth / 2 - 0.1), 0.13, lift + 0.02),
        frame.fitting,
        'metal',
      );
    }
  }
  return parts.welded();
}

/**
 * C: the reliquary. Columns for stiles, lapis panels with gilt studs on the
 * rails, an arch with a medallion over the top rail, and a stepped base.
 */
function reliquaryFrame(look: AbacusLook, s: LookFrameSizes): LookPart[] {
  const frame = look.frame!;
  const parts = new PartList();
  const half = s.width / 2;
  const gilt = frame.rail;
  const lapis = frame.inlay ?? 0x2c4c9c;
  const front = s.railDepth / 2;

  // The base: a dark step and a gilt step, the whole width, in place of feet.
  const lower = chamferedBar(s.width + 0.5, s.footHeight * 0.55, s.footDepth + 0.3, s.chamfer);
  lower.translate(0, s.footHeight * 0.275, 0);
  parts.add(lower, frame.foot, 'matte');
  const upper = chamferedBar(s.width + 0.22, s.footHeight * 0.45, s.footDepth, s.chamfer * 0.8);
  upper.translate(0, s.footHeight * 0.775, 0);
  parts.add(upper, gilt, 'metal');

  for (const y of [s.footTop + s.railHeight / 2, s.innerTop + s.railHeight / 2]) {
    const rail = chamferedBar(s.width, s.railHeight, s.railDepth, s.chamfer);
    rail.translate(0, y, 0);
    parts.add(rail, gilt, 'metal');
    // The lapis panel on the front, and a row of gilt studs on it.
    const panelWidth = s.width - 1.1;
    parts.add(box(panelWidth, s.railHeight * 0.5, 0.012, 0, y, front + 0.004), lapis, 'gloss', false);
    const studs = 11;
    for (let i = 0; i < studs; i++) {
      const x = -panelWidth / 2 + (panelWidth * (i + 0.5)) / studs;
      const stud = plain(new BoxGeometry(0.07, 0.07, 0.03));
      stud.rotateZ(Math.PI / 4);
      stud.translate(x, y, front + 0.012);
      parts.add(stud, frame.fitting, 'metal', false);
    }
  }

  // The columns: a shaft with a base and a capital, in place of flat stiles.
  for (const side of [-1, 1]) {
    const x = side * (half - s.stileWidth / 2);
    const r = s.stileWidth * 0.36;
    const span = s.innerHeight;
    const column = latheY(
      [
        [r * 1.35, 0],
        [r * 1.35, span * 0.035],
        [r * 1.05, span * 0.06],
        [r * 1.2, span * 0.09],
        [r, span * 0.12],
        [r * 0.9, span * 0.88],
        [r * 1.2, span * 0.91],
        [r * 1.05, span * 0.94],
        [r * 1.35, span * 0.965],
        [r * 1.35, span],
      ],
      10,
    );
    column.translate(x, s.innerBottom, 0);
    parts.add(column, frame.stile, 'metal');
    // A ball over each column.
    parts.add(topKnob(x, s.totalHeight, 0.17), frame.fitting, 'metal');
  }

  // The arch: a low segment of a circle on the top rail, a convex shape.
  const chord = s.width * 0.5;
  const rise = 0.62;
  const steps = 10;
  const arch: [number, number][] = [];
  const radius = (chord * chord) / (8 * rise) + rise / 2;
  const sweep = Math.asin(chord / 2 / radius);
  for (let i = 0; i <= steps; i++) {
    const angle = -sweep + (2 * sweep * i) / steps;
    arch.push([Math.sin(angle) * radius, Math.cos(angle) * radius - (radius - rise)]);
  }
  const archDepth = s.railDepth * 0.7;
  parts.add(prism(arch, archDepth, s.totalHeight), gilt, 'metal');
  // The lapis field of the arch, set a little in from its edge.
  const field = arch.map(([x, y]) => [x * 0.88, Math.max(0.05, y * 0.84)] as [number, number]);
  const fieldGeometry = prism(field, 0.012, s.totalHeight);
  fieldGeometry.translate(0, 0, archDepth / 2 + 0.004);
  parts.add(fieldGeometry, lapis, 'gloss', false);
  // The medallion: a gilt ring and a red stone.
  const ring = latheZ(
    [
      [0, 0],
      [0.23, 0],
      [0.23, 0.035],
      [0.15, 0.05],
      [0, 0.05],
    ],
    12,
  );
  ring.translate(0, s.totalHeight + rise * 0.47, archDepth / 2 + 0.01);
  parts.add(ring, frame.fitting, 'metal', false);
  const stone = latheZ(
    [
      [0, 0],
      [0.13, 0],
      [0.09, 0.05],
      [0, 0.06],
    ],
    8,
  );
  stone.translate(0, s.totalHeight + rise * 0.47, archDepth / 2 + 0.055);
  parts.add(stone, 0xc23a30, 'gloss', false);

  return parts.welded();
}

/** A flat convex shape in x and y, given thickness in z and stood at height `y0`. */
function prism(outline: readonly (readonly [number, number])[], depth: number, y0: number): BufferGeometry {
  const out: number[] = [];
  const f = depth / 2;
  const n = outline.length;
  // The outline runs from left to right over the top, so it is clockwise seen
  // from the front. The fan below is wound for that.
  for (let i = 1; i < n - 1; i++) {
    const [ax, ay] = outline[0]!;
    const [bx, by] = outline[i]!;
    const [cx, cy] = outline[i + 1]!;
    out.push(ax, ay, f, cx, cy, f, bx, by, f);
    out.push(ax, ay, -f, bx, by, -f, cx, cy, -f);
  }
  for (let i = 0; i < n; i++) {
    const [ax, ay] = outline[i]!;
    const [bx, by] = outline[(i + 1) % n]!;
    out.push(ax, ay, f, bx, by, -f, ax, ay, -f);
    out.push(ax, ay, f, bx, by, f, bx, by, -f);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(out), 3));
  geometry.computeVertexNormals();
  geometry.translate(0, y0, 0);
  return geometry;
}

/** The parts of a look's frame, welded by colour. Null for a look that keeps the timber frame. */
export function lookFrameParts(look: AbacusLook, sizes: LookFrameSizes): LookPart[] | null {
  if (!look.frame || look.frame.kind === 'timber') return null;
  return look.frame.kind === 'reliquary' ? reliquaryFrame(look, sizes) : fittedFrame(look, sizes);
}

/** The gilt rim of a seat stud on the front of the left stile. */
export function seatStudRim(): BufferGeometry {
  return latheZ(
    [
      [0, 0],
      [0.125, 0],
      [0.125, 0.03],
      [0.085, 0.045],
      [0, 0.045],
    ],
    10,
  );
}

/** The stone of a seat stud: the seat's colour. */
export function seatStudStone(): BufferGeometry {
  return latheZ(
    [
      [0, 0.04],
      [0.085, 0.04],
      [0.06, 0.075],
      [0, 0.085],
    ],
    10,
  );
}

// --- materials, ground and plaque ----------------------------------------------

function rampTexture(values: readonly number[]): DataTexture {
  const data = new Uint8Array(values.map((value) => Math.round(value * 255)));
  const texture = new DataTexture(data, data.length, 1, RedFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function css(color: number, alpha = 1): string {
  return `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;
}

/** Everything a look owns on one stage: its materials and its textures. */
export class LookKit {
  private readonly ramps = new Map<LookRamp, DataTexture>();
  private readonly toons = new Map<string, MeshToonMaterial>();
  private readonly owned: { dispose(): void }[] = [];

  constructor(readonly look: AbacusLook) {}

  /** A toon material in this colour with this ramp, made once. */
  toon(color: number, ramp: LookRamp): MeshToonMaterial {
    const key = `${color}|${ramp}`;
    const existing = this.toons.get(key);
    if (existing) return existing;
    let map = this.ramps.get(ramp);
    if (!map) {
      map = rampTexture(RAMPS[ramp]);
      this.ramps.set(ramp, map);
    }
    const material = new MeshToonMaterial({ color, gradientMap: map });
    this.toons.set(key, material);
    return material;
  }

  /**
   * The ground: one unlit plane with a lighter pool under the frame, and the
   * soft shadow of the frame on it. Returns the ground and the shadow, which
   * the stage turns with the frame.
   */
  ground(frameWidth: number, footDepth: number): { ground: Mesh; shadow: Mesh } {
    const g = this.look.ground!;
    const size = 256;
    const pool = document.createElement('canvas');
    pool.width = size;
    pool.height = size;
    const context = pool.getContext('2d');
    if (context) {
      context.fillStyle = css(g.edge);
      context.fillRect(0, 0, size, size);
      const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, css(g.center, 1));
      gradient.addColorStop(0.45, css(g.center, 0.8));
      gradient.addColorStop(1, css(g.center, 0));
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    const poolMap = new CanvasTexture(pool);
    poolMap.colorSpace = SRGBColorSpace;
    const groundGeometry = new PlaneGeometry(g.poolX * 2, g.poolZ * 2);
    const groundMaterial = new MeshBasicMaterial({ map: poolMap });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.006;

    const blot = document.createElement('canvas');
    blot.width = size;
    blot.height = size / 2;
    const ink = blot.getContext('2d');
    if (ink) {
      ink.translate(size / 2, size / 4);
      ink.scale(1, 0.5);
      const gradient = ink.createRadialGradient(0, 0, 0, 0, 0, size / 2);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.55, 'rgba(255,255,255,0.75)');
      gradient.addColorStop(0.8, 'rgba(255,255,255,0.25)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ink.fillStyle = gradient;
      ink.fillRect(-size / 2, -size / 2, size, size);
    }
    const blotMap = new CanvasTexture(blot);
    const shadowGeometry = new PlaneGeometry(frameWidth * 1.3, footDepth * 3.2);
    const shadowMaterial = new MeshBasicMaterial({
      map: blotMap,
      color: g.shadow,
      transparent: true,
      opacity: g.shadowOpacity,
      depthWrite: false,
    });
    const shadow = new Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.002, -footDepth * 0.35);
    this.owned.push(poolMap, groundGeometry, groundMaterial, blotMap, shadowGeometry, shadowMaterial);
    return { ground, shadow };
  }

  /** The plaque on the top rail: a metal plate with the age numeral cut into it. */
  plaque(sizes: LookFrameSizes): Mesh | null {
    const frame = this.look.frame;
    if (!frame?.plaque) return null;
    const dark = frame.fitting === frame.stile;
    const plate = dark ? 0xe9dfc4 : frame.fitting;
    const cut = dark ? 0x37323a : 0x3d2619;
    const w = 320;
    const h = 80;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, css(plate));
      gradient.addColorStop(1, css(plate, 0.82));
      context.fillStyle = css(cut);
      context.fillRect(0, 0, w, h);
      context.fillStyle = gradient;
      context.fillRect(3, 3, w - 6, h - 6);
      context.strokeStyle = css(cut, 0.85);
      context.lineWidth = 2;
      context.strokeRect(9, 9, w - 18, h - 18);
      context.fillStyle = css(cut);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `600 46px 'IM Fell English', 'EB Garamond', 'Newsreader', Georgia, serif`;
      context.fillText(`ÆRA ${ageMark()}`, w / 2, h / 2 + 3);
      for (const x of [26, w - 26]) {
        context.beginPath();
        context.arc(x, h / 2, 4, 0, Math.PI * 2);
        context.fill();
      }
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    const height = sizes.railHeight * 0.62;
    const geometry = new PlaneGeometry(height * 4, height);
    const material = new MeshBasicMaterial({ map });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(0, sizes.innerTop + sizes.railHeight / 2, sizes.railDepth / 2 + 0.012);
    this.owned.push(map, geometry, material);
    return mesh;
  }

  dispose(): void {
    for (const material of this.toons.values()) material.dispose();
    for (const map of this.ramps.values()) map.dispose();
    for (const item of this.owned) item.dispose();
    this.toons.clear();
    this.ramps.clear();
    this.owned.length = 0;
  }
}
