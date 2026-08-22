/**
 * The Abacus: the victory scoreboard as a thing standing on the table.
 *
 * A look-dev spike, and the question it exists to answer is not "can we draw a
 * scoreboard in 3D" — it is *does scoring feel like something*. A number that
 * ticks from 4 to 5 is information; a bead that comes off the waiting stack,
 * runs down a brass rod and knocks into the earned ones is an event, and the
 * whole page is built to make that half-second worth watching.
 *
 * It is built out of the shipping look and nothing else: `MaterialLibrary` with
 * `view3d.json`'s three-band ramp and its outline width, the game's own key +
 * hemisphere + ambient rig, an orthographic camera. Change a number in
 * `view3d.json` and this object moves with the board, which is the only reason a
 * spike is worth looking at.
 *
 * Geometry
 * --------
 * Every part is a primitive or an extrusion of one (`geometry.ts`). The frame is
 * chamfered timber bars — one closed convex shell each, so the inverted-hull
 * outline stays a silhouette instead of laying stripes down the rails. The rods
 * are cylinders with turned finials. The beads are lathed bicones whose profile
 * simply never closes at the bore, so the hole is real without any CSG.
 *
 * Ordering
 * --------
 * The one invariant the animation rests on: **beads never reorder**. The bead
 * that slides on a score is the leftmost of the waiting cluster, and it lands as
 * the rightmost of the earned cluster — so the physical left-to-right order of
 * the thirteen beads on a rod is the same before and after, and "where does bead
 * i belong" is a pure function of how many are earned. Nothing else on the rod
 * moves, which is exactly what a real abacus does and why the animation needs no
 * bookkeeping at all.
 *
 * Built for N players, shown with two. Rod pitch, bead size and the tally all
 * fall out of the player count; the spike shows two because two is what the
 * game currently seats, not because anything here is hard-coded to it.
 */

import {
  AmbientLight,
  Box3,
  type BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

import { VIEW3D, mixColor, shade } from '../render3d/lookData';
import { MaterialLibrary, computeHullNormals } from '../render3d/toon';

import { type FamilyId, familyOf } from './families';
import {
  beadShape,
  chamferedBar,
  rodBar,
  rodFinial,
  uprightBar,
  weld,
} from './geometry';

const LOOK = VIEW3D.look;
const LIGHTS = VIEW3D.lights;
const DEG = Math.PI / 180;

// --- the object's proportions ----------------------------------------------

/**
 * The frame, in world units — the same units the board is in, where a hex is one
 * unit across its circumradius. The whole object is six hexes wide and three and
 * a half tall, which is roughly what a real counting frame is against a hand.
 *
 * The proportions are deliberately a little heavy. A scoreboard drawn with thin
 * rails reads as a toy xylophone; a reckoning-frame is furniture, and its stiles
 * are as thick as the rails they carry.
 */
const FRAME = {
  width: 6.0,
  /** The two end posts. Their inner faces are where the rods begin. */
  stileWidth: 0.4,
  /**
   * Shallower than the rails on purpose. The rails standing proud of the posts
   * is what makes the thing read as a frame with posts *in* it; it is also what
   * keeps the posts' outline shell buried where the two overlap, since a shell
   * is only ever visible where its own solid is the nearest surface.
   */
  stileDepth: 0.32,
  /** Top and bottom rails, running the full width. */
  railHeight: 0.36,
  railDepth: 0.42,
  /** Clear height between the rails: the space the rods are strung across. */
  innerHeight: 2.52,
  footWidth: 0.9,
  footHeight: 0.18,
  footDepth: 0.66,
  /** The 45° cut on every arris. See `chamferedBar`. */
  chamfer: 0.055,
} as const;

const FOOT_TOP = FRAME.footHeight;
const INNER_BOTTOM = FOOT_TOP + FRAME.railHeight;
const INNER_TOP = INNER_BOTTOM + FRAME.innerHeight;
const TOTAL_HEIGHT = INNER_TOP + FRAME.railHeight;
/** Half the clear span between the stiles' inner faces. */
const INNER_HALF_SPAN = FRAME.width / 2 - FRAME.stileWidth;

const ROD_RADIUS = 0.05;
/** How far each rod is buried in its stile, so no daylight shows at the joint. */
const ROD_TENON = 0.16;
const FINIAL_SIZE = 0.15;
const FINIAL_SEGMENTS = 9;

/** Beads per rod. Thirteen is the tally's denominator and the rod's capacity. */
const BEADS_PER_ROD = 13;
/** Enough segments to be turned rather than faceted; odd, like every lathe here. */
const BEAD_SEGMENTS = 11;

/** How long a bead takes to run down the rod, in seconds. */
const SLIDE_SECONDS = 0.46;
/**
 * The fraction of that spent arriving, as against settling.
 *
 * The slide is two eased moves, not one: out to a hair *past* the stack, then a
 * short bounce back onto it. An overshoot expressed as a fraction of the
 * distance travelled would be a finger's width on a long slide and invisible on
 * a short one, so it is a fixed world distance — a bead knocks into the stack by
 * the same amount however far it came.
 */
const SLIDE_TRAVEL = 0.8;
const SLIDE_OVERSHOOT = 0.05;

/**
 * The rods' brass.
 *
 * Spike-local like the two missing family inks, and paler than the commerce
 * bead's gilt on purpose: a gilt bead sitting on a gilt rod would lose its
 * silhouette at exactly the moment the page exists to show off.
 */
const BRASS = 0xc2a35c;

/** Radians per second of turntable, and the idle sway's amplitude and period. */
const SPIN_RATE = 0.36;
const SWAY_RADIANS = 0.085;
const SWAY_SECONDS = 7.5;

/** World units of empty table reserved on each side for the DOM labels. */
const LABEL_GUTTER = 1.3;

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
}

