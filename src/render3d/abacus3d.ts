/**
 * The Abacus: the victory scoreboard as a thing standing on the table.
 *
 * Built as a look-dev spike (`abacus.html`, still the page it is judged on) to
 * answer one question — *does scoring feel like something* — and promoted here
 * when the answer came back yes. A number that ticks from 4 to 5 is information;
 * a bead that comes off the waiting stack, runs down a brass rod and knocks into
 * the earned ones is an event, and this whole module exists to make that
 * half-second worth watching.
 *
 * The look
 * --------
 * Look B, "Walnut and gilt", which the user chose on 2026-11-19 from a board of
 * renders (`docs/plans/ui-critique-2026-10-16.md`, the last subsection), with
 * the gilt band on the beads removed at the user's request. The parts:
 * - a dark walnut frame with gilt shoes on the rail ends, a gilt line let into
 *   each rail, a turned knob on each post and turned feet under each sledge;
 * - a brass plaque on the top rail with the world's age (`setAge`);
 * - pale brass rods with a ball at each end;
 * - a stud in each seat's colour on the left post, at that seat's rod;
 * - enamel beads in the four family colours, and smaller ivory beads for the
 *   places not earned yet;
 * - a parchment ground with a pool of light and a soft shadow under the frame.
 *
 * Every number the look is cut from is `VIEW3D.abacus` (`data/view3d.json`), and
 * every colour is a palette name there. This file holds the algorithms only.
 * The outline is the board's inverted hull (`MaterialLibrary.outline`), at a
 * share of the board's width and in a dark brown. Each part takes the light
 * through one of three toon ramps (`abacus.ramps`): matte for the walnut and
 * the ivory, gloss for the enamel, metal for the gilt and the brass.
 *
 * Two consumers
 * -------------
 * `src/ui/abacusScreen.ts` is the in-game screen: one rod per seat at the
 * current table, opened from the bar or `A`. `src/abacusSpike/main.ts` is the
 * look-dev page, which keeps the demo buttons — earning a bead is a thing the
 * *game* will do at M11, and a button that fakes it has no business in the game.
 * Both drive exactly the API below, so the page cannot drift from the screen.
 * The bead page (`beadAwardFrame.ts`) and the Opus close (`opusClose.ts`) mount
 * the same stage.
 *
 * Geometry
 * --------
 * Every part is a primitive, an extrusion or a lathe, and all of the shapes live
 * in `geometry.ts` (its "the Abacus" section). The bars are chamfered timber,
 * one closed convex shell each, so the inverted-hull outline stays a silhouette
 * instead of laying stripes down the rails. Parts of one colour and one ramp
 * are welded into one geometry, so the frame is five draws and not thirty.
 *
 * Ordering
 * --------
 * The one invariant the animation rests on: **beads never reorder**. The bead
 * that slides on a score is the leftmost of the waiting cluster, and it lands as
 * the rightmost of the earned cluster — so the physical left-to-right order of
 * the thirteen beads on a rod is the same before and after, and "where does bead
 * i belong" is a pure function of how many are earned (`beadX`). Nothing else on
 * the rod moves, which is exactly what a real abacus does and why the animation
 * needs no bookkeeping at all.
 *
 * Instancing, deliberately not
 * ---------------------------
 * The adoption checklist asked whether the beads should be one `InstancedMesh`
 * per rod. They are not, and the reason is that both halves of the look fight
 * it: a bead's *colour* is its scoring family, so instancing would need a
 * vertex-coloured toon material and a per-instance colour buffer, and the
 * inverted-hull shell would need a second instanced mesh kept in step with it.
 * The whole object is under a hundred draws at three seats, and it is a modal
 * screen, so the board is not drawing while it is up. The saving is real only
 * in the world where the Abacus becomes a corner widget on top of a live board,
 * and that is the day to spend it.
 *
 * Built for N players. Rod pitch, bead size and the tally all fall out of the
 * player count; the game seats two today and nothing here knows that.
 */

import {
  AmbientLight,
  Box3,
  type BufferGeometry,
  CanvasTexture,
  Color,
  DataTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  OrthographicCamera,
  PCFShadowMap,
  PlaneGeometry,
  RedFormat,
  SRGBColorSpace,
  Scene,
  Sprite,
  SpriteMaterial,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
} from 'three';

import { eraNumeral } from '../sim/techData';
import {
  beadShape,
  bunFoot,
  chamferedBar,
  flatBox,
  rodBar,
  rodFinial,
  studRim,
  studStone,
  turnedKnob,
  uprightBar,
  weld,
} from './geometry';
import {
  type AbacusFamily,
  type AbacusRamp,
  type FamilyId,
  VIEW3D,
} from './lookData';
import { MaterialLibrary, computeHullNormals } from './toon';

export type { AbacusFamily, FamilyId } from './lookData';
export { FAMILY_IDS } from './lookData';

const LOOK = VIEW3D.look;
const LIGHTS = VIEW3D.lights;
const ABACUS = VIEW3D.abacus;
const FRAME = ABACUS.frame;
const CLOSE = ABACUS.close;
const DEG = Math.PI / 180;

// --- the look-dev switches ----------------------------------------------------

/** `abacus.html?abacusPlaces=8`: the places on a rod, or null for `bead.perRod`. */
let lookDevPlaces: number | null = null;
/** `abacus.html?abacusFreeze=0.5`: the share of a slide at which it stops, or null. */
let lookDevFreeze: number | null = null;

/**
 * **The look-dev switches**, for `abacus.html` and nothing else. The game never
 * calls this.
 *
 * - `places`: the number of places on a rod. That number is an open rule
 *   question, so the user can see the frame at 8 as well as at the data's 13.
 * - `freezeAt`: stops every slide at that share of its time, for a still picture.
 *
 * Call it before any stage is built: a stage reads both when it is made. A value
 * out of range is ignored.
 */
export function setAbacusLookDev(options: { places?: number | null; freezeAt?: number | null }): void {
  if (options.places !== undefined) {
    const places = options.places;
    lookDevPlaces = places !== null && Number.isInteger(places) && places >= 1 && places <= 20 ? places : null;
  }
  if (options.freezeAt !== undefined) {
    const at = options.freezeAt;
    lookDevFreeze = at !== null && Number.isFinite(at) && at > 0 && at < 1 ? at : null;
  }
}

// --- the pure arithmetic ----------------------------------------------------

/**
 * The heights the frame is assembled at, derived once from the proportions.
 *
 * Exported because the screen's own chrome wants the same numbers the geometry
 * does — and because a test can check that the parts still stack into a frame
 * after somebody edits `view3d.json`, which is exactly the failure a look file
 * makes easy.
 */
interface FrameMetrics {
  footTop: number;
  /** The underside of the clear span: the top of the bottom rail. */
  innerBottom: number;
  innerTop: number;
  totalHeight: number;
  /** Half the clear span between the stiles' inner faces. */
  innerHalfSpan: number;
}

export function frameMetrics(): FrameMetrics {
  const footTop = FRAME.footHeight;
  const innerBottom = footTop + FRAME.railHeight;
  const innerTop = innerBottom + FRAME.innerHeight;
  return {
    footTop,
    innerBottom,
    innerTop,
    totalHeight: innerTop + FRAME.railHeight,
    innerHalfSpan: FRAME.width / 2 - FRAME.stileWidth,
  };
}

/**
 * How a table of `playerCount` rods is cut.
 *
 * This is the whole of "build for N": the rods divide the clear height evenly
 * and the bead size falls out of that pitch rather than being a constant. Two
 * players get fat beads on a wide pitch; six get smaller ones on a tight pitch,
 * and the object is still an abacus instead of a rack of overlapping discs.
 *
 * Player 0 takes the *top* rod. A scoreboard is read downward.
 */
interface RodLayout {
  pitch: number;
  beadRadius: number;
  halfThickness: number;
  /** Bead pitch along a rod, neighbours' clearance included. */
  beadStep: number;
  /** How far from the centre a run of beads reaches, in world x. */
  runEdge: number;
  /** World y of each rod, top first. */
  rodY: readonly number[];
  /** The places on each rod: `bead.perRod`, or the look-dev number. */
  places: number;
}

