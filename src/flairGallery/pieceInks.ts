/**
 * The wild's red: a barbarian piece and a crimson seat's, side by side.
 *
 * The one comparison the board can never show you on purpose. A wild warrior
 * and a crimson warrior are only ever on the same screen by accident — a raider
 * walking out of the fog next to somebody's border — and by then the question
 * ("are these two the same red?") has already been answered wrongly. The user's
 * ruling of 2026-09-08 was made from exactly that accident: *"the barbarian
 * colors and the crimson color are too similar."* So the accident is a stall.
 *
 * A piece is three meshes and only one of them is the body
 * -------------------------------------------------------
 * Both figures are the board's own `melee` sculpt, painted through the board's
 * own `pieceMaterials` — which is what puts the *role* colours (the spear's
 * wood, the blade's metal) on both and the seat's ink only on the parts that
 * are the seat's. Each carries the inverted-hull outline shell the board gives
 * every piece, and each stands half behind a screen so its **x-ray ghost** is
 * on the page rather than described on it: the ghost is a flat silhouette in
 * the piece's own ink with an inverted depth test, so it exists only where
 * something is in front of the piece and a stall without an occluder would
 * show nothing at all. That is the whole of the ruling's second half — the red
 * had to go on the *base*, which means all three meshes, and here all three are
 * visible at once.
 *
 * The defaults are read, not typed
 * --------------------------------
 * The wild's opening ink comes out of a real `newGame` with barbarians seated,
 * through `playerPieceColor` — the same two calls the renderer makes. So if
 * somebody changes the seat's colour in `src/sim/state.ts` and forgets
 * `players.byColor` in `data/view3d.json`, this stall goes to the fallback
 * tincture and says so in its own readout, which is the failure the page exists
 * to make visible. The sliders then move the two inks *from* those defaults,
 * printing the hex and the measured contrast as they go, so dialling a
 * replacement red here produces the exact string that goes back into the
 * palette.
 */