interface RodView {
  y: number;
  beads: BeadView[];
  earned: FamilyId[];
}

/** What a player's DOM label needs: two projected points and a fade. */
export interface LabelPlacement {
  left: { x: number; y: number };
  right: { x: number; y: number };
  /** 0 when the object has turned far enough that the labels no longer belong. */
  opacity: number;
}

export class AbacusStage {
  readonly players: readonly AbacusPlayer[];
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
  private readonly rods: RodView[] = [];
  private readonly owned: BufferGeometry[] = [];

  private beadGeometry!: BufferGeometry;
  private readonly unearnedColor: number;
  /** Bead pitch along a rod, and how far from the centre the run reaches. */
  private beadStep = 0;
  private runEdge = 0;

  private aspect = 1;
  private frustum = 1;
  private drawCalls = 0;
  private triangles = 0;

  private spin = false;
  private sway = true;
  private yaw = 0;
  private clock = 0;
  private lastFrame = 0;
  private running = true;

  constructor(canvas: HTMLCanvasElement, players: readonly AbacusPlayer[]) {
    this.players = players;

    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = LOOK.shadows;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.scene.background = new Color(VIEW3D.table.color);

    this.materials = new MaterialLibrary(LOOK.rampSteps, VIEW3D.palette.ink!);
    this.materials.outlineWidth.value = LOOK.outline;

    // Unearned beads are bone warmed toward the frame's timber: a waiting bead
    // is not *painted*, it is bare turned wood, and pure bone read as ivory
    // against the rails.
    this.unearnedColor = mixColor(VIEW3D.palette.bone!, VIEW3D.palette.timber!, 0.22);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 1, 600);