export function rodLayout(playerCount: number, places: number = ABACUS.bead.perRod): RodLayout {
  const bead = ABACUS.bead;
  const metrics = frameMetrics();
  const pitch = FRAME.innerHeight / (playerCount + 1);
  const beadRadius = Math.min(bead.maxRadius, pitch * bead.pitchFraction);
  const halfThickness = beadRadius * bead.thicknessRatio;
  const rodY: number[] = [];
  for (let i = 0; i < playerCount; i++) rodY.push(metrics.innerTop - pitch * (i + 1));
  return {
    pitch,
    beadRadius,
    halfThickness,
    // A hair of clearance between neighbours, so a packed stack still shows
    // thirteen outlines rather than one long dark sausage.
    beadStep: halfThickness * 2 + bead.clearance,
    runEdge: metrics.innerHalfSpan - ABACUS.rod.finialSize - bead.finialClearance,
    rodY,
    places,
  };
}

/**
 * Where bead `index` belongs on a rod with `earned` beads slid over.
 *
 * The earned pack left from the left finial, the waiting pack right from the
 * right one, and the gap between them is whatever is left. Because beads never
 * reorder (see the file docblock), this is total — there is no per-bead state to
 * keep in step with it, and a rod can be put into any state by calling this once
 * per bead.
 */
export function beadX(layout: RodLayout, index: number, earned: number): number {
  if (index < earned) {
    return -layout.runEdge + layout.beadStep / 2 + index * layout.beadStep;
  }
  const fromRight = layout.places - 1 - index;
  return layout.runEdge - layout.beadStep / 2 - fromRight * layout.beadStep;
}

/**
 * The slide: out to a hair past the stack, then a short bounce back onto it.
 *
 * Both halves are `easeOutCubic`, which is the honest curve for a thing that was
 * pushed and is being stopped by friction — it leaves at speed and arrives
 * slowly, where an ease-in-out would have the bead accelerate out of a stack it
 * is supposedly resting in.
 *
 * The overshoot is a fixed world distance rather than a fraction of the trip: as
 * a fraction it would be a finger's width on a long slide and invisible on a
 * short one, and a bead should knock into the stack by the same amount however
 * far it came.
 */
export function slidePosition(
  from: number,
  to: number,
  t: number,
  slide: { travel: number; overshoot: number } = ABACUS.slide,
): number {
  if (t >= 1) return to;
  const over = to + Math.sign(to - from) * slide.overshoot;
  if (t < slide.travel) {
    const u = t / slide.travel;
    return from + (over - from) * (1 - (1 - u) ** 3);
  }
  const u = (t - slide.travel) / (1 - slide.travel);
  return over + (to - over) * (1 - (1 - u) ** 3);
}

/**
 * **How large a sliding bead is**, as a share of an earned bead, `t` from 0 to 1
 * into the slide. A place not earned is drawn at `bead.waitingScale`; the bead
 * that leaves it grows to full size over the first `bead.growShare` of the
 * slide's travel, easing out, so it is full size well before it lands.
 */
export function growScale(t: number): number {
  const bead = ABACUS.bead;
  const span = ABACUS.slide.travel * bead.growShare;
  const grown = span <= 0 ? 1 : Math.max(0, Math.min(1, t / span));
  return bead.waitingScale + (1 - bead.waitingScale) * (1 - (1 - grown) ** 3);
}

/** One damped swing, `sin(πt)·(1 − t)`: at rest at both ends. */
function knockSwing(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return Math.sin(clamped * Math.PI) * (1 - clamped);
}

/** The swing's highest point (about 0.58, a third of the way in), so `knock.reach` is the real peak. */
const KNOCK_PEAK = Math.max(...Array.from({ length: 401 }, (_, i) => knockSwing(i / 400)));

/**
 * **The knock**: how far the earned bead `fromNewest` places from the bead that
 * just landed is pushed away from it, `t` from 0 to 1 into the knock. One damped
 * swing, so it starts and ends at rest. At its peak the bead next to the new one
 * has moved `knock.reach`; each bead past it moves `knock.falloff` of its
 * neighbour's move.
 */
export function knockOffset(fromNewest: number, t: number): number {
  const knock = ABACUS.knock;
  return (knock.reach * knockSwing(t) * knock.falloff ** Math.max(0, fromNewest - 1)) / KNOCK_PEAK;
}

/**
 * **Where the golden bead comes to rest** (batch SS7, the Opus close).
 *
 * It lands as the next earned bead, so its place is `beadX` for one more bead
 * earned, pushed right by the half-width it has gained from being drawn larger.
 * Without the push a larger bead would sink into the earned bead beside it.
 */
export function goldenRestX(layout: RodLayout, index: number, scale: number): number {
  return beadX(layout, index, index + 1) + (scale - 1) * layout.halfThickness;
}

/**
 * **The turn of the Opus close**: out to `degrees` and back, over `t` from 0 to
 * 1, in radians. `(1 − cos 2πt) / 2` starts and ends at rest and peaks at the
 * middle, so the frame neither jerks into the turn nor out of it.
 */
export function turnYaw(t: number, degrees: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return ((1 - Math.cos(clamped * Math.PI * 2)) / 2) * degrees * DEG;
}

/** `easeInOutCubic`: the camera's move, which starts and stops gently. */
function easeInOut(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}

/** The scoring family with this id, or a loud error. */
export function familyOf(id: FamilyId): AbacusFamily {
  const family = ABACUS.families.find((entry) => entry.id === id);
  if (!family) throw new Error(`Unknown scoring family: ${id}`);
  return family;
}

/** The families in the order a cycling control walks them. */
export const FAMILIES: readonly AbacusFamily[] = ABACUS.families;

/** `0x7c5f8c` → `#7c5f8c`, for the DOM swatches. */
export function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** "ÆRA II": the plaque's words for an age, as the tech chart labels an age. */
export function plaqueWords(age: number): string {
  return `ÆRA ${eraNumeral(age)}`;
}

/**
 * **The plaque's size and whether it shows the numeral**, given how many CSS
 * pixels tall the plate is at its own size.
 *
 * The plate grows (up to `plaque.maxHeight` of the rail) until the numeral is
 * `plaque.minNumeralPx` tall. If the numeral would still be under
 * `plaque.blankBelowPx`, the plate is drawn without it: a numeral nobody can
 * read is worse than a plain brass plate. Pure, so a test can pin it.
 */
export function plaqueFit(basePx: number): { scale: number; numeral: boolean } {
  const spec = ABACUS.plaque;
  if (!(basePx > 0)) return { scale: 1, numeral: false };
  const most = Math.max(1, spec.maxHeight / spec.height);
  const wanted = spec.minNumeralPx / spec.numeralShare / basePx;
  const scale = Math.min(most, Math.max(1, wanted));
  return { scale, numeral: basePx * scale * spec.numeralShare >= spec.blankBelowPx };
}

/**
 * **How far the Opus close may move in**: `close.zoom`, or less where that much
 * would push the frame past the sides of the canvas.
 *
 * `halfWidth` is the half-width of the fitted view, `centre` is where the camera
 * looks once it has slid toward the rod, and `left`/`right` are the frame's
 * edges, all in the fitted camera's x. The frame keeps the fit's own padding.
 */
export function closeZoom(halfWidth: number, centre: number, left: number, right: number, padding: number): number {
  const reach = Math.max(Math.abs(left - centre), Math.abs(right - centre)) * padding;
  if (!(reach > 0)) return CLOSE.zoom;
  return Math.max(1, Math.min(CLOSE.zoom, halfWidth / reach));
}

// --- state ------------------------------------------------------------------

export interface AbacusPlayer {
  name: string;
  /** The player's diorama ink, for the label swatch and the stud on the post. */
  color: number;
}

/** What a stage can be told when it is built. */
export interface AbacusStageOptions {
  /** The world's age, for the plaque's numeral. Null or absent leaves the plate plain. */
  age?: number | null;
}

/** One bead on one rod: a mesh, where it is, and where it is going. */
interface BeadView {
  mesh: Mesh;
  /** Position along the rod, in world x within the object's own frame. */
  x: number;
  from: number;
  to: number;
  /** Seconds into the slide; `null` when the bead is at rest. */
  elapsed: number | null;
  /** Whether the landing clack has already been fired for this slide. */
  struck: boolean;
  /** Its size at rest: `bead.waitingScale` while it waits, 1 once earned. */
  rest: number;
}