import {
  AmbientLight,
  type BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

import { BoardGeometry } from '../render3d/board3d';
import { hexPrism } from '../render3d/geometry';
import { VIEW3D, contrastRatio, playerPieceColor, saturate, shade } from '../render3d/lookData';
import { pieceMaterials } from '../render3d/pieces';
import { MaterialLibrary, computeHullNormals } from '../render3d/toon';
import { barbarianPlayer, newGame } from '../sim/state';

import { block, controls, element, slider } from './sheet';
import { seatTinctures } from './marks';

const LOOK = VIEW3D.look;
const LIGHTS = VIEW3D.lights;
const BADGE = VIEW3D.badges;

/** The sculpt both figures wear: a footman, which is what a raider usually is. */
const SCULPT = 'melee' as const;

/** Where the two figures stand, and how big a plinth each gets. */
const FIGURE_X = 0.78;
const PLINTH_RADIUS = 0.42;
const PLINTH_HEIGHT = 0.06;
/** Half the world height the camera frames. A piece is about one unit tall. */
const SPAN = 0.92;
/** Radians per second, the Armory's rate: a full turn every twenty seconds. */
const SPIN_RATE = 0.3;

/** `0xRRGGBB` as `#rrggbb`, for a readout and for a CSS swatch. */
function hex(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
}

/**
 * The ink the shipping wild is painted in, asked of the sim and the data
 * together rather than typed.
 *
 * A real game, because the barbarian seat is appended by `seatBarbarians` and
 * its colour is a field on the `Player` it builds — there is no constant to
 * import. The map is generated and thrown away; a duel is the cheapest one.
 */
export function wildPieceInk(): number {
  const seats = seatTinctures()
    .slice(0, 2)
    .map((seat, index) => ({ name: `Seat ${index + 1}`, color: seat.color, charge: seat.charge }));
  const state = newGame({ seed: 11, sizeName: 'duel', players: seats, barbarians: true });
  const wild = barbarianPlayer(state);
  return wild ? playerPieceColor(wild.color, wild.id) : VIEW3D.palette.wildRed!;
}

/** Seat 0's, the near miss: the crimson tincture, through the same door. */
export function crimsonPieceInk(): number {
  const seat = seatTinctures()[0]!;
  return playerPieceColor(seat.color, 0);
}

/** One figure's turntable and the ink its three meshes were built from. */
interface Figure {
  turntable: Group;
  ink: number;
}

export class PieceInkStage {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: OrthographicCamera;
  private readonly materials: MaterialLibrary;
  private readonly geometry = new BoardGeometry();
  private readonly plinth: BufferGeometry;
  private readonly figures: Figure[] = [];

  private spin = true;
  private yaw = 0;
  private lastFrame = 0;
  private running = true;

  constructor(canvas: HTMLCanvasElement, inks: readonly number[]) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = LOOK.shadows;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.scene.background = new Color(VIEW3D.table.color);

    this.materials = new MaterialLibrary(LOOK.rampSteps, VIEW3D.palette.ink!);
    this.materials.outlineWidth.value = LOOK.outline;

    // The board's own eye: high, one azimuth, orthographic. A friendlier angle
    // would flatter a colour the game never shows from there.
    this.camera = new OrthographicCamera(-SPAN, SPAN, SPAN, -SPAN, 0.1, 60);
    this.camera.position.set(4, 5.2, 4);
    this.camera.lookAt(0, 0.42, 0);
    this.camera.updateMatrixWorld();

    const key = new DirectionalLight(LIGHTS.keyColor, 2.1);
    key.position.set(3, 6, 2.4);
    key.castShadow = LOOK.shadows;
    key.shadow.mapSize.set(LOOK.shadowMapSize, LOOK.shadowMapSize);
    key.shadow.bias = LOOK.shadowBias;
    key.shadow.normalBias = LOOK.shadowNormalBias;
    this.scene.add(key, key.target);
    this.scene.add(new HemisphereLight(LIGHTS.skyColor, LIGHTS.groundColor, LIGHTS.hemiIntensity));
    this.scene.add(new AmbientLight(LIGHTS.ambientColor, 0.9));

    // A table for the shadows to land on, and the plinths the two stand on.
    const table = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({ color: VIEW3D.palette.vellum! }),
    );
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.004;
    table.scale.set(60, 60, 1);
    this.scene.add(table);

    this.plinth = hexPrism(PLINTH_RADIUS, PLINTH_HEIGHT);
    computeHullNormals(this.plinth);

    inks.forEach((ink, index) => {
      const x = index === 0 ? -FIGURE_X : FIGURE_X;
      this.scene.add(this.plinthAt(x));
      const turntable = new Group();
      turntable.position.set(x, PLINTH_HEIGHT, 0);
      this.scene.add(turntable);
      // The screen: an unlit slab of canopy standing between the camera and the
      // figure's legs, so the ghost pass has something to be behind. Built here
      // rather than per rebuild — it does not change when an ink does.
      this.scene.add(this.screenAt(x));
      const figure: Figure = { turntable, ink };
      this.figures.push(figure);
      this.dress(figure, ink);
    });

    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /** Repaints one figure. All three meshes, which is the point of the stall. */
  setInk(index: number, ink: number): void {
    const figure = this.figures[index];
    if (!figure || figure.ink === ink) return;
    figure.ink = ink;
    this.dress(figure, ink);
  }

  setSpinning(on: boolean): void {
    this.spin = on;
  }

  /**
   * Empties a turntable and refills it: the lit sculpt, its outline shell, and
   * the ghost over the same geometry.
   *
   * The ghost is *not* in the turntable. It has to sit exactly over the sculpt
   * or it stops being that sculpt's shadow, so it is parented to the same group
   * — which it is; the turntable is what turns, and both are in it. What it must
   * not do is carry the shell: three meshes, two of them in the piece's ink and
   * one in the board's near-black.
   */
  private dress(figure: Figure, ink: number): void {
    figure.turntable.clear();
    const piece = this.geometry.pieces[SCULPT];
    computeHullNormals(piece.geometry);
    const mesh = new Mesh(piece.geometry, pieceMaterials(this.materials, piece, ink));
    mesh.castShadow = LOOK.shadows;
    mesh.receiveShadow = LOOK.shadows;
    const shell = new Mesh(piece.geometry, this.materials.outline);
    shell.castShadow = false;
    shell.receiveShadow = false;
    mesh.add(shell);
    const ghost = new Mesh(piece.geometry, this.materials.silhouette(ink));
    ghost.renderOrder = 2;
    figure.turntable.add(mesh, ghost);
  }

  private plinthAt(x: number): Mesh {
    const colors = [shade(VIEW3D.palette.bone!, VIEW3D.sideDarken), VIEW3D.palette.bone!, VIEW3D.palette.bone!];
    const mesh = new Mesh(
      this.plinth,
      colors.map((color) => this.materials.get(color)),
    );
    mesh.position.set(x, 0, 0);
    mesh.receiveShadow = LOOK.shadows;
    return mesh;
  }

  /**
   * The canopy screen: a camera-facing slab of pine over the figure's lower
   * half, placed between the eye and the piece.
   *
   * Unlit and flat, because it is furniture rather than a thing on a board —
   * the only property of it that matters is that it writes depth in front of a
   * piece, which is the condition the x-ray pass tests for.
   */
  private screenAt(x: number): Mesh {
    const mesh = new Mesh(
      new PlaneGeometry(0.86, 0.5),
      new MeshBasicMaterial({ color: VIEW3D.featureColor.forest }),
    );
    const forward = new Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    mesh.quaternion.copy(this.camera.quaternion);
    mesh.position
      .set(x, PLINTH_HEIGHT, 0)
      .addScaledVector(forward, 0.7)
      .addScaledVector(up, 0.2);
    return mesh;
  }

  resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 320;
    this.renderer.setSize(width, height, false);
    const aspect = width / Math.max(1, height);
    this.camera.left = -SPAN * aspect;
    this.camera.right = SPAN * aspect;
    this.camera.updateProjectionMatrix();
  }

  private loop(now: number): void {
    if (!this.running) return;
    const dt = this.lastFrame === 0 ? 0 : Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.spin) this.yaw += dt * SPIN_RATE;
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), this.yaw);
    for (const figure of this.figures) figure.turntable.quaternion.copy(turn);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }

  dispose(): void {
    this.running = false;
    this.geometry.dispose();
    this.materials.dispose();
    this.plinth.dispose();
    this.renderer.dispose();
  }
}