    this.key = new DirectionalLight(LIGHTS.keyColor, LIGHTS.keyIntensity);
    this.key.castShadow = LOOK.shadows;
    this.key.shadow.mapSize.set(LOOK.shadowMapSize, LOOK.shadowMapSize);
    this.key.shadow.bias = LOOK.shadowBias;
    this.key.shadow.normalBias = LOOK.shadowNormalBias;
    this.scene.add(this.key, this.key.target);
    this.scene.add(new HemisphereLight(LIGHTS.skyColor, LIGHTS.groundColor, LIGHTS.hemiIntensity));
    this.scene.add(new AmbientLight(LIGHTS.ambientColor, LIGHTS.ambientIntensity));

    this.scene.add(this.object);
    this.buildTable();
    this.buildFrame();
    this.buildRods();

    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  get stats(): { draws: number; triangles: number } {
    return { draws: this.drawCalls, triangles: this.triangles };
  }

  get beadsPerRod(): number {
    return BEADS_PER_ROD;
  }

  earnedCount(rodIndex: number): number {
    return this.rods[rodIndex]!.earned.length;
  }

  setSpinning(on: boolean): void {
    this.spin = on;
  }

  /** Reduced motion turns both off; the object is perfectly readable static. */
  setSway(on: boolean): void {
    this.sway = on;
    if (!on && !this.spin) this.yaw = 0;
  }

  // --- scoring -------------------------------------------------------------

  /**
   * Slide one bead from the waiting cluster into the earned one.
   *
   * Returns false when the rod is full, which is the spike's stand-in for
   * "this player has already won".
   */
  earn(rodIndex: number, family: FamilyId): boolean {
    const rod = this.rods[rodIndex]!;
    if (rod.earned.length >= rod.beads.length) return false;

    rod.earned.push(family);
    const index = rod.earned.length - 1;
    const bead = rod.beads[index]!;
    bead.mesh.material = this.materials.get(familyOf(family).color);
    bead.from = bead.x;
    bead.to = this.beadX(index, rod.earned.length);
    bead.elapsed = 0;
    bead.struck = false;
    return true;
  }