interface RodView {
  y: number;
  beads: BeadView[];
  earned: FamilyId[];
  /** Seconds since a bead landed on this rod and knocked the others, or null. */
  knock: number | null;
}

/**
 * **The golden bead on the frame** (batch SS7). Before the Opus close the frame
 * never drew it: only the register under the frame showed it, in its golden
 * slot. On the close it lights at the start of the winner's unearned beads,
 * larger than the rest and with a halo, and then slides home with the frame's
 * own slide.
 */
interface GoldenView {
  rod: number;
  /** Which bead on the rod it is: the first of the unearned ones. */
  index: number;
  glow: Sprite;
  /** Seconds into the lighting, and how long the lighting takes. */
  elapsed: number;
  seconds: number;
  /** Where it stood, and where it stands once lit (moved left by what it gained in width). */
  fromX: number;
  litX: number;
}

/** The camera move of the Opus close: which rod, and how far in, from 0 to 1. */
interface FocusView {
  rod: number;
  from: number;
  to: number;
  amount: number;
  elapsed: number;
  seconds: number;
}

/** What a player's DOM label needs: two projected points and a fade. */
interface LabelPlacement {
  left: { x: number; y: number };
  right: { x: number; y: number };
  /** 0 when the object has turned far enough that the labels no longer belong. */
  opacity: number;
}

/**
 * The abacus's toon materials: one per colour and ramp, made once. The three
 * ramps are `abacus.ramps`; each is a row of brightness bands, read with
 * nearest filtering so the bands stay hard.
 */
class RampMaterials {
  private readonly maps = new Map<AbacusRamp, DataTexture>();
  private readonly cache = new Map<string, MeshToonMaterial>();

  get(color: number, ramp: AbacusRamp): MeshToonMaterial {
    const key = `${color}|${ramp}`;
    const existing = this.cache.get(key);
    if (existing) return existing;
    let map = this.maps.get(ramp);
    if (!map) {
      const bands = ABACUS.ramps[ramp];
      const data = new Uint8Array(bands.map((band) => Math.round(band * 255)));
      map = new DataTexture(data, data.length, 1, RedFormat, UnsignedByteType);
      map.magFilter = NearestFilter;
      map.minFilter = NearestFilter;
      map.generateMipmaps = false;
      map.needsUpdate = true;
      this.maps.set(ramp, map);
    }
    const material = new MeshToonMaterial({ color, gradientMap: map });
    this.cache.set(key, material);
    return material;
  }

  dispose(): void {
    for (const material of this.cache.values()) material.dispose();
    for (const map of this.maps.values()) map.dispose();
    this.cache.clear();
    this.maps.clear();
  }
}

