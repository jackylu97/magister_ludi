/**
 * The caravan's own body: the trader's sculpt beside a soldier's.
 *
 * The board never lends itself to this comparison either. A caravan is a
 * civilian and a soldier is not, so the two are rarely on one hex and never on
 * one plinth — and the ruling that produced this sculpt is a judgement about
 * exactly that pairing (user, `docs/flags.md` (iii)): *"trader units should
 * still appear and build roads when a route is sent, but we should give them a
 * different shape icon (still semi-opaque)"*. **Different from what?** From the
 * soldier standing next to it on the road, at forty pixels of bronze. So the
 * shelf is the question stated as furniture: a soldier, an idle caravan, and a
 * caravan carrying a route, all three at once.
 *
 * Three figures, because the ruling is two sentences
 * --------------------------------------------------
 * *A different shape* is the left-hand pair — the `melee` body against the
 * caravan's, which is one figure against two objects travelling together, the
 * one silhouette in the roster that is not a single mass. *Still semi-opaque* is
 * the right-hand pair — the same caravan twice, idle and busy, where the second
 * is painted in `washedInk` and the first is not. Neither pair means anything
 * without the other on the same canvas: a wash judged alone reads as "a bit
 * pale", and a silhouette judged alone reads as "a caravan".
 *
 * Nothing is reproduced
 * ---------------------
 * The bodies come out of the board's own `BoardGeometry.pieces`, painted through
 * the board's own `pieceMaterials`, and the wash is the board's own `washedInk`
 * — the very function `unitColor` spends on a routed piece, read at call time so
 * the knob under the canvas moves the shelf and the next board rebuild by the
 * same number. Which sculpt a caravan wears is asked rather than typed:
 * `caravanTypeId()` finds the roster row that `trades` (the marker, never a name
 * — the sim's own discipline, read from the render side), `sculptFor` turns that
 * row into a drawing, and `MINI_SCULPTS[…].laden` names its loaded twin. A
 * second trading row drawn into the registry therefore arrives on this page
 * without an edit to it.
 *
 * The wash reaches two of the three meshes and the page says so
 * ------------------------------------------------------------
 * A piece is three meshes (sculpt, outline shell, x-ray ghost) and the ink
 * carries only two of them: the shell is one `MaterialLibrary` material shared
 * by every outlined piece on the board, washed per *instance* by
 * `InstanceCollector.setShellWash`, which a standalone mesh has no channel for
 * (`unitColor`'s docblock makes this division). That is not hidden here — every
 * figure stands half behind a canopy screen so its ghost is on the page, and the
 * shells are at full strength exactly as a *walking* caravan's is for the length
 * of its march. What you are looking at is the walker's reading, which is the
 * weaker of the two the board ships.
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

import { type SculptId, BoardGeometry, MINI_SCULPTS, sculptFor } from '../render3d/board3d';
import { hexPrism } from '../render3d/geometry';
import { VIEW3D, contrastRatio, playerPieceColor, shade } from '../render3d/lookData';
import { pieceMaterials, washedInk } from '../render3d/pieces';
import { MaterialLibrary, computeHullNormals } from '../render3d/toon';
import { caravanTypeId } from '../sim/unitData';

import { block, checkbox, controls, element, select, slider } from './sheet';
import { seatTinctures } from './marks';

const LOOK = VIEW3D.look;
const LIGHTS = VIEW3D.lights;

/**
 * The soldier the caravan is judged against: the `melee` body, which is the
 * board's ordinary unit shape and what a trader is most often walking past.
 *
 * A sculpt id rather than a unit type, and that asymmetry with the caravan below
 * is deliberate. The caravan's drawing is asked of the *roster* because the
 * question "which row is the caravan" has an answer in the rules; "which body is
 * the ordinary soldier" does not, and picking a row to stand for it would be
 * naming a unit type in order to avoid naming a sculpt.
 */
const SOLDIER: SculptId = 'melee';

/** Where the figures stand, how big a plinth each gets, and the frame around them. */
const FIGURE_SPACING = 1.02;
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

/** One thing on the shelf: which body, what to call it, and whether it is busy. */
export interface CaravanFigure {
  sculpt: SculptId;
  label: string;
  note: string;
  /** True for the piece carrying a route, which is the one the wash is spent on. */
  routed: boolean;
}