  /** Puts a rod straight into a given state, with no animation. For the seed. */
  seed(rodIndex: number, earned: readonly FamilyId[]): void {
    const rod = this.rods[rodIndex]!;
    rod.earned = earned.slice(0, rod.beads.length);
    rod.beads.forEach((bead, index) => {
      const family = rod.earned[index];
      bead.mesh.material = this.materials.get(
        family ? familyOf(family).color : this.unearnedColor,
      );
      bead.elapsed = null;
      bead.x = this.beadX(index, rod.earned.length);
      bead.mesh.position.x = bead.x;
    });
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
    const rod = this.rods[rodIndex]!;
    const reach = INNER_HALF_SPAN + FRAME.stileWidth + 0.18;
    const facing = Math.cos(this.object.rotation.y);
    return {
      left: this.project(-reach, rod.y, 0),
      right: this.project(reach, rod.y, 0),
      opacity: Math.max(0, Math.min(1, (facing - 0.55) / 0.3)),
    };
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
   * page's chrome is drawn on.
   */
  private buildTable(): void {
    const plane = new PlaneGeometry(400, 400);
    this.owned.push(plane);
    const table = new Mesh(plane, this.materials.get(VIEW3D.table.color));
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.004;
    table.receiveShadow = LOOK.shadows;
    this.scene.add(table);
    this.drawCalls += 1;
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
    const half = FRAME.width / 2;
    const railY = [FOOT_TOP + FRAME.railHeight / 2, INNER_TOP + FRAME.railHeight / 2];

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
        INNER_BOTTOM + FRAME.innerHeight / 2,
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

    const timber = VIEW3D.palette.timber!;
    this.addSolid(weld(light), timber);
    this.addSolid(weld(dark), shade(timber, VIEW3D.sideDarken * 0.62));
  }

  /**
   * The rods and the beads on them.
   *
   * Rods are spaced by dividing the clear height evenly, and the bead size falls
   * out of that pitch rather than being a constant — which is the whole of
   * "build for N". Two players get fat beads on a wide pitch; six would get
   * smaller ones on a tight pitch, and the object would still be an abacus
   * instead of a rack of overlapping discs.
   *
   * Player 0 takes the *top* rod. A scoreboard is read downward.
   */
  private buildRods(): void {
    const count = this.players.length;
    const pitch = FRAME.innerHeight / (count + 1);
    const beadRadius = Math.min(0.3, pitch * 0.36);
    const halfThickness = beadRadius * 0.43;
    // A hair of clearance between neighbours, so a packed stack still shows
    // thirteen outlines rather than one long dark sausage.
    this.beadStep = halfThickness * 2 + 0.014;
    this.runEdge = INNER_HALF_SPAN - FINIAL_SIZE - 0.05;

    this.beadGeometry = beadShape({
      radius: beadRadius,
      halfThickness,
      bore: ROD_RADIUS + 0.006,
      segments: BEAD_SEGMENTS,
    });
    computeHullNormals(this.beadGeometry);
    this.owned.push(this.beadGeometry);
    const beadTriangles = this.beadGeometry.getAttribute('position').count / 3;

    const brass: BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      const y = INNER_TOP - pitch * (i + 1);
      const rod = rodBar(ROD_RADIUS, INNER_HALF_SPAN * 2 + ROD_TENON * 2);
      rod.translate(0, y, 0);
      brass.push(rod);

      for (const side of [-1, 1]) {
        const knob = rodFinial(FINIAL_SIZE, FINIAL_SEGMENTS);
        // Turned to face inward rather than mirrored: a negative scale would
        // flip every triangle's winding and the knob would render inside out.
        if (side > 0) knob.rotateY(Math.PI);
        knob.translate(side * INNER_HALF_SPAN, y, 0);
        brass.push(knob);
      }

      const rodView: RodView = { y, beads: [], earned: [] };
      for (let b = 0; b < BEADS_PER_ROD; b++) {
        const mesh = new Mesh(this.beadGeometry, this.materials.get(this.unearnedColor));
        mesh.castShadow = LOOK.shadows;
        mesh.receiveShadow = LOOK.shadows;
        const shell = new Mesh(this.beadGeometry, this.materials.outline);
        shell.castShadow = false;
        shell.receiveShadow = false;
        mesh.add(shell);
        mesh.position.set(0, y, 0);
        this.object.add(mesh);
        rodView.beads.push({ mesh, x: 0, from: 0, to: 0, elapsed: null, struck: true });
        this.drawCalls += 2;
        this.triangles += beadTriangles;
      }
      this.rods.push(rodView);
      this.seed(i, []);
    }

    // A brass rod pushed through a hole never wants an ink outline running down
    // it — it is a highlight, not a silhouette — but it gets one anyway, because
    // dropping the shell on one part of a toon object is exactly how a look
    // starts to come apart. The finials need it more than the rods do.
    this.addSolid(weld(brass), BRASS);
  }

  /** A lit mesh with its inverted-hull shell — the two-mesh sandwich, verbatim. */
  private addSolid(geometry: BufferGeometry, color: number): void {
    computeHullNormals(geometry);
    this.owned.push(geometry);
    const mesh = new Mesh(geometry, this.materials.get(color));
    mesh.castShadow = LOOK.shadows;
    mesh.receiveShadow = LOOK.shadows;
    const shell = new Mesh(geometry, this.materials.outline);
    shell.castShadow = false;
    shell.receiveShadow = false;
    mesh.add(shell);
    this.object.add(mesh);
    this.drawCalls += 2;
    this.triangles += geometry.getAttribute('position').count / 3;
  }

  // --- bead positions ------------------------------------------------------