/** A palette colour as CSS `rgba()`, for the 2D canvases the ground and plaque are drawn on. */
function rgba(color: number, alpha = 1): string {
  return `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;
}

/** The plaque's picture, in texture pixels. */
const PLAQUE_PIXELS = { width: 320, height: 80 } as const;

export class AbacusStage {
  private players: readonly AbacusPlayer[];
  /** Fired the instant a bead knocks into the earned stack. */
  onStrike: (() => void) | null = null;
  /**
   * Fired after every rendered frame, for the DOM labels.
   *
   * Per frame rather than per layout change — the Armory's labels can be placed
   * once because its camera and its plinths never move, but this object sways,
   * and a tag that did not sway with it would visibly come unstuck.
   */
  onFrame: (() => void) | null = null;

  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: OrthographicCamera;
  /** The board's material kit, for the outline shell and its width. */
  private readonly materials: MaterialLibrary;
  /** The abacus's own toon materials, by colour and ramp. */
  private readonly ramps = new RampMaterials();
  private readonly key: DirectionalLight;

  /** Everything that is the abacus. Sway and turntable turn this and nothing else. */
  private readonly object = new Group();
  /**
   * The rods and their beads, alone in a group of their own.
   *
   * The frame does not change with the roster; the rods are the whole of what
   * does. Keeping them in one group is what makes `setPlayers` a teardown of a
   * subtree rather than a rebuild of the object — which matters because a new
   * game must not cost a new WebGL context.
   */
  private readonly rodGroup = new Group();
  private readonly rods: RodView[] = [];
  /** Geometries that live as long as the stage does. */
  private readonly frameGeometries: BufferGeometry[] = [];
  /** Geometries owned by the current roster, disposed when it changes. */
  private rodGeometries: BufferGeometry[] = [];
  /** Textures and materials of the ground and the plaque, disposed with the stage. */
  private readonly owned: { dispose(): void }[] = [];

  private layout: RodLayout;
  private readonly places = lookDevPlaces ?? ABACUS.bead.perRod;
  private readonly freezeAt = lookDevFreeze;
  /** The soft shadow on the ground, which turns with the frame. */
  private groundShadow: Mesh | null = null;

  /** The plaque, its picture, and what the picture shows. */
  private plaque: Mesh | null = null;
  private plaqueCanvas: HTMLCanvasElement | null = null;
  private plaqueMap: CanvasTexture | null = null;
  private age: number | null;
  private plaqueNumeral = false;

  private aspect = 1;
  private frustum = 1;
  /** The bands the frame stays out of, as shares of the canvas height. See `setClearBands`. */
  private clearTop = 0;
  private clearBottom = 0;
  private frameDraws = 0;
  private frameTriangles = 0;
  private rodDraws = 0;
  private rodTriangles = 0;

  private spin = false;
  private sway = true;
  private yaw = 0;
  private clock = 0;
  private lastFrame = 0;
  private running = false;
  private disposed = false;

  /** The golden bead, once the Opus close has lit it. */
  private golden: GoldenView | null = null;
  /** The halo's soft disc, drawn once on first use. */
  private glowMap: CanvasTexture | null = null;
  /** The camera move, at rest at nought until the Opus close asks for it. */
  private focus: FocusView = { rod: 0, from: 0, to: 0, amount: 0, elapsed: 0, seconds: 0 };
  /** The turn of the Opus close while it runs, or null. */
  private turning: { elapsed: number; seconds: number } | null = null;
  /** The turn's own share of the frame's yaw this frame, in radians. */
  private turnAngle = 0;
  /** The camera as `fit` left it, which the camera move starts from. */
  private baseFrustum = 1;
  private readonly basePosition = new Vector3();
  private readonly baseRight = new Vector3(1, 0, 0);
  private readonly baseUp = new Vector3(0, 1, 0);
  private readonly baseView = new Matrix4();
  /** The frame's left and right edges in the fitted camera's x, gutters left out. */
  private frameLeft = -1;
  private frameRight = 1;

  constructor(canvas: HTMLCanvasElement, players: readonly AbacusPlayer[], options: AbacusStageOptions = {}) {
    this.players = players;
    this.age = options.age ?? null;
    this.layout = rodLayout(players.length, this.places);

    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = LOOK.shadows;
    // `PCFSoftShadowMap` is deprecated in three r185, which warns and uses this.
    this.renderer.shadowMap.type = PCFShadowMap;
    // The colour at the edge of the ground, so the view has no edge where the
    // ground plane stops. `frameGround` gives the pages the same colour.
    this.scene.background = new Color(ABACUS.ground.edgeColor);

    this.materials = new MaterialLibrary(LOOK.rampSteps, ABACUS.outline.color);
    this.materials.outlineWidth.value = LOOK.outline * ABACUS.outline.share;

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 1, 600);

    const light = ABACUS.light;
    this.key = new DirectionalLight(LIGHTS.keyColor, light.key);
    this.key.castShadow = LOOK.shadows;
    this.key.shadow.mapSize.set(LOOK.shadowMapSize, LOOK.shadowMapSize);
    this.key.shadow.bias = LOOK.shadowBias;
    this.key.shadow.normalBias = LOOK.shadowNormalBias;
    this.scene.add(this.key, this.key.target);
    this.scene.add(new HemisphereLight(LIGHTS.skyColor, LIGHTS.groundColor, light.hemi));
    this.scene.add(new AmbientLight(LIGHTS.ambientColor, light.ambient));

    this.scene.add(this.object);
    this.object.add(this.rodGroup);
    this.buildGround();
    this.buildFrame();
    this.buildRods();

    this.resize();
    this.loop = this.loop.bind(this);
    this.setRunning(true);
  }

  get seats(): readonly AbacusPlayer[] {
    return this.players;
  }

  get stats(): { draws: number; triangles: number } {
    return {
      draws: this.frameDraws + this.rodDraws,
      triangles: this.frameTriangles + this.rodTriangles,
    };
  }

  get beadsPerRod(): number {
    return this.places;
  }

  earnedCount(rodIndex: number): number {
    return this.rods[rodIndex]?.earned.length ?? 0;
  }

  setSpinning(on: boolean): void {
    this.spin = on;
  }

  /** Reduced motion turns both off; the object is perfectly readable static. */
  setSway(on: boolean): void {
    this.sway = on;
    if (!on && !this.spin) this.yaw = 0;
  }

  /**
   * **The age on the plaque**: the world's age, or null for a plain plate. The
   * Abacus screen calls this each time it opens, because its stage outlives an
   * age.
   */
  setAge(age: number | null): void {
    if (age === this.age) return;
    this.age = age;
    this.paintPlaque();
  }

  /**
   * Starts or stops the animation loop.
   *
   * A closed screen must cost nothing: `requestAnimationFrame` is not scheduled
   * at all while this is off, rather than being scheduled and returning early.
   * The frame clock restarts from the next timestamp, so a stage that sat closed
   * for a minute does not resume by fast-forwarding a minute of sway.
   */
  setRunning(on: boolean): void {
    if (this.disposed || this.running === on) return;
    this.running = on;
    if (!on) return;
    this.lastFrame = 0;
    requestAnimationFrame(this.loop);
  }

  /**
   * Re-strings the frame for a different table.
   *
   * A new game can change how many people are at it and what they are called, so
   * the rods come off and go back on while the frame, the lights, the camera and
   * the WebGL context all stay exactly where they are. Rebuilding the whole
   * stage instead would mean a second context on the same canvas, which is the
   * one thing a browser will not give you.
   */
  setPlayers(players: readonly AbacusPlayer[]): void {
    this.players = players;
    this.layout = rodLayout(players.length, this.places);
    this.clearRods();
    this.buildRods();
    // The frustum is fitted to the frame, not to the rods, so it does not move —
    // but the light's shadow extent is fitted with it, and refitting is cheap.
    this.fit();
  }

  // --- scoring -------------------------------------------------------------

  /**
   * Slide one bead from the waiting cluster into the earned one.
   *
   * Returns false when the rod is full, which is the stand-in for "this player
   * has already won" until M11 gives the sim a real victory line.
   */
  earn(rodIndex: number, family: FamilyId): boolean {
    const rod = this.rods[rodIndex];
    if (!rod || rod.earned.length >= rod.beads.length) return false;

    rod.earned.push(family);
    const index = rod.earned.length - 1;
    const bead = rod.beads[index]!;
    this.paintBead(bead, family);
    bead.from = bead.x;
    bead.to = beadX(this.layout, index, rod.earned.length);
    bead.elapsed = 0;
    bead.struck = false;
    return true;
  }

  // --- the Opus close ------------------------------------------------------

  /**
   * **Lights the golden bead** on a rod: the first of its unearned beads turns
   * gold, grows from its waiting size to `close.goldenScale` and takes its halo,
   * over `seconds` (0 for at once). It moves left by the width it gains, so it
   * never presses into the waiting bead beside it.
   *
   * Returns false when the rod has no unearned bead left to light, or a golden
   * bead is already lit: there is one golden bead in a game.
   */
  lightGolden(rodIndex: number, seconds: number): boolean {
    const rod = this.rods[rodIndex];
    if (!rod || this.golden || rod.earned.length >= rod.beads.length) return false;
    const index = rod.earned.length;
    const bead = rod.beads[index]!;
    bead.elapsed = null;
    bead.rest = 1;
    bead.mesh.material = this.ramps.get(CLOSE.goldenColor, CLOSE.goldenRamp);
    const glow = new Sprite(
      new SpriteMaterial({
        map: this.glowTexture(),
        color: CLOSE.glowColor,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    );
    // In the bead's own units, so it grows with the bead it is the halo of.
    const size = this.layout.beadRadius * CLOSE.glowRadius * 2;
    glow.scale.set(size, size, 1);
    bead.mesh.add(glow);
    const gain = (CLOSE.goldenScale - 1) * this.layout.halfThickness;
    this.golden = {
      rod: rodIndex,
      index,
      glow,
      elapsed: 0,
      seconds: Math.max(0, seconds),
      fromX: bead.x,
      litX: bead.x - gain,
    };
    this.applyGolden();
    return true;
  }

  /**
   * **Slides the golden bead home**: the frame's own slide (`slidePosition`,
   * the overshoot and the knock that fires `onStrike`), to the place after the
   * earned beads. The earned count does not move: the golden bead is not one of
   * the beads the threshold counts.
   */
  slideGolden(): boolean {
    const golden = this.golden;
    if (!golden) return false;
    // A slide asked for before the lighting finished lands the lighting first.
    golden.elapsed = golden.seconds;
    this.applyGolden();
    const bead = this.rods[golden.rod]?.beads[golden.index];
    if (!bead) return false;
    bead.from = bead.x;
    bead.to = goldenRestX(this.layout, golden.index, CLOSE.goldenScale);
    bead.elapsed = 0;
    bead.struck = false;
    return true;
  }

  /**
   * **Moves the camera in on a rod**, to `amount` (0 is the fitted view, 1 is
   * as far in as `closeZoom` allows), over `seconds`. The DOM labels are
   * projected through the live camera, so they follow without being told.
   */
  focusRod(rodIndex: number, amount: number, seconds: number): void {
    const from = this.focus.amount;
    this.focus = { rod: rodIndex, from, to: amount, amount: from, elapsed: 0, seconds: Math.max(0, seconds) };
    if (this.focus.seconds === 0) {
      this.focus.amount = amount;
      this.applyFocus();
    }
  }

  /** **Turns the frame** `close.turnDegrees` on its turntable and back, over `seconds`. */
  turn(seconds: number): void {
    this.turning = { elapsed: 0, seconds: Math.max(0.001, seconds) };
  }

  /** How far into its turn the frame is, from 0 (facing) to 1 (turned furthest). */
  get turnAmount(): number {
    const peak = CLOSE.turnDegrees * DEG;
    return peak === 0 ? 0 : Math.abs(this.turnAngle) / peak;
  }

  /** The halo's soft disc: white at the middle, clear at the rim, tinted by the material. */
  private glowTexture(): CanvasTexture {
    if (this.glowMap) return this.glowMap;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (context) {
      const half = size / 2;
      const gradient = context.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.45, 'rgba(255,255,255,0.5)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    this.glowMap = new CanvasTexture(canvas);
    return this.glowMap;
  }

  /** The golden bead's size, halo and place for how far its lighting has gone. */
  private applyGolden(): void {
    const golden = this.golden;
    if (!golden) return;
    const bead = this.rods[golden.rod]?.beads[golden.index];
    if (!bead) return;
    const t = golden.seconds === 0 ? 1 : Math.min(1, golden.elapsed / golden.seconds);
    const lit = 1 - (1 - t) ** 3;
    // It grows from the waiting place's size, not from an earned bead's.
    const start = ABACUS.bead.waitingScale;
    bead.mesh.scale.setScalar(start + (CLOSE.goldenScale - start) * lit);
    (golden.glow.material as SpriteMaterial).opacity = CLOSE.glowOpacity * lit;
    // Only while it stands: once it slides, the slide owns its place.
    if (bead.elapsed === null) {
      bead.x = golden.fromX + (golden.litX - golden.fromX) * lit;
      bead.mesh.position.x = bead.x;
    }
  }

  /** Takes the golden bead off the frame again: its halo, its size and its gold. */
  private clearGolden(): void {
    const golden = this.golden;
    if (!golden) return;
    golden.glow.removeFromParent();
    (golden.glow.material as SpriteMaterial).dispose();
    const bead = this.rods[golden.rod]?.beads[golden.index];
    bead?.mesh.scale.setScalar(1);
    this.golden = null;
  }

  /**
   * The camera for the move's present amount: closer by up to `closeZoom`, and
   * slid toward the rod by up to `close.focusPan` of the way, both measured from
   * the camera `fit` left.
   */
  private applyFocus(): void {
    const amount = this.focus.amount;
    const y = this.layout.rodY[this.focus.rod] ?? 0;
    const target = new Vector3(0, y, 0).applyMatrix4(this.baseView);
    const pan = amount * CLOSE.focusPan;
    this.camera.position
      .copy(this.basePosition)
      .addScaledVector(this.baseRight, target.x * pan)
      .addScaledVector(this.baseUp, target.y * pan);
    // The camera's centre in the fitted view's x, at the full move. The zoom is
    // limited there, so the frame keeps its sides at every amount on the way.
    const zoom = closeZoom(
      this.baseFrustum * this.aspect,
      target.x * CLOSE.focusPan,
      this.frameLeft,
      this.frameRight,
      ABACUS.camera.padding,
    );
    const frustum = this.baseFrustum / (1 + (zoom - 1) * amount);
    this.camera.left = -frustum * this.aspect;
    this.camera.right = frustum * this.aspect;
    this.camera.top = frustum;
    this.camera.bottom = -frustum;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  /** Puts a rod straight into a given state, with no animation. For the seed. */
  seed(rodIndex: number, earned: readonly FamilyId[]): void {
    const rod = this.rods[rodIndex];
    if (!rod) return;
    if (this.golden?.rod === rodIndex) this.clearGolden();
    rod.earned = earned.slice(0, rod.beads.length);
    rod.knock = null;
    rod.beads.forEach((bead, index) => {
      const family = rod.earned[index];
      this.paintBead(bead, family ?? null);
      bead.mesh.scale.setScalar(bead.rest);
      bead.elapsed = null;
      bead.x = beadX(this.layout, index, rod.earned.length);
      bead.mesh.position.x = bead.x;
    });
  }

  /**
   * Gives a bead the enamel of its family, or the ivory of a place not earned
   * yet, and the size it rests at: a waiting place is drawn smaller.
   */
  private paintBead(bead: BeadView, family: FamilyId | null): void {
    const style = ABACUS.bead;
    if (family === null) {
      bead.mesh.material = this.ramps.get(style.waitingColor, style.waitingRamp);
      bead.rest = style.waitingScale;
    } else {
      bead.mesh.material = this.ramps.get(familyOf(family).color, style.ramp);
      bead.rest = 1;
    }
  }

  // --- labels --------------------------------------------------------------

  /**
   * Where a rod's two DOM labels belong, in CSS pixels from the canvas corner.
   *
   * Projected through the object's *live* transform rather than through its rest
   * pose, so the labels breathe with the sway exactly as if they were printed on
   * the frame. That costs four `project` calls a frame, which is nothing, and it
   * is the difference between a tag that belongs to the object and one that is
   * floating in front of it.
   *
   * The fade is what saves the turntable: at ninety degrees a name pinned to the
   * left end of a rod is somewhere behind the frame, so it stops being drawn
   * before it gets there.
   */
  labelPlacement(rodIndex: number): LabelPlacement {
    const y = this.layout.rodY[rodIndex] ?? 0;
    const label = ABACUS.label;
    const reach = frameMetrics().innerHalfSpan + FRAME.stileWidth + label.reach;
    const facing = Math.cos(this.object.rotation.y);
    return {
      left: this.project(-reach, y, 0),
      right: this.project(reach, y, 0),
      opacity: Math.max(0, Math.min(1, (facing - label.fadeFrom) / label.fadeSpan)),
    };
  }

  /**
   * **Where a rod's labels go when the camera has moved in on it** (the Opus
   * close): just inside the two stiles and a little above the rod, as the
   * Moments board draws the winner's name and tally once the gutters have left
   * the view.
   */
  insideLabelPlacement(rodIndex: number): { left: { x: number; y: number }; right: { x: number; y: number } } {
    // Above the beads' rims as the low camera sees them (a bead seen from 24°
    // shows its face above its radius), and still short of the rod above or
    // the top rail.
    const y = (this.layout.rodY[rodIndex] ?? 0) + this.layout.pitch * 0.62;
    const reach = frameMetrics().innerHalfSpan - ABACUS.rod.finialSize;
    return { left: this.project(-reach, y, 0), right: this.project(reach, y, 0) };
  }

  /** How far the camera has moved in, from 0 (the fitted view) to 1. */
  get focusAmount(): number {
    return this.focus.amount;
  }

  private project(x: number, y: number, z: number): { x: number; y: number } {
    const point = new Vector3(x, y, z);
    this.object.localToWorld(point);
    point.project(this.camera);
    const canvas = this.renderer.domElement;
    return {
      x: ((point.x + 1) / 2) * canvas.clientWidth,
      y: ((1 - point.y) / 2) * canvas.clientHeight,
    };
  }

  // --- construction --------------------------------------------------------

  /**
   * The ground: one unlit plane with a lighter pool of light under the frame,
   * fading to `ground.edgeColor` at its edges, and a soft shadow under the frame.
   *
   * Unlit, so the pool is exactly the colours in the data and the page around
   * the canvas can match its edge (`frameGround`). A plane cannot receive the
   * cast shadow unlit, so the frame's shadow on the ground is a drawn blot that
   * turns with the frame. The cast shadows of the beads on the rails stay.
   */
  private buildGround(): void {
    const ground = ABACUS.ground;
    const size = 256;
    const pool = document.createElement('canvas');
    pool.width = size;
    pool.height = size;
    const poolContext = pool.getContext('2d');
    if (poolContext) {
      poolContext.fillStyle = rgba(ground.edgeColor);
      poolContext.fillRect(0, 0, size, size);
      const gradient = poolContext.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, rgba(ground.centerColor, 1));
      gradient.addColorStop(0.45, rgba(ground.centerColor, 0.8));
      gradient.addColorStop(1, rgba(ground.centerColor, 0));
      poolContext.fillStyle = gradient;
      poolContext.fillRect(0, 0, size, size);
    }
    const poolMap = new CanvasTexture(pool);
    poolMap.colorSpace = SRGBColorSpace;
    const planeGeometry = new PlaneGeometry(ground.poolX * 2, ground.poolZ * 2);
    const planeMaterial = new MeshBasicMaterial({ map: poolMap });
    const plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.006;

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
    const shadowGeometry = new PlaneGeometry(FRAME.width * ground.shadowWidth, FRAME.footDepth * ground.shadowDepth);
    const shadowMaterial = new MeshBasicMaterial({
      map: blotMap,
      color: ground.shadowColor,
      transparent: true,
      opacity: ground.shadowOpacity,
      depthWrite: false,
    });
    const shadow = new Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.002, -FRAME.footDepth * ground.shadowOffset);

    this.scene.add(plane, shadow);
    this.groundShadow = shadow;
    this.owned.push(poolMap, planeGeometry, planeMaterial, blotMap, shadowGeometry, shadowMaterial);
    this.frameDraws += 2;
  }

  /**
   * The frame: walnut rails, darker posts and darker sledges, with the gilt
   * fittings and the gilt line on each rail.
   *
   * Every part of one colour and ramp is welded into one geometry, so the frame
   * is five draws and its outline is one silhouette per colour rather than a
   * seam at every joint. The gilt line has no outline: it is let into the rail,
   * not stood on it.
   */
  private buildFrame(): void {
    const metrics = frameMetrics();
    const fit = ABACUS.fittings;
    const inlay = ABACUS.inlay;
    const half = FRAME.width / 2;
    const railY = [metrics.footTop + FRAME.railHeight / 2, metrics.innerTop + FRAME.railHeight / 2];

    const rails: BufferGeometry[] = [];
    const posts: BufferGeometry[] = [];
    const sledges: BufferGeometry[] = [];
    const gilt: BufferGeometry[] = [];
    const lines: BufferGeometry[] = [];

    for (const y of railY) {
      const rail = chamferedBar(FRAME.width, FRAME.railHeight, FRAME.railDepth, FRAME.chamfer);
      rail.translate(0, y, 0);
      rails.push(rail);
      // A shoe on each end: one closed bar a little larger than the rail.
      for (const side of [-1, 1]) {
        const shoe = chamferedBar(
          fit.shoeWidth,
          FRAME.railHeight + fit.shoeSwell,
          FRAME.railDepth + fit.shoeSwell,
          FRAME.chamfer * fit.shoeChamfer,
        );
        shoe.translate(side * (half - fit.shoeInset), y, 0);
        gilt.push(shoe);
      }
      const line = flatBox(FRAME.width - inlay.endGap * 2, inlay.height, inlay.depth);
      line.translate(0, y, FRAME.railDepth / 2 + inlay.proud);
      lines.push(line);
    }

    for (const side of [-1, 1]) {
      const x = side * (half - FRAME.stileWidth / 2);
      // Half a rail into each rail: a mortice, so the post reads as seated in
      // the frame rather than balanced on it, and no joint can show daylight.
      const post = uprightBar(FRAME.innerHeight + FRAME.railHeight, FRAME.stileWidth, FRAME.stileDepth, FRAME.chamfer);
      post.translate(x, metrics.innerBottom + FRAME.innerHeight / 2, 0);
      posts.push(post);
      const knob = turnedKnob(fit.knobSize, fit.segments);
      knob.translate(x, metrics.totalHeight, 0);
      gilt.push(knob);

      // The sledge stands on two turned feet, so the frame clears the ground.
      const lift = FRAME.footHeight * fit.sledgeLift;
      const sledgeX = side * (half - FRAME.footWidth / 2);
      const sledge = chamferedBar(FRAME.footWidth, FRAME.footHeight - lift, FRAME.footDepth, FRAME.chamfer * fit.sledgeChamfer);
      sledge.translate(sledgeX, lift + (FRAME.footHeight - lift) / 2, 0);
      sledges.push(sledge);
      for (const end of [-1, 1]) {
        const foot = bunFoot(fit.footRadius, lift + fit.footSink, fit.segments);
        foot.translate(sledgeX, 0, end * (FRAME.footDepth / 2 - fit.footInset));
        gilt.push(foot);
      }
    }

    this.addSolid(weld(rails), FRAME.railColor, FRAME.ramp, false);
    this.addSolid(weld(posts), FRAME.stileColor, FRAME.ramp, false);
    this.addSolid(weld(sledges), FRAME.footColor, FRAME.ramp, false);
    this.addSolid(weld(gilt), fit.color, fit.ramp, false);
    this.addSolid(weld(lines), inlay.color, inlay.ramp, false, false);
    this.buildPlaque();
  }

  /**
   * The plaque on the top rail: a brass plate with the age cut into it. The
   * picture is drawn on a small canvas (`paintPlaque`), so a new age is a
   * repaint and not a rebuild.
   */
  private buildPlaque(): void {
    const spec = ABACUS.plaque;
    const metrics = frameMetrics();
    const canvas = document.createElement('canvas');
    canvas.width = PLAQUE_PIXELS.width;
    canvas.height = PLAQUE_PIXELS.height;
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    const height = FRAME.railHeight * spec.height;
    const geometry = new PlaneGeometry(height * spec.aspect, height);
    const material = new MeshBasicMaterial({ map });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(0, metrics.innerTop + FRAME.railHeight / 2, FRAME.railDepth / 2 + spec.proud);
    this.object.add(mesh);
    this.owned.push(map, geometry, material);
    this.frameDraws += 1;
    this.plaque = mesh;
    this.plaqueCanvas = canvas;
    this.plaqueMap = map;
    this.paintPlaque();
    // The numeral is set in the interface's display face. A face that has not
    // loaded yet would draw in the fallback, so the plate is drawn again once
    // it has.
    void document.fonts?.load(this.plaqueFont()).then(() => {
      if (!this.disposed) this.paintPlaque();
    }, () => undefined);
  }

  /** The numeral's font: the display face, at the plate's share. */
  private plaqueFont(): string {
    const face =
      getComputedStyle(document.documentElement).getPropertyValue('--face-display').trim() || 'Georgia, serif';
    return `600 ${Math.round(PLAQUE_PIXELS.height * ABACUS.plaque.numeralShare)}px ${face}`;
  }

  /** Draws the plate, and the numeral when there is an age and it can be read. */
  private paintPlaque(): void {
    const canvas = this.plaqueCanvas;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !this.plaqueMap) return;
    const spec = ABACUS.plaque;
    const w = canvas.width;
    const h = canvas.height;
    context.clearRect(0, 0, w, h);
    // A dark edge, the plate inside it shading down a little, a cut line inside
    // that, and a pin at each end.
    const gradient = context.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, rgba(spec.plateColor));
    gradient.addColorStop(1, rgba(spec.plateColor, 0.82));
    context.fillStyle = rgba(spec.cutColor);
    context.fillRect(0, 0, w, h);
    context.fillStyle = gradient;
    context.fillRect(3, 3, w - 6, h - 6);
    context.strokeStyle = rgba(spec.cutColor, 0.85);
    context.lineWidth = 2;
    context.strokeRect(9, 9, w - 18, h - 18);
    context.fillStyle = rgba(spec.cutColor);
    for (const x of [26, w - 26]) {
      context.beginPath();
      context.arc(x, h / 2, 4, 0, Math.PI * 2);
      context.fill();
    }
    if (this.age !== null && this.plaqueNumeral) {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = this.plaqueFont();
      context.fillText(plaqueWords(this.age), w / 2, h / 2 + 3);
    }
    this.plaqueMap.needsUpdate = true;
  }

  /**
   * Sizes the plaque for how large the frame is drawn now (`plaqueFit`), and
   * repaints it if the numeral appears or goes.
   */
  private fitPlaque(): void {
    const plaque = this.plaque;
    if (!plaque) return;
    const metrics = frameMetrics();
    const base = FRAME.railHeight * ABACUS.plaque.height;
    const y = metrics.innerTop + FRAME.railHeight / 2;
    const z = plaque.position.z;
    const bottom = this.project(0, y - base / 2, z);
    const top = this.project(0, y + base / 2, z);
    const fitted = plaqueFit(Math.abs(bottom.y - top.y));
    plaque.scale.set(fitted.scale, fitted.scale, 1);
    if (fitted.numeral !== this.plaqueNumeral) {
      this.plaqueNumeral = fitted.numeral;
      this.paintPlaque();
    }
  }

  /** The rods and the beads on them, all of it under `rodGroup`. */
  private buildRods(): void {
    const rod = ABACUS.rod;
    const bead = ABACUS.bead;
    const stud = ABACUS.stud;
    const metrics = frameMetrics();

    const beadGeometry = beadShape({
      radius: this.layout.beadRadius,
      halfThickness: this.layout.halfThickness,
      bore: rod.radius + bead.boreClearance,
      segments: bead.segments,
    });
    computeHullNormals(beadGeometry);
    this.rodGeometries.push(beadGeometry);
    const beadTriangles = beadGeometry.getAttribute('position').count / 3;
    const stoneGeometry = studStone(stud.radius, stud.segments);
    this.rodGeometries.push(stoneGeometry);

    // The seat's colour on the frame: a stud on the front of the left post at
    // each rod, in a gilt rim, set a little into the post.
    const studX = -(FRAME.width / 2 - FRAME.stileWidth / 2);
    const studZ = FRAME.stileDepth / 2 - stud.sink;

    const brass: BufferGeometry[] = [];
    const rims: BufferGeometry[] = [];
    this.layout.rodY.forEach((y, index) => {
      const bar = rodBar(rod.radius, metrics.innerHalfSpan * 2 + rod.tenon * 2);
      bar.translate(0, y, 0);
      brass.push(bar);

      for (const side of [-1, 1]) {
        const knob = rodFinial(rod.finialSize, rod.finialSegments);
        // Turned to face inward rather than mirrored: a negative scale would
        // flip every triangle's winding and the knob would render inside out.
        if (side > 0) knob.rotateY(Math.PI);
        knob.translate(side * metrics.innerHalfSpan, y, 0);
        brass.push(knob);
      }

      const rim = studRim(stud.radius, stud.segments);
      rim.translate(studX, y, studZ);
      rims.push(rim);
      const stone = new Mesh(stoneGeometry, this.ramps.get(this.players[index]?.color ?? ABACUS.bead.waitingColor, stud.stoneRamp));
      stone.position.set(studX, y, studZ);
      this.rodGroup.add(stone);
      this.rodDraws += 1;

      const rodView: RodView = { y, beads: [], earned: [], knock: null };
      for (let b = 0; b < this.places; b++) {
        const mesh = new Mesh(beadGeometry, this.ramps.get(bead.waitingColor, bead.waitingRamp));
        mesh.castShadow = LOOK.shadows;
        mesh.receiveShadow = LOOK.shadows;
        const shell = new Mesh(beadGeometry, this.materials.outline);
        shell.castShadow = false;
        shell.receiveShadow = false;
        mesh.add(shell);
        mesh.position.set(0, y, 0);
        this.rodGroup.add(mesh);
        rodView.beads.push({ mesh, x: 0, from: 0, to: 0, elapsed: null, struck: true, rest: 1 });
        this.rodDraws += 2;
        this.rodTriangles += beadTriangles;
      }
      this.rods.push(rodView);
      this.seed(index, []);
    });

    // A brass rod pushed through a hole never wants an ink outline running down
    // it — it is a highlight, not a silhouette — but it gets one anyway, because
    // dropping the shell on one part of a toon object is exactly how a look
    // starts to come apart. The finials need it more than the rods do.
    if (brass.length > 0) this.addSolid(weld(brass), rod.color, rod.ramp, true);
    if (rims.length > 0) this.addSolid(weld(rims), ABACUS.fittings.color, ABACUS.fittings.ramp, true, false);
  }

  /** Takes the rods off the frame and gives their geometry back. */
  private clearRods(): void {
    this.clearGolden();
    for (const child of [...this.rodGroup.children]) this.rodGroup.remove(child);
    for (const geometry of this.rodGeometries) geometry.dispose();
    this.rodGeometries = [];
    this.rods.length = 0;
    this.rodDraws = 0;
    this.rodTriangles = 0;
  }

  /** A lit mesh with its inverted-hull shell — the two-mesh sandwich, verbatim. */
  private addSolid(
    geometry: BufferGeometry,
    color: number,
    ramp: AbacusRamp,
    perRoster: boolean,
    /** Whether the part has an ink outline. A line let into a face does not. */
    outlined = true,
  ): void {
    computeHullNormals(geometry);
    const mesh = new Mesh(geometry, this.ramps.get(color, ramp));
    mesh.castShadow = LOOK.shadows;
    mesh.receiveShadow = LOOK.shadows;
    if (outlined) {
      const shell = new Mesh(geometry, this.materials.outline);
      shell.castShadow = false;
      shell.receiveShadow = false;
      mesh.add(shell);
    }
    const draws = outlined ? 2 : 1;
    const triangles = geometry.getAttribute('position').count / 3;
    if (perRoster) {
      this.rodGeometries.push(geometry);
      this.rodGroup.add(mesh);
      this.rodDraws += draws;
      this.rodTriangles += triangles;
      return;
    }
    this.frameGeometries.push(geometry);
    this.object.add(mesh);
    this.frameDraws += draws;
    this.frameTriangles += triangles;
  }

  // --- camera and light ----------------------------------------------------

  resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.aspect = width / Math.max(1, height);
    this.fit();
  }

  /**
   * **Bands of the canvas the frame must stay out of**, as shares of its
   * height, top and bottom (2026-11-18). The bead page lays its name, its line
   * and Proceed over a canvas that fills the window, and the frame is fitted
   * into the band between them. Both nought, the default, is the fit every
   * other page has always had.
   */
  setClearBands(top: number, bottom: number): void {
    const clamp = (share: number): number => Math.max(0, Math.min(0.4, Number.isFinite(share) ? share : 0));
    this.clearTop = clamp(top);
    this.clearBottom = clamp(bottom);
    this.fit();
  }

  /**
   * Frames the object, with the gutters the labels live in counted as part of it.
   *
   * The camera is orthographic and fixed, like the board's, but much lower — 20°
   * rather than 57°. The board is a map and wants to be looked *into*; this is an
   * object standing on a table and wants to be looked *at*, and a scoreboard seen
   * from above is a diagram of a scoreboard. The azimuth is swung off square so
   * the rails show their depth and the beads are visibly threaded rather than
   * stamped on.
   *
   * The fit itself is the Armory's: project the bounding box's eight corners into
   * camera space and cover the rectangle they make. Tilted camera plus a tall
   * object is not arithmetic anybody should keep true by hand.
   */
  private fit(): void {
    const view = ABACUS.camera;
    const metrics = frameMetrics();
    const halfX = FRAME.width / 2 + view.labelGutter;
    const halfZ = FRAME.footDepth / 2;
    const bounds = new Box3(new Vector3(-halfX, 0, -halfZ), new Vector3(halfX, metrics.totalHeight, halfZ));

    const el = view.elevation * DEG;
    const az = view.azimuth * DEG;
    const eye = new Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    ).normalize();

    const center = bounds.getCenter(new Vector3());
    this.camera.position.copy(center).addScaledVector(eye, view.eyeDistance);
    this.camera.lookAt(center);
    this.camera.updateMatrixWorld();

    const inv = this.camera.matrixWorldInverse;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    // The frame's own sides, without the gutters, for `closeZoom`.
    let frameMinX = Infinity;
    let frameMaxX = -Infinity;
    const corner = new Vector3();
    for (const cx of [bounds.min.x, bounds.max.x]) {
      for (const cy of [bounds.min.y, bounds.max.y]) {
        for (const cz of [bounds.min.z, bounds.max.z]) {
          corner.set(cx, cy, cz).applyMatrix4(inv);
          minX = Math.min(minX, corner.x);
          maxX = Math.max(maxX, corner.x);
          minY = Math.min(minY, corner.y);
          maxY = Math.max(maxY, corner.y);
          corner.set(Math.sign(cx) * (FRAME.width / 2), cy, cz).applyMatrix4(inv);
          frameMinX = Math.min(frameMinX, corner.x);
          frameMaxX = Math.max(frameMaxX, corner.x);
        }
      }
    }

    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const shiftX = (minX + maxX) / 2;
    this.camera.position.addScaledVector(right, shiftX).addScaledVector(up, (minY + maxY) / 2);
    this.camera.updateMatrixWorld();

    const pad = view.padding;
    // The clear bands (`setClearBands`): the frame is fitted into the height
    // left between them, and the camera is moved so the frame's middle sits in
    // the middle of that band. With no bands this is the plain fit.
    const usable = 1 - this.clearTop - this.clearBottom;
    this.frustum = Math.max(((maxY - minY) / 2) * pad / usable, (((maxX - minX) / 2) * pad) / this.aspect);
    this.camera.position.addScaledVector(up, (this.clearTop - this.clearBottom) * this.frustum);
    this.camera.updateMatrixWorld();
    this.camera.left = -this.frustum * this.aspect;
    this.camera.right = this.frustum * this.aspect;
    this.camera.top = this.frustum;
    this.camera.bottom = -this.frustum;
    this.camera.near = 1;
    this.camera.far = 600;
    this.camera.updateProjectionMatrix();
    this.applyLight(center);

    // The view the Opus close's camera move starts from, kept for every resize.
    this.baseFrustum = this.frustum;
    this.basePosition.copy(this.camera.position);
    this.baseRight.copy(right);
    this.baseUp.copy(up);
    this.baseView.copy(this.camera.matrixWorldInverse);
    this.frameLeft = frameMinX - shiftX;
    this.frameRight = frameMaxX - shiftX;
    this.fitPlaque();
    if (this.focus.amount !== 0) this.applyFocus();
  }

  private applyLight(center: Vector3): void {
    const el = ABACUS.light.elevation * DEG;
    const az = ABACUS.light.azimuth * DEG;
    this.key.position
      .copy(center)
      .addScaledVector(
        new Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)),
        LOOK.lightDistance,
      );
    this.key.target.position.copy(center);
    this.key.target.updateMatrixWorld();

    // The object is six units wide against a frustum of about four, so the board's
    // `shadowExtent` multiple alone would clip the shadow off at the ends.
    const extent = Math.max(this.frustum * LOOK.shadowExtent, FRAME.width);
    const shadow = this.key.shadow.camera;
    shadow.left = -extent;
    shadow.right = extent;
    shadow.top = extent;
    shadow.bottom = -extent;
    shadow.near = 1;
    shadow.far = LOOK.lightDistance * 2.5;
    shadow.updateProjectionMatrix();
  }

  // --- frame ---------------------------------------------------------------

  private loop(now: number): void {
    if (!this.running || this.disposed) return;
    const motion = ABACUS.motion;
    const dt = this.lastFrame === 0 ? 0 : Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.clock += dt;

    if (this.spin) {
      this.yaw += dt * motion.spinRate;
      this.object.rotation.set(0, this.yaw, 0);
    } else if (this.sway) {
      // The idle sway is a *breath*, not a rotation: it never leaves the angle
      // the object was framed at, so nothing it does can push a label off the
      // canvas or a rail out of the fitted box.
      this.object.rotation.y =
        Math.sin((this.clock / motion.swaySeconds) * Math.PI * 2) * motion.swayRadians;
      this.object.rotation.x =
        Math.sin((this.clock / (motion.swaySeconds * motion.tiltPeriod)) * Math.PI * 2) *
        motion.swayRadians *
        motion.tiltShare;
    } else {
      this.object.rotation.set(0, this.yaw, 0);
    }
    this.turnAngle = 0;
    if (this.turning) {
      // The Opus close's turn, laid over the sway rather than in place of it,
      // so the frame leaves its breath and comes back to it without a jump.
      this.turning.elapsed += dt;
      const t = this.turning.elapsed / this.turning.seconds;
      this.turnAngle = turnYaw(t, CLOSE.turnDegrees);
      this.object.rotation.y += this.turnAngle;
      if (t >= 1) this.turning = null;
    }

    const focus = this.focus;
    if (focus.amount !== focus.to) {
      focus.elapsed += dt;
      const t = focus.seconds === 0 ? 1 : focus.elapsed / focus.seconds;
      focus.amount = t >= 1 ? focus.to : focus.from + (focus.to - focus.from) * easeInOut(t);
      this.applyFocus();
    }

    const golden = this.golden;
    if (golden && golden.elapsed < golden.seconds) {
      golden.elapsed = Math.min(golden.seconds, golden.elapsed + dt);
      this.applyGolden();
    }

    const slide = ABACUS.slide;
    for (const rod of this.rods) {
      for (const bead of rod.beads) {
        if (bead.elapsed === null) continue;
        bead.elapsed += dt;
        // The look-dev switch `?abacusFreeze=` holds the slide for a still picture.
        if (this.freezeAt !== null) bead.elapsed = Math.min(bead.elapsed, this.freezeAt * slide.seconds);
        const t = Math.min(1, bead.elapsed / slide.seconds);
        bead.x = slidePosition(bead.from, bead.to, t, slide);
        bead.mesh.position.x = bead.x;
        // The bead that leaves a waiting place grows to full size on the way.
        // The golden bead has its own size.
        if (this.golden?.glow.parent !== bead.mesh) bead.mesh.scale.setScalar(growScale(t) * bead.rest);
        if (!bead.struck && t >= slide.travel) {
          bead.struck = true;
          rod.knock = 0;
          this.onStrike?.();
        }
        if (t >= 1) bead.elapsed = null;
      }
      if (rod.knock !== null) this.applyKnock(rod, dt);
    }
    if (this.groundShadow) this.groundShadow.rotation.z = this.object.rotation.y;

    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
    requestAnimationFrame(this.loop);
  }

  /**
   * The knock (`knockOffset`): the beads already on the earned side move a
   * little away from the bead that hit them and come back, less the farther
   * they are from it.
   */
  private applyKnock(rod: RodView, dt: number): void {
    rod.knock = (rod.knock ?? 0) + dt;
    const seconds = ABACUS.knock.seconds;
    const t = seconds <= 0 ? 1 : Math.min(1, rod.knock / seconds);
    for (let index = 0; index < rod.earned.length; index++) {
      const bead = rod.beads[index]!;
      if (bead.elapsed !== null) continue;
      bead.mesh.position.x = bead.x - knockOffset(rod.earned.length - 1 - index, t);
    }
    if (t >= 1) rod.knock = null;
  }

  dispose(): void {
    this.running = false;
    this.disposed = true;
    this.clearRods();
    this.glowMap?.dispose();
    this.glowMap = null;
    for (const geometry of this.frameGeometries) geometry.dispose();
    this.frameGeometries.length = 0;
    for (const item of this.owned) item.dispose();
    this.owned.length = 0;
    this.ramps.dispose();
    this.materials.dispose();
    this.renderer.dispose();
    // `dispose` frees three's own resources but leaves the WebGL context alive
    // until the canvas is collected, and a browser hands out only a dozen or so
    // before it starts killing the oldest. This stage is only ever disposed
    // along with its canvas (the screen throws the element away), so there is
    // nothing left to draw with and no reason to wait for the collector.
    this.renderer.forceContextLoss();
  }
}

// --- the sound --------------------------------------------------------------

/**
 * The sound a bead makes when it lands: synthesised, never sampled.
 *
 * It ships with the stage rather than with either page because it is the
 * object's own voice — `onStrike` fires it, and a knock that lived in one
 * consumer would be a knock the other one silently lacked.
 *
 * No audio file ships with this. A wooden knock is two decaying tones and a
 * bandpass — a low body around 300 Hz that falls as it dies (wood loses its
 * pitch as the energy goes) and a bright tick an octave and a half up that is
 * gone in thirty milliseconds. The filter is what stops it reading as a beep:
 * an unfiltered oscillator burst is a game-show buzzer, and rolling off both
 * ends leaves only the part of the spectrum a knock actually lives in.
 *
 * The `AudioContext` is built lazily on the first click, because every browser
 * refuses to start one outside a user gesture and a context created at page load
 * is a context permanently stuck in `suspended`. Each strike is a fresh little
 * graph; the nodes fall out of the graph when the oscillators stop and are
 * collected with them.
 */

/** The two voices of one knock: wave, start and end pitch, and how loud. */
const VOICES: readonly {
  type: OscillatorType;
  from: number;
  to: number;
  gain: number;
  seconds: number;
}[] = [
  { type: 'triangle', from: 420, to: 190, gain: 0.5, seconds: 0.1 },
  { type: 'square', from: 1650, to: 940, gain: 0.16, seconds: 0.035 },
];

export class Clack {
  private context: AudioContext | null = null;
  private enabled = true;

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  get on(): boolean {
    return this.enabled;
  }

  /**
   * Opens the audio device. Must be called from inside a click handler; calling
   * it again later is free, so the buttons simply call it every time.
   */
  arm(): void {
    if (!this.enabled) return;
    if (!this.context) {
      try {
        this.context = new AudioContext();
      } catch {
        // No audio device, or a browser that refuses one. Nothing here is about
        // sound; it just goes quiet.
        this.enabled = false;
        return;
      }
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  play(): void {
    const context = this.context;
    if (!this.enabled || !context || context.state !== 'running') return;

    const now = context.currentTime;
    const body = context.createBiquadFilter();
    body.type = 'bandpass';
    body.frequency.value = 760;
    body.Q.value = 0.9;

    const master = context.createGain();
    // Ramped rather than set: an instantaneous gain step is a click of its own,
    // on top of the click we meant.
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.34, now + 0.004);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    body.connect(master);
    master.connect(context.destination);

    for (const voice of VOICES) {
      const osc = context.createOscillator();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(voice.from, now);
      osc.frequency.exponentialRampToValueAtTime(voice.to, now + voice.seconds);
      const gain = context.createGain();
      gain.gain.setValueAtTime(voice.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.seconds);
      osc.connect(gain);
      gain.connect(body);
      osc.start(now);
      osc.stop(now + voice.seconds + 0.02);
      osc.onended = (): void => {
        gain.disconnect();
      };
    }

    window.setTimeout(() => {
      master.disconnect();
      body.disconnect();
    }, 300);
  }
}
