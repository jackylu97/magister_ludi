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
 * It is built out of the shipping look and nothing else: `MaterialLibrary` with
 * `view3d.json`'s three-band ramp and its outline width, the game's own key +
 * hemisphere + ambient rig, an orthographic camera. Every proportion it is cut
 * from is `VIEW3D.abacus` — this file holds no tuned constant of its own, which
 * is the same bargain the board keeps.
 *
 * Two consumers
 * -------------
 * `src/ui/abacusScreen.ts` is the in-game screen: one rod per seat at the
 * current table, opened from the bar or `A`. `src/abacusSpike/main.ts` is the
 * look-dev page, which keeps the demo buttons — earning a bead is a thing the
 * *game* will do at M11, and a button that fakes it has no business in the game.
 * Both drive exactly the API below, so the page cannot drift from the screen.
 *
 * Geometry
 * --------
 * Every part is a primitive or an extrusion of one, and all of it lives in
 * `geometry.ts` beside the board's own kit (see its "the Abacus" section). The
 * frame is chamfered timber bars — one closed convex shell each, so the
 * inverted-hull outline stays a silhouette instead of laying stripes down the
 * rails. The rods are cylinders with turned finials. The beads are lathed
 * bicones whose profile simply never closes at the bore, so the hole is real
 * without any CSG.
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
 * The whole object is around fifty draws at two seats and stays under a hundred
 * at six — and it is a modal screen, so the board is not drawing while it is up.
 * The saving is real only in the world where the Abacus becomes a corner widget
 * on top of a live board, and that is the day to spend it.
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
  DirectionalLight,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  OrthographicCamera,
  PCFShadowMap,
  PlaneGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';

import {
  beadShape,
  chamferedBar,
  rodBar,
  rodFinial,
  uprightBar,
  weld,
} from './geometry';
import {
  type AbacusFamily,
  type FamilyId,
  VIEW3D,
  mixColor,
  shade,
} from './lookData';
import { MaterialLibrary, computeHullNormals } from './toon';
// The style options of 2026-11-18. `today` is the default and changes nothing.
import {
  type LookRamp,
  LookKit,
  activeAbacusLook,
  lookBand,
  lookBead,
  lookFinial,
  lookFrameParts,
  placesOverride,
  seatStudRim,
  seatStudStone,
  slideFreeze,
} from './abacusLooks';

export type { AbacusFamily, FamilyId } from './lookData';
export { FAMILY_IDS } from './lookData';

const LOOK = VIEW3D.look;
const LIGHTS = VIEW3D.lights;
const ABACUS = VIEW3D.abacus;
const FRAME = ABACUS.frame;
const CLOSE = ABACUS.close;
const DEG = Math.PI / 180;

/**
 * The places on a rod. `bead.perRod`, unless the look-dev switch
 * `?abacusPlaces=` asks for another number (`abacusLooks.ts`).
 */
const PLACES = placesOverride() ?? ABACUS.bead.perRod;

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
}