/**
 * The shelf, read off the roster and the sculpt registry rather than written
 * down.
 *
 * `caravanTypeId` is the sim's own reading of `UnitDef.trades` — the marker, the
 * way nothing anywhere compares a unit type against `"trader"` — and it is asked
 * here rather than in the renderer proper for a reason worth stating: which
 * drawing a *row* wears is a decision about drawings and is taken by
 * `pieces.byUnitType` in `data/view3d.json` (see `EXTRA_SCULPT_IDS` in
 * `board3d.ts`, which makes the argument at length). What this page needs is the
 * other direction — "show me the caravan, whichever row that is" — and the
 * marker is the only honest way to ask it.
 *
 * A roster with no trading row at all falls back to the drawing, because the
 * shelf is a shelf of *art*: the caravan sculpt exists whether or not a rules
 * file has a piece standing in it, and a blank panel would say the sculpt was
 * missing when the row is.
 */
export function caravanShelf(): CaravanFigure[] {
  const row = caravanTypeId();
  const idle: SculptId = row === null ? 'trader' : sculptFor(row);
  const laden: SculptId = MINI_SCULPTS[idle].laden ?? idle;
  return [
    {
      sculpt: SOLDIER,
      label: 'a soldier',
      note: 'the ordinary body — one figure, one mass',
      routed: false,
    },
    {
      sculpt: idle,
      label: 'the caravan, idle',
      note: 'a pack beast and the drover walking it: two objects on one base',
      routed: false,
    },
    {
      sculpt: laden,
      label: 'the caravan, carrying',
      note: 'the same body with a gilt bale, and the seat’s ink washed toward the chart',
      routed: true,
    },
  ];
}

/** One figure's turntable, and what it was dressed from. */
interface Stand {
  turntable: Group;
  figure: CaravanFigure;
}

export class CaravanStage {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: OrthographicCamera;
  private readonly materials: MaterialLibrary;
  private readonly geometry = new BoardGeometry();
  private readonly plinth: BufferGeometry;
  private readonly stands: Stand[] = [];

  private ink: number;
  private spin = true;
  private yaw = 0;
  private lastFrame = 0;
  private running = true;

