/**
 * The Armory's stage: fifteen sculpted miniatures on plinths, under the game's
 * own light rig.
 *
 * A look-dev page, and the whole point of it is that it is *not* a mock-up. It
 * builds `BoardGeometry`, so the sculpts here are byte-identical to the ones on
 * the board; it uses `MaterialLibrary` with `view3d.json`'s ramp, outline width
 * and lights, so the shading is the shipping shading; and it stands each piece
 * on a real `hexPrism` chip, because a miniature judged against a white sweep
 * and a miniature judged against the tile it will actually stand on are two
 * different judgements. Change a number in `view3d.json` and this page moves
 * with the game — which is the only reason a reference sheet is worth having.
 *
 * What it deliberately does not have is a simulation. There is no map, no
 * state, no turn; a piece here is a `type` and an owner colour and nothing else.
 *
 * The turntable
 * -------------
 * The board camera is fixed at one azimuth, so on the board you only ever see a
 * sculpt from one side — which is exactly the condition under which a bad
 * silhouette hides. Turning the pieces is the honest test, so they turn: slowly
 * and continuously by default, and under the pointer when it is dragged. The
 * plinths stay square to the grid, which is what keeps the rotation reading as
 * "the piece is turning" rather than "the camera is drifting".
 */

import {
  AmbientLight,
  type BufferGeometry,
  Box3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  type Material,
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

import { BoardGeometry, MINI_SCULPTS, pieceShapeFor } from '../render3d/board3d';
import { hexPrism } from '../render3d/geometry';
import { VIEW3D, shade } from '../render3d/lookData';
import { buildSpriteUnit, pieceMaterials } from '../render3d/pieces';
import type { UnitSprites } from '../render3d/sprites3d';
import { MaterialLibrary, computeHullNormals } from '../render3d/toon';
import { UNIT_TYPE_IDS, type UnitTypeId, unitDef } from '../sim/unitData';

const LOOK = VIEW3D.look;
const LIGHTS = VIEW3D.lights;
const CAMERA = VIEW3D.camera;
const DEG = Math.PI / 180;

/** Grid layout, in world units. Columns run along +x, rows along +z. */
const COLUMNS = 5;
const COLUMN_GAP = 1.62;
const ROW_GAP = 1.96;
/** The chip each piece stands on: a board tile, shrunk to a display plinth. */
const PLINTH_RADIUS = 0.62;
const PLINTH_HEIGHT = 0.16;
/** Radians per second of turntable. A full turn every twenty-odd seconds. */
const SPIN_RATE = 0.3;

export type GalleryStyle = 'pieces' | 'sprites';

/** One cell of the grid: where it is, what stands there, and what to call it. */
export interface GalleryEntry {
  type: UnitTypeId;
  name: string;
  /** The size class its sculpt is cut to, for the label's second line. */
  cls: string;
  triangles: number;
  /** World position of the top of its plinth — the piece's own feet. */
  anchor: Vector3;
}

export class PiecesStage {
  readonly entries: GalleryEntry[] = [];

  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: OrthographicCamera;
  private readonly materials: MaterialLibrary;
  private readonly geometry = new BoardGeometry();
  private readonly key: DirectionalLight;
  private readonly plinth: BufferGeometry;
  private readonly table: PlaneGeometry;

  /** One turning group per cell; the plinths are not in them. See the docblock. */
  private readonly turntables: Group[] = [];
  private readonly figures = new Group();

  private readonly bounds = new Box3();
  private aspect = 1;
  private frustum = 1;
  private viewportHeight = 1;

  private spin = true;
  private yaw = 0;
  private lastFrame = 0;
  private running = true;
  private drawCalls = 0;
  private triangles = 0;

  private style: GalleryStyle = 'pieces';
  private color = VIEW3D.palette.crimson!;
  private sprites: UnitSprites | null = null;
  private onLayout: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = LOOK.shadows;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.scene.background = new Color(VIEW3D.table.color);

    this.materials = new MaterialLibrary(LOOK.rampSteps, VIEW3D.palette.ink!);
    this.materials.outlineWidth.value = LOOK.outline;

    // The board's own eye: 57° up, one fixed azimuth, orthographic. A gallery
    // shot taken from a friendlier angle would flatter sculpts that do not read
    // from the angle the game actually uses.
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 1, CAMERA.eyeDistance * 2.5);

    this.key = new DirectionalLight(LIGHTS.keyColor, LIGHTS.keyIntensity);
    this.key.castShadow = LOOK.shadows;
    this.key.shadow.mapSize.set(LOOK.shadowMapSize, LOOK.shadowMapSize);
    this.key.shadow.bias = LOOK.shadowBias;
    this.key.shadow.normalBias = LOOK.shadowNormalBias;
    this.scene.add(this.key, this.key.target);
    this.scene.add(new HemisphereLight(LIGHTS.skyColor, LIGHTS.groundColor, LIGHTS.hemiIntensity));
    this.scene.add(new AmbientLight(LIGHTS.ambientColor, LIGHTS.ambientIntensity));

    this.plinth = hexPrism(PLINTH_RADIUS, PLINTH_HEIGHT);
    this.table = new PlaneGeometry(1, 1);
    this.scene.add(this.figures);

    this.buildStage();
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /** Called whenever the projection changed, so the DOM labels can follow. */
  setLayoutListener(listener: () => void): void {
    this.onLayout = listener;
  }

  get stats(): { draws: number; triangles: number } {
    return { draws: this.drawCalls, triangles: this.triangles };
  }

  setSpinning(on: boolean): void {
    this.spin = on;
  }

  setColor(color: number): void {
    if (this.color === color) return;
    this.color = color;
    this.rebuildFigures();
  }

  setStyle(style: GalleryStyle): void {
    if (this.style === style) return;
    this.style = style;
    this.rebuildFigures();
  }

  /** Hands the stage the loaded billboard art, if any arrived. */
  setSprites(sprites: UnitSprites | null): void {
    this.sprites = sprites;
    if (this.style === 'sprites') this.rebuildFigures();
  }

  /** Pointer drag, in CSS pixels: a horizontal drag turns the whole roster. */
  drag(dx: number): void {
    this.yaw += (dx / Math.max(1, this.viewportHeight)) * Math.PI * 2;
  }

  /**
   * Where a cell's label belongs, in CSS pixels from the canvas's top-left.
   *
   * Projected from the *plinth's* front rim rather than from the piece, so the
   * labels sit on one clean baseline per row instead of stepping up and down
   * with whatever each sculpt happens to be carrying.
   */
  labelPosition(entry: GalleryEntry): { x: number; y: number } {
    const point = new Vector3(entry.anchor.x, 0, entry.anchor.z + PLINTH_RADIUS * 1.1);
    point.project(this.camera);
    return {
      x: ((point.x + 1) / 2) * this.renderer.domElement.clientWidth,
      y: ((1 - point.y) / 2) * this.renderer.domElement.clientHeight,
    };
  }

  // --- construction --------------------------------------------------------

  /**
   * Lays out the grid once: a plinth and an empty turntable per unit type.
   *
   * The plinths and the layout never change, so a colour or style flip only has
   * to swap what is *inside* the turntables — which is why the pieces live in
   * their own group and the furniture does not.
   */
  private buildStage(): void {
    const rows = Math.ceil(UNIT_TYPE_IDS.length / COLUMNS);
    const originX = -((COLUMNS - 1) * COLUMN_GAP) / 2;
    const originZ = -((rows - 1) * ROW_GAP) / 2;

    const plinthColors = [
      shade(VIEW3D.palette.bone!, VIEW3D.sideDarken),
      VIEW3D.palette.bone!,
      VIEW3D.palette.bone!,
    ];

    // A ground plane a hair below the plinths, so their real shadows land on
    // something. Unlit and in the table's own ink: this is a table, not a sky.
    const table = new Mesh(
      this.table,
      new MeshBasicMaterial({ color: VIEW3D.palette.vellum! }),
    );
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.004;
    table.scale.set(200, 200, 1);
    table.receiveShadow = false;
    this.scene.add(table);

    UNIT_TYPE_IDS.forEach((type, index) => {
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = originX + col * COLUMN_GAP;
      const z = originZ + row * ROW_GAP;

      this.scene.add(this.solid(this.plinth, plinthColors, x, 0, z, true));

      const turntable = new Group();
      turntable.position.set(x, PLINTH_HEIGHT, z);
      this.figures.add(turntable);
      this.turntables.push(turntable);

      const sculpt = this.geometry.pieces[pieceShapeFor(type)];
      this.entries.push({
        type,
        name: unitDef(type).name,
        cls: MINI_SCULPTS[pieceShapeFor(type)].cls,
        triangles: sculpt.geometry.getAttribute('position').count / 3,
        anchor: new Vector3(x, PLINTH_HEIGHT, z),
      });
    });

    this.rebuildFigures();
  }

  /** A lit, outlined mesh — the same two-mesh sandwich the board draws. */
  private solid(
    geometry: BufferGeometry,
    colors: number[],
    x: number,
    y: number,
    z: number,
    shadows: boolean,
  ): Mesh {
    computeHullNormals(geometry);
    const material: Material | Material[] =
      colors.length === 1
        ? this.materials.get(colors[0]!)
        : colors.map((color) => this.materials.get(color));
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadows && LOOK.shadows;
    mesh.receiveShadow = shadows && LOOK.shadows;
    const shell = new Mesh(geometry, this.materials.outline);
    shell.castShadow = false;
    shell.receiveShadow = false;
    mesh.add(shell);
    return mesh;
  }

  /** Empties every turntable and refills it in the current style and colour. */
  private rebuildFigures(): void {
    const faceCamera = this.camera.quaternion.clone();
    this.drawCalls = 0;
    this.triangles = 0;

    this.entries.forEach((entry, index) => {
      const turntable = this.turntables[index]!;
      turntable.clear();

      const spriteMaterial =
        this.style === 'sprites' ? (this.sprites?.materialFor(entry.type) ?? null) : null;
      if (spriteMaterial) {
        // The standee path, verbatim — card, moulded foot and blob shadow. The
        // point of having both on one page is that neither gets a special case.
        turntable.add(
          buildSpriteUnit(this.geometry, this.materials, spriteMaterial, this.color, faceCamera),
        );
        this.drawCalls += 3;
        return;
      }

      const piece = this.geometry.pieces[pieceShapeFor(entry.type)];
      const material = pieceMaterials(this.materials, piece, this.color);
      computeHullNormals(piece.geometry);
      const mesh = new Mesh(piece.geometry, material);
      mesh.castShadow = LOOK.shadows;
      mesh.receiveShadow = LOOK.shadows;
      const shell = new Mesh(piece.geometry, this.materials.outline);
      shell.castShadow = false;
      shell.receiveShadow = false;
      mesh.add(shell);
      turntable.add(mesh);
      this.drawCalls += 2;
      this.triangles += entry.triangles;
    });
  }

  // --- camera and light ----------------------------------------------------

  resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.aspect = width / Math.max(1, height);
    this.viewportHeight = height;
    this.fit();
  }

  /**
   * Points the fixed camera at the grid and zooms it until the whole roster
   * fits, with a little air.
   *
   * Done by projecting the stage's world box into *camera space* rather than by
   * arithmetic on the grid, because the camera is tilted 57° and the pieces are
   * over a world unit tall: the thing that has to fit on screen is the box's
   * shadow on the camera plane, and that is not a formula anybody should be
   * asked to keep true by hand.
   */
  private fit(): void {
    const rows = Math.ceil(UNIT_TYPE_IDS.length / COLUMNS);
    const halfX = ((COLUMNS - 1) * COLUMN_GAP) / 2 + PLINTH_RADIUS;
    const halfZ = ((rows - 1) * ROW_GAP) / 2 + PLINTH_RADIUS;
    const tallest = Math.max(...Object.values(VIEW3D.pieces.heights)) + PLINTH_HEIGHT;
    this.bounds.set(
      new Vector3(-halfX, 0, -halfZ),
      // A little extra depth at the near edge: the labels live under the front
      // rim of each plinth and have to be inside the viewport too.
      new Vector3(halfX, tallest, halfZ + 0.55),
    );

    const el = CAMERA.elevation * DEG;
    const az = CAMERA.azimuth * DEG;
    const eye = new Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    ).normalize();

    const center = this.bounds.getCenter(new Vector3());
    this.camera.position.copy(center).addScaledVector(eye, CAMERA.eyeDistance);
    this.camera.lookAt(center);
    this.camera.updateMatrixWorld();

    // Camera-space extent of the eight corners, which is exactly the rectangle
    // the frustum has to cover.
    const inv = this.camera.matrixWorldInverse;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const corner = new Vector3();
    for (const cx of [this.bounds.min.x, this.bounds.max.x]) {
      for (const cy of [this.bounds.min.y, this.bounds.max.y]) {
        for (const cz of [this.bounds.min.z, this.bounds.max.z]) {
          corner.set(cx, cy, cz).applyMatrix4(inv);
          minX = Math.min(minX, corner.x);
          maxX = Math.max(maxX, corner.x);
          minY = Math.min(minY, corner.y);
          maxY = Math.max(maxY, corner.y);
        }
      }
    }

    // Re-centre by sliding the camera along its own right and up axes, so the
    // grid is centred on screen rather than merely inside it.
    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    this.camera.position
      .addScaledVector(right, (minX + maxX) / 2)
      .addScaledVector(up, (minY + maxY) / 2);
    this.camera.updateMatrixWorld();

    const pad = 1.08;
    this.frustum = Math.max(((maxY - minY) / 2) * pad, (((maxX - minX) / 2) * pad) / this.aspect);
    this.camera.left = -this.frustum * this.aspect;
    this.camera.right = this.frustum * this.aspect;
    this.camera.top = this.frustum;
    this.camera.bottom = -this.frustum;
    this.camera.near = 1;
    this.camera.far = CAMERA.eyeDistance * 2.5;
    this.camera.updateProjectionMatrix();

    this.applyLight(center);
    this.onLayout?.();
  }

  private applyLight(center: Vector3): void {
    const el = LOOK.lightElevation * DEG;
    const az = LOOK.lightAzimuth * DEG;
    const direction = new Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    );
    this.key.position.copy(center).addScaledVector(direction, LOOK.lightDistance);
    this.key.target.position.copy(center);
    this.key.target.updateMatrixWorld();

    const extent = this.frustum * LOOK.shadowExtent;
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
    if (this.spin) this.yaw += dt * SPIN_RATE;

    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), this.yaw);
    for (const turntable of this.turntables) turntable.quaternion.copy(turn);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }

  dispose(): void {
    this.running = false;
    this.geometry.dispose();
    this.plinth.dispose();
    this.table.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }
}