  /**
   * Where bead `index` belongs on a rod with `earned` beads slid over.
   *
   * The earned pack left from the left finial, the waiting pack right from the
   * right one, and the gap between them is whatever is left. Because beads never
   * reorder (see the file docblock), this is total — there is no per-bead state
   * to keep in step with it.
   */
  private beadX(index: number, earned: number): number {
    if (index < earned) return -this.runEdge + this.beadStep / 2 + index * this.beadStep;
    const fromRight = BEADS_PER_ROD - 1 - index;
    return this.runEdge - this.beadStep / 2 - fromRight * this.beadStep;
  }

  /**
   * The slide: out to a hair past the stack, then a short bounce back onto it.
   *
   * Both halves are `easeOutCubic`, which is the honest curve for a thing that
   * was pushed and is being stopped by friction — it leaves at speed and arrives
   * slowly, where an ease-in-out would have the bead accelerate out of a stack it
   * is supposedly resting in.
   */
  private static slide(from: number, to: number, t: number): number {
    if (t >= 1) return to;
    const over = to + Math.sign(to - from) * SLIDE_OVERSHOOT;
    if (t < SLIDE_TRAVEL) {
      const u = t / SLIDE_TRAVEL;
      return from + (over - from) * (1 - (1 - u) ** 3);
    }
    const u = (t - SLIDE_TRAVEL) / (1 - SLIDE_TRAVEL);
    return over + (to - over) * (1 - (1 - u) ** 3);
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
    const halfX = FRAME.width / 2 + LABEL_GUTTER;
    const halfZ = FRAME.footDepth / 2;
    const bounds = new Box3(
      new Vector3(-halfX, 0, -halfZ),
      new Vector3(halfX, TOTAL_HEIGHT, halfZ),
    );

    const el = 24 * DEG;
    const az = 66 * DEG;
    const eye = new Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    ).normalize();

    const center = bounds.getCenter(new Vector3());
    this.camera.position.copy(center).addScaledVector(eye, 240);
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

    const pad = 1.1;
    this.frustum = Math.max(((maxY - minY) / 2) * pad, (((maxX - minX) / 2) * pad) / this.aspect);
    this.camera.left = -this.frustum * this.aspect;
    this.camera.right = this.frustum * this.aspect;
    this.camera.top = this.frustum;
    this.camera.bottom = -this.frustum;
    this.camera.near = 1;
    this.camera.far = 600;
    this.camera.updateProjectionMatrix();
    this.applyLight(center);
  }

  private applyLight(center: Vector3): void {
    const el = LOOK.lightElevation * DEG;
    const az = LOOK.lightAzimuth * DEG;
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
    if (!this.running) return;
    const dt = this.lastFrame === 0 ? 0 : Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.clock += dt;

    if (this.spin) {
      this.yaw += dt * SPIN_RATE;
      this.object.rotation.set(0, this.yaw, 0);
    } else if (this.sway) {
      // The idle sway is a *breath*, not a rotation: it never leaves the angle
      // the object was framed at, so nothing it does can push a label off the
      // canvas or a rail out of the fitted box.
      this.object.rotation.y = Math.sin((this.clock / SWAY_SECONDS) * Math.PI * 2) * SWAY_RADIANS;
      this.object.rotation.x =
        Math.sin((this.clock / (SWAY_SECONDS * 1.37)) * Math.PI * 2) * SWAY_RADIANS * 0.22;
    } else {
      this.object.rotation.set(0, this.yaw, 0);
    }

    for (const rod of this.rods) {
      for (const bead of rod.beads) {
        if (bead.elapsed === null) continue;
        bead.elapsed += dt;
        const t = Math.min(1, bead.elapsed / SLIDE_SECONDS);
        bead.x = AbacusStage.slide(bead.from, bead.to, t);
        bead.mesh.position.x = bead.x;
        if (!bead.struck && t >= SLIDE_TRAVEL) {
          bead.struck = true;
          this.onStrike?.();
        }
        if (t >= 1) bead.elapsed = null;
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
    requestAnimationFrame(this.loop);
  }

  dispose(): void {
    this.running = false;
    for (const geometry of this.owned) geometry.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }
}