  constructor(canvas: HTMLCanvasElement, figures: readonly CaravanFigure[], ink: number) {
    this.ink = ink;
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = LOOK.shadows;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.scene.background = new Color(VIEW3D.table.color);

    this.materials = new MaterialLibrary(LOOK.rampSteps, VIEW3D.palette.ink!);
    this.materials.outlineWidth.value = LOOK.outline;

    // The board's own eye: high, one azimuth, orthographic. A friendlier angle
    // would flatter a silhouette the game never shows from there — and the whole
    // complaint this shelf answers is about what survives *this* angle.
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

    const first = -((figures.length - 1) / 2) * FIGURE_SPACING;
    figures.forEach((figure, index) => {
      const x = first + index * FIGURE_SPACING;
      this.scene.add(this.plinthAt(x));
      this.scene.add(this.screenAt(x));
      const turntable = new Group();
      turntable.position.set(x, PLINTH_HEIGHT, 0);
      this.scene.add(turntable);
      this.stands.push({ turntable, figure });
    });
    this.repaint();

    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /** Repaints every figure from the current seat ink and the current wash. */
  repaint(): void {
    for (const stand of this.stands) this.dress(stand);
  }

  setSeat(ink: number): void {
    if (this.ink === ink) return;
    this.ink = ink;
    this.repaint();
  }

  setSpinning(on: boolean): void {
    this.spin = on;
  }

  /** The ink one figure is painted in — the seat's, or the seat's washed. */
  inkOf(figure: CaravanFigure): number {
    return figure.routed ? washedInk(this.ink) : this.ink;
  }

  /**
   * Empties a turntable and refills it: the lit sculpt, its outline shell, and
   * the ghost over the same geometry.
   *
   * Three meshes over one geometry, which is the board's own arrangement and the
   * reason the shelf is worth looking at rather than a screenshot: the ghost is
   * keyed on the *same* ink the body is, so a washed caravan washes in the x-ray
   * pass without anything here saying so twice.
   */
  private dress(stand: Stand): void {
    stand.turntable.clear();
    const piece = this.geometry.pieces[stand.figure.sculpt];
    computeHullNormals(piece.geometry);
    const ink = this.inkOf(stand.figure);
    const mesh = new Mesh(piece.geometry, pieceMaterials(this.materials, piece, ink));
    mesh.castShadow = LOOK.shadows;
    mesh.receiveShadow = LOOK.shadows;
    const shell = new Mesh(piece.geometry, this.materials.outline);
    shell.castShadow = false;
    shell.receiveShadow = false;
    mesh.add(shell);
    const ghost = new Mesh(piece.geometry, this.materials.silhouette(ink));
    ghost.renderOrder = 2;
    stand.turntable.add(mesh, ghost);
  }

  private plinthAt(x: number): Mesh {
    const colors = [
      shade(VIEW3D.palette.bone!, VIEW3D.sideDarken),
      VIEW3D.palette.bone!,
      VIEW3D.palette.bone!,
    ];
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
   * `pieceInks.ts`'s screen, for its reason exactly — the x-ray pass draws only
   * where world geometry is already in front of a piece, so a stall with no
   * occluder in it shows no ghost at all and the wash would appear to reach one
   * mesh instead of two.
   */
  private screenAt(x: number): Mesh {
    const mesh = new Mesh(
      new PlaneGeometry(0.8, 0.5),
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
    for (const stand of this.stands) stand.turntable.quaternion.copy(turn);
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
 * The section: the three figures, the knobs, and the measurements under them.
 *
 * The readout is what makes it an instrument rather than a picture, exactly as
 * on the wild's-red stall beside it. *Semi-opaque* is a judgement, and the thing
 * being judged is one number on the sheet (`pieces.routedWash`) and one contrast
 * — a washed caravan has to stay legible against the parchment ground while
 * being visibly less present than the soldier next to it, and both halves are
 * printed rather than eyeballed.
 */
export function drawCaravan(into: HTMLElement): CaravanStage {
  const figures = caravanShelf();
  const tinctures = seatTinctures();
  const firstSeat = tinctures[0]!;
  const seatInk = (index: number): number =>
    playerPieceColor((tinctures[index] ?? firstSeat).color, index);

  const root = block(
    into,
    'The caravan beside a soldier',
    'Three of the board’s own sculpts through pieceMaterials: the melee body, the caravan idle, and the caravan carrying a route — the last one painted through the renderer’s washedInk, which is the very mix unitColor spends on a routed piece. Each stands half behind a canopy so its x-ray ghost is on the page. The wash knob writes the sheet’s own pieces.routedWash, so a value dialled here is the value that goes back into data/view3d.json.',
  );
  const canvas = element('canvas', 'caravan-canvas');
  root.append(canvas);

  const stage = new CaravanStage(canvas, figures, seatInk(0));

  const captions = element('ul', 'caravan-captions');
  const swatches = figures.map((figure) => {
    const item = element('li');
    const swatch = element('span', 'ink-swatch');
    swatch.setAttribute('aria-hidden', 'true');
    const name = element('strong', undefined, figure.label);
    const id = element('span', 'sheet-figure', figure.sculpt);
    item.append(swatch, name, id, document.createTextNode(figure.note));
    captions.append(item);
    return swatch;
  });
  root.append(captions);

  const measures = element('ul', 'ink-measures');
  root.append(measures);

  const write = (): void => {
    figures.forEach((figure, index) => {
      swatches[index]!.style.background = hex(stage.inkOf(figure));
    });
    measures.replaceChildren();
    // The idle caravan's ink is the seat's own, untouched; the busy one's is
    // that ink through the board's own mix. Printing both is the whole readout:
    // "semi-opaque" is a judgement about the distance between two colours.
    const idle = stage.inkOf(figures[1]!);
    const busy = washedInk(idle);
    const lines: [string, string][] = [
      ['the wash on the sheet', VIEW3D.pieces.routedWash.toFixed(2)],
      ['the seat’s ink, and the same ink carrying', `${hex(idle)} → ${hex(busy)}`],
      [
        'the washed piece against the parchment ground',
        `${contrastRatio(busy, VIEW3D.palette.sand!).toFixed(2)}:1`,
      ],
      [
        'the washed piece against the idle one beside it',
        `${contrastRatio(busy, idle).toFixed(2)}:1`,
      ],
    ];
    for (const [label, figure] of lines) {
      const item = element('li');
      item.append(
        document.createTextNode(`${label} `),
        element('span', 'sheet-figure', figure),
      );
      measures.append(item);
    }
  };
  write();

  const knobs = controls(root);
  select(
    knobs,
    'seat',
    tinctures.map((seat, index) => [String(index), seat.name] as const),
    '0',
    (value) => {
      stage.setSeat(seatInk(Number(value)));
      write();
    },
  );
  // The one knob the ruling actually asks about. It writes the sheet's own key
  // rather than a local copy, so the number under the slider is the number the
  // board reads on its next rebuild — and the number to paste back into
  // `data/view3d.json`.
  slider(
    knobs,
    'routed wash',
    { min: 0, max: 1, step: 0.01, value: VIEW3D.pieces.routedWash },
    (value) => value.toFixed(2),
    (value) => {
      VIEW3D.pieces.routedWash = value;
      stage.repaint();
      write();
    },
  );
  checkbox(knobs, 'turntable', true, (on) => stage.setSpinning(on));

  return stage;
}