/**
 * The section: the two figures, a knob apiece, and the measurements under them.
 *
 * The readout is the part that earns the stall its place. Two reds either side
 * of a screen is a picture; the same two with their contrast against the
 * parchment ground and against *each other* printed underneath is an
 * instrument, and the ruling that produced this section was a judgement about
 * exactly those numbers.
 */
export function drawPieceInks(into: HTMLElement): PieceInkStage {
  const root = block(
    into,
    'The wild’s red beside the crimson seat’s',
    'Two of the board’s own melee sculpts, painted through pieceMaterials: the barbarian seat’s ink on the left, seat 0’s crimson on the right. Each stands half behind a canopy so its x-ray ghost is on the page — a piece is three meshes and the base colour has to carry all three. The knobs move each ink from its shipped value and print the hex, so a replacement red is dialled here and pasted into data/view3d.json.',
  );
  const canvas = element('canvas', 'ink-canvas');
  root.append(canvas);

  const defaults = [wildPieceInk(), crimsonPieceInk()] as const;
  const stage = new PieceInkStage(canvas, defaults);

  const captions = element('ul', 'ink-captions');
  const readouts = defaults.map((ink, index) => {
    const item = element('li');
    const swatch = element('span', 'ink-swatch');
    swatch.setAttribute('aria-hidden', 'true');
    swatch.style.background = hex(ink);
    const name = element('strong', undefined, index === 0 ? 'the wild' : 'seat 0 · crimson');
    const figure = element('span', 'sheet-figure', hex(ink));
    item.append(swatch, name, figure);
    captions.append(item);
    return { swatch, figure };
  });
  root.append(captions);

  const measures = element('ul', 'ink-measures');
  root.append(measures);

  const state = [defaults[0], defaults[1]];
  const write = (): void => {
    state.forEach((ink, index) => {
      const readout = readouts[index]!;
      readout.swatch.style.background = hex(ink);
      readout.figure.textContent = hex(ink);
    });
    measures.replaceChildren();
    const lines: [string, number][] = [
      ['the two pieces against each other', contrastRatio(state[0]!, state[1]!)],
      ['the wild against the parchment ground', contrastRatio(state[0]!, VIEW3D.palette.sand!)],
      ['the badge’s mark on the wild’s disc', contrastRatio(BADGE.wildInkColor, BADGE.wildPaperColor)],
      ['the badge’s rim on the wild’s disc', contrastRatio(BADGE.wildRimColor, BADGE.wildPaperColor)],
    ];
    for (const [label, ratio] of lines) {
      const item = element('li');
      item.append(
        document.createTextNode(`${label} `),
        element('span', 'sheet-figure', `${ratio.toFixed(2)}:1`),
      );
      measures.append(item);
    }
  };
  write();

  const knobs = controls(root);
  defaults.forEach((base, index) => {
    const label = index === 0 ? 'wild' : 'crimson';
    const dial = { value: 0, saturation: 1 };
    const repaint = (): void => {
      const ink = saturate(shade(base, dial.value), dial.saturation);
      state[index] = ink;
      stage.setInk(index, ink);
      write();
    };
    slider(knobs, `${label} value`, { min: -0.4, max: 0.4, step: 0.01, value: 0 }, (v) => v.toFixed(2), (v) => {
      dial.value = v;
      repaint();
    });
    slider(knobs, `${label} saturation`, { min: 0, max: 1.6, step: 0.02, value: 1 }, (v) => v.toFixed(2), (v) => {
      dial.saturation = v;
      repaint();
    });
  });

  return stage;
}