export function rodLayout(playerCount: number): RodLayout {
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
  const fromRight = PLACES - 1 - index;
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

// --- state ------------------------------------------------------------------

export interface AbacusPlayer {
  name: string;
  /** The player's diorama ink, for the label swatch. Not painted on the beads. */
  color: number;
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
  /** A style option's metal band, shown on an earned bead. */
  band: Mesh | null;
  /** A style option's size for this bead at rest: smaller while it waits. */
  rest: number;
}

interface RodView {
  y: number;
  beads: BeadView[];
  earned: FamilyId[];
  /** A style option's knock: seconds since a bead landed on this rod, or null. */
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
  private readonly materials: MaterialLibrary;
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

  private layout: RodLayout;
  private readonly waitingColor: number;
  /** The style option in use (`abacusLooks.ts`), and its materials. A null kit is today's look. */
  private readonly look = activeAbacusLook();
  private readonly kit: LookKit | null = this.look.id === 'today' ? null : new LookKit(this.look);
  private readonly freezeAt = slideFreeze();
  private lookShadow: Mesh | null = null;

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

  constructor(canvas: HTMLCanvasElement, players: readonly AbacusPlayer[]) {
    this.players = players;
    this.layout = rodLayout(players.length);

    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = LOOK.shadows;
    // `PCFSoftShadowMap` is deprecated in three r185, which warns and uses this.
    this.renderer.shadowMap.type = PCFShadowMap;
    this.scene.background = new Color(this.look.ground?.edge ?? VIEW3D.table.color);

    this.materials = new MaterialLibrary(LOOK.rampSteps, this.look.outlineColor ?? VIEW3D.palette.ink!);
    this.materials.outlineWidth.value = LOOK.outline * this.look.outline;

    // Unearned beads are bone warmed toward the frame's timber: a waiting bead
    // is not *painted*, it is bare turned wood, and pure bone read as ivory
    // against the rails.
    this.waitingColor = mixColor(
      ABACUS.bead.waitingColor,
      ABACUS.bead.waitingWarmth,
      ABACUS.bead.waitingWarmthMix,
    );

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 1, 600);

    const lit = this.look.light;
    this.key = new DirectionalLight(LIGHTS.keyColor, lit?.key ?? LIGHTS.keyIntensity);
    this.key.castShadow = LOOK.shadows;
    this.key.shadow.mapSize.set(LOOK.shadowMapSize, LOOK.shadowMapSize);
    this.key.shadow.bias = LOOK.shadowBias;
    this.key.shadow.normalBias = LOOK.shadowNormalBias;
    this.scene.add(this.key, this.key.target);
    this.scene.add(new HemisphereLight(LIGHTS.skyColor, LIGHTS.groundColor, lit?.hemi ?? LIGHTS.hemiIntensity));
    this.scene.add(new AmbientLight(LIGHTS.ambientColor, lit?.ambient ?? LIGHTS.ambientIntensity));

    this.scene.add(this.object);
    this.object.add(this.rodGroup);
    this.buildTable();
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
    return PLACES;
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
    this.layout = rodLayout(players.length);
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
   * gold, grows to `close.goldenScale` and takes its halo, over `seconds` (0 for
   * at once). It moves left by the width it gains, so it never presses into the
   * waiting bead beside it.
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
    bead.mesh.material = this.kit
      ? this.kit.toon(this.look.bead?.golden ?? CLOSE.goldenColor, 'metal')
      : this.materials.get(CLOSE.goldenColor);
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
   * `close.zoom` times closer), over `seconds`. The DOM labels are projected
   * through the live camera, so they follow without being told.
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
    // A style option draws a waiting place smaller, so the bead grows from that size.
    const start = this.kit ? (this.look.bead?.waitingScale ?? 1) : 1;
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
   * The camera for the move's present amount: closer by up to `close.zoom`, and
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
    const frustum = this.baseFrustum / (1 + (CLOSE.zoom - 1) * amount);
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
   * Gives a bead the material of its family, or of a place not earned yet.
   * A style option may also show a metal band on an earned bead and draw a
   * waiting place smaller (`bead.rest`).
   */
  private paintBead(bead: BeadView, family: FamilyId | null): void {
    const style = this.look.bead;
    if (!this.kit || !style) {
      bead.mesh.material = this.materials.get(family ? familyOf(family).color : this.waitingColor);
      return;
    }
    if (family === null) {
      bead.mesh.material = this.kit.toon(style.waiting, style.waitingRamp);
      bead.rest = style.waitingScale;
    } else {
      bead.mesh.material = this.kit.toon(style.families?.[family] ?? familyOf(family).color, style.ramp);
      bead.rest = 1;
    }
    if (bead.band) bead.band.visible = family !== null;
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
   * The table the abacus stands on: one lit plane in the board's own vellum.
   *
   * Lit rather than unlit, unlike the Armory's, because this object is judged on
   * whether it *sits* anywhere — and a cast shadow needs a surface that receives
   * one, which `MeshBasicMaterial` cannot. It is a single flat plane, so the toon
   * ramp resolves it to one uniform band and it reads as the flat vellum tone the
   * screen's chrome is drawn on.
   */
  private buildTable(): void {
    if (this.kit && this.look.ground) {
      // A style option's ground: an unlit plane with a pool of light, and a
      // soft shadow under the frame in place of the cast one.
      const { ground, shadow } = this.kit.ground(FRAME.width, FRAME.footDepth);
      this.scene.add(ground, shadow);
      this.lookShadow = shadow;
      this.frameDraws += 2;
      return;
    }
    const plane = new PlaneGeometry(400, 400);
    this.frameGeometries.push(plane);
    const table = new Mesh(plane, this.materials.get(VIEW3D.table.color));
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.004;
    table.receiveShadow = LOOK.shadows;
    this.scene.add(table);
    this.frameDraws += 1;
  }

  /**
   * The timber: rails in the warm ink, stiles and feet in progressively darker
   * ones.
   *
   * Two welded geometries, not eight meshes. Every part in one ink is merged
   * into a single shell, which is what keeps a nine-piece frame down to four
   * draws — and, more usefully, keeps the outline one continuous silhouette
   * around the whole light-timber assembly rather than a seam at every joint.
   *
   * The darkening is the "end cap" rule board pieces already follow
   * (`sideDarken`): a face that turns away from the light is painted darker
   * rather than lit darker, because a three-band ramp cannot be trusted to make
   * that distinction on its own at a shallow camera angle.
   */
  private buildFrame(): void {
    const metrics = frameMetrics();
    const half = FRAME.width / 2;
    const styled = this.kit ? lookFrameParts(this.look, { ...FRAME, ...metrics }) : null;
    if (styled) {
      for (const part of styled) this.addSolid(part.geometry, part.color, false, part.ramp, part.outline);
      const plaque = this.kit?.plaque({ ...FRAME, ...metrics });
      if (plaque) {
        this.object.add(plaque);
        this.frameDraws += 1;
      }
      return;
    }
    const railY = [
      metrics.footTop + FRAME.railHeight / 2,
      metrics.innerTop + FRAME.railHeight / 2,
    ];

    const light: BufferGeometry[] = [];
    for (const y of railY) {
      const rail = chamferedBar(FRAME.width, FRAME.railHeight, FRAME.railDepth, FRAME.chamfer);
      rail.translate(0, y, 0);
      light.push(rail);
    }

    const dark: BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const stile = uprightBar(
        FRAME.innerHeight + FRAME.railHeight,
        FRAME.stileWidth,
        FRAME.stileDepth,
        FRAME.chamfer,
      );
      // Run half a rail into each rail — a mortice, so the post reads as seated
      // in the frame rather than balanced on it, and no joint can show daylight.
      stile.translate(
        side * (half - FRAME.stileWidth / 2),
        metrics.innerBottom + FRAME.innerHeight / 2,
        0,
      );
      dark.push(stile);

      const foot = chamferedBar(
        FRAME.footWidth,
        FRAME.footHeight,
        FRAME.footDepth,
        FRAME.chamfer * 0.8,
      );
      foot.translate(side * (half - FRAME.footWidth / 2), FRAME.footHeight / 2, 0);
      dark.push(foot);
    }

    const timber = FRAME.timberColor;
    const own = this.look.frame;
    if (own) {
      // Style option A: the same timber frame in its own colours.
      this.addSolid(weld(light), own.rail, false, own.ramp);
      this.addSolid(weld(dark), own.stile, false, own.ramp);
      return;
    }
    this.addSolid(weld(light), timber, false);
    this.addSolid(weld(dark), shade(timber, VIEW3D.sideDarken * FRAME.postShade), false);
  }

  /** The rods and the beads on them, all of it under `rodGroup`. */
  private buildRods(): void {
    const rod = ABACUS.rod;
    const bead = ABACUS.bead;
    const metrics = frameMetrics();

    const style = this.look.bead;
    const rodStyle = this.look.rod;
    const rodRadius = rod.radius * (rodStyle?.radius ?? 1);
    const beadGeometry =
      style && style.shape !== 'bicone'
        ? lookBead(
            style.shape,
            this.layout.beadRadius,
            this.layout.halfThickness,
            rodRadius + bead.boreClearance,
            style.segments,
          )
        : beadShape({
            radius: this.layout.beadRadius,
            halfThickness: this.layout.halfThickness,
            bore: rodRadius + bead.boreClearance,
            segments: style?.segments ?? bead.segments,
          });
    let bandGeometry: BufferGeometry | null = null;
    if (this.kit && style && style.band !== null) {
      bandGeometry = lookBand(this.layout.beadRadius, this.layout.halfThickness, style.segments);
      this.rodGeometries.push(bandGeometry);
    }
    const studs: BufferGeometry[] = [];
    computeHullNormals(beadGeometry);
    this.rodGeometries.push(beadGeometry);
    const beadTriangles = beadGeometry.getAttribute('position').count / 3;

    const brass: BufferGeometry[] = [];
    this.layout.rodY.forEach((y, index) => {
      const bar = rodBar(rodRadius, metrics.innerHalfSpan * 2 + rod.tenon * 2);
      bar.translate(0, y, 0);
      brass.push(bar);

      for (const side of [-1, 1]) {
        const knob = rodStyle
          ? lookFinial(rod.finialSize, rod.finialSegments)
          : rodFinial(rod.finialSize, rod.finialSegments);
        // Turned to face inward rather than mirrored: a negative scale would
        // flip every triangle's winding and the knob would render inside out.
        if (side > 0) knob.rotateY(Math.PI);
        knob.translate(side * metrics.innerHalfSpan, y, 0);
        brass.push(knob);
      }

      if (this.kit && rodStyle?.seatStud) {
        // The seat's colour on the frame: a stud on the front of the left
        // stile at this rod, in a metal rim.
        const studX = -(FRAME.width / 2 - FRAME.stileWidth / 2);
        const studZ =
          (this.look.frame?.kind === 'reliquary' ? FRAME.stileWidth * 0.33 : FRAME.stileDepth / 2) - 0.004;
        const rim = seatStudRim();
        rim.translate(studX, y, studZ);
        studs.push(rim);
        const stoneGeometry = seatStudStone();
        this.rodGeometries.push(stoneGeometry);
        const stone = new Mesh(stoneGeometry, this.kit.toon(this.players[index]?.color ?? 0xffffff, 'gloss'));
        stone.position.set(studX, y, studZ);
        this.rodGroup.add(stone);
        this.rodDraws += 1;
      }

      const rodView: RodView = { y, beads: [], earned: [], knock: null };
      for (let b = 0; b < PLACES; b++) {
        const mesh = new Mesh(beadGeometry, this.materials.get(this.waitingColor));
        mesh.castShadow = LOOK.shadows;
        mesh.receiveShadow = LOOK.shadows;
        const shell = new Mesh(beadGeometry, this.materials.outline);
        shell.castShadow = false;
        shell.receiveShadow = false;
        mesh.add(shell);
        mesh.position.set(0, y, 0);
        this.rodGroup.add(mesh);
        let band: Mesh | null = null;
        if (this.kit && style && bandGeometry && style.band !== null) {
          band = new Mesh(bandGeometry, this.kit.toon(style.band, 'metal'));
          band.visible = false;
          mesh.add(band);
          this.rodDraws += 1;
        }
        rodView.beads.push({ mesh, x: 0, from: 0, to: 0, elapsed: null, struck: true, band, rest: 1 });
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
    if (brass.length > 0 && this.kit && rodStyle) {
      this.addSolid(weld(brass), rodStyle.color, true, rodStyle.ramp);
      if (studs.length > 0) {
        this.addSolid(weld(studs), this.look.frame?.fitting ?? rodStyle.color, true, 'metal', false);
      }
    } else if (brass.length > 0) this.addSolid(weld(brass), rod.color, true);
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
    perRoster: boolean,
    /** A style option's ramp, and whether the part has an ink outline. */
    ramp: LookRamp | null = null,
    outlined = true,
  ): void {
    computeHullNormals(geometry);
    const mesh = new Mesh(geometry, this.kit && ramp ? this.kit.toon(color, ramp) : this.materials.get(color));
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
   * The camera is orthographic and fixed, like the board's, but much lower — 24°
   * rather than 57°. The board is a map and wants to be looked *into*; this is an
   * object standing on a table and wants to be looked *at*, and a scoreboard seen
   * from above is a diagram of a scoreboard. The azimuth is swung a quarter turn
   * off square so the rails show their depth and the beads are visibly threaded
   * rather than stamped on.
   *
   * The fit itself is the Armory's: project the bounding box's eight corners into
   * camera space and cover the rectangle they make. Tilted camera plus a tall
   * object is not arithmetic anybody should keep true by hand.
   */
  private fit(): void {
    const view = { ...ABACUS.camera, ...(this.look.camera ?? {}) };
    const metrics = frameMetrics();
    const halfX = FRAME.width / 2 + view.labelGutter;
    const halfZ = FRAME.footDepth / 2;
    const bounds = new Box3(
      new Vector3(-halfX, 0, -halfZ),
      // The reliquary look has an arch over the top rail.
      new Vector3(halfX, metrics.totalHeight + (this.look.frame?.kind === 'reliquary' ? 0.7 : 0), halfZ),
    );

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
    const corner = new Vector3();
    for (const cx of [bounds.min.x, bounds.max.x]) {
      for (const cy of [bounds.min.y, bounds.max.y]) {
        for (const cz of [bounds.min.z, bounds.max.z]) {
          corner.set(cx, cy, cz).applyMatrix4(inv);
          minX = Math.min(minX, corner.x);
          maxX = Math.max(maxX, corner.x);
          minY = Math.min(minY, corner.y);
          maxY = Math.max(maxY, corner.y);
        }
      }
    }

    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    this.camera.position
      .addScaledVector(right, (minX + maxX) / 2)
      .addScaledVector(up, (minY + maxY) / 2);
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
    if (this.focus.amount !== 0) this.applyFocus();
  }

  private applyLight(center: Vector3): void {
    const el = (this.look.light?.elevation ?? LOOK.lightElevation) * DEG;
    const az = (this.look.light?.azimuth ?? LOOK.lightAzimuth) * DEG;
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
    const own = this.look.motion;
    const motion = own
      ? { ...ABACUS.motion, swayRadians: own.swayRadians, swaySeconds: own.swaySeconds }
      : ABACUS.motion;
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
        Math.sin((this.clock / (motion.swaySeconds * 1.37)) * Math.PI * 2) *
        motion.swayRadians *
        0.22;
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

    const slide = own
      ? { seconds: own.slideSeconds, travel: own.travel, overshoot: own.overshoot }
      : ABACUS.slide;
    for (const rod of this.rods) {
      for (const bead of rod.beads) {
        if (bead.elapsed === null) continue;
        bead.elapsed += dt;
        // The look-dev switch `?abacusFreeze=` holds the slide for a still picture.
        if (this.freezeAt !== null) bead.elapsed = Math.min(bead.elapsed, this.freezeAt * slide.seconds);
        const t = Math.min(1, bead.elapsed / slide.seconds);
        bead.x = slidePosition(bead.from, bead.to, t, slide);
        bead.mesh.position.x = bead.x;
        // A style option draws a waiting place smaller: the bead grows to full
        // size over the first part of its slide. The golden bead has its own size.
        if (own && this.golden?.glow.parent !== bead.mesh) {
          const start = this.look.bead?.waitingScale ?? 1;
          const grown = Math.min(1, t / (slide.travel * 0.6));
          bead.mesh.scale.setScalar(start + (bead.rest - start) * (1 - (1 - grown) ** 3));
        }
        if (!bead.struck && t >= slide.travel) {
          bead.struck = true;
          if (own && own.knock > 0) rod.knock = 0;
          this.onStrike?.();
        }
        if (t >= 1) bead.elapsed = null;
      }
      if (own && rod.knock !== null) this.applyKnock(rod, dt, own.knock, own.knockSeconds);
    }
    if (this.lookShadow) this.lookShadow.rotation.z = this.object.rotation.y;

    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
    requestAnimationFrame(this.loop);
  }

  /**
   * A style option's knock: the beads already on the earned side move a little
   * away from the bead that hit them and come back, less the farther they are
   * from it. One damped swing, over `seconds`.
   */
  private applyKnock(rod: RodView, dt: number, reach: number, seconds: number): void {
    rod.knock = (rod.knock ?? 0) + dt;
    const t = Math.min(1, rod.knock / seconds);
    const swing = Math.sin(t * Math.PI) * (1 - t);
    for (let index = 0; index < rod.earned.length; index++) {
      const bead = rod.beads[index]!;
      if (bead.elapsed !== null) continue;
      const fromNewest = rod.earned.length - 1 - index;
      bead.mesh.position.x = bead.x - reach * swing * 0.6 ** Math.max(0, fromNewest - 1);
    }
    if (t >= 1) rod.knock = null;
  }

  dispose(): void {
    this.running = false;
    this.disposed = true;
    this.kit?.dispose();
    this.clearRods();
    this.glowMap?.dispose();
    this.glowMap = null;
    for (const geometry of this.frameGeometries) geometry.dispose();
    this.frameGeometries.length = 0;
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
