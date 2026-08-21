/**
 * The renderer, the lights, and the swap-in-a-new-board plumbing.
 *
 * Lighting is the entire look, so it is worth being explicit about the recipe:
 * one warm directional key (the sun, ~2900K-ish), one cool hemisphere fill
 * (sky above, warm bounce off the ground below), and a small flat ambient so
 * nothing ever goes fully unlit. The key is warm and the fill is cool because
 * that temperature split is what makes a flat-shaded facet read as *lit*
 * rather than merely coloured — the shadowed band is not just darker, it is a
 * different colour, and the toon ramp's hard edge between them is where the
 * illustration quality comes from.
 *
 * Shadows do a disproportionate amount of the work. The contact shadow under a
 * tree or a game piece is what glues it to the tile; without it every
 * decoration floats and the board looks like a sticker sheet. The shadow camera
 * is therefore kept *tight* — it tracks the pan target and scales with zoom, so
 * a 2048² map covers only the visible region and stays sharp instead of being
 * stretched over an 80×52 board.
 *
 * Rendering is on demand. Nothing in this scene animates, so a frame is drawn
 * only when the camera moved, a slider moved, or the board was rebuilt. Idle
 * cost is a `requestAnimationFrame` that returns immediately.
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  PCFSoftShadowMap,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

import { type BuiltBoard } from './board';
import { DioramaCamera } from './camera';
import { LIGHTS, LOOK_DEFAULTS, PALETTE } from './palette';
import { MaterialLibrary } from './toon';

const DEG = Math.PI / 180;
/** How far up the key light sits. Ortho shadow camera, so this is just framing. */
const LIGHT_DISTANCE = 60;

export interface LookParams {
  lightAzimuth: number;
  lightElevation: number;
  outline: number;
  rampSteps: number;
  saturation: number;
  shadows: boolean;
}

export class Proto3DScene {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly view = new DioramaCamera();
  readonly materials: MaterialLibrary;

  private readonly key: DirectionalLight;
  private readonly hemi: HemisphereLight;
  private readonly ambient: AmbientLight;
  private board: BuiltBoard | null = null;
  private dirty = true;
  private running = true;
  private look: LookParams = { ...LOOK_DEFAULTS };
  /** Rolling average of frame time, so the panel can report something honest. */
  private frameMs = 0;
  private lastFrameAt = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // No tone mapping: the palette is already muted, and a filmic curve would
    // pull the highlights grey and undo the work.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.scene.background = new Color(PALETTE.sky);
    // No fog. It was tried and removed: `Fog` measures distance from the
    // camera, and an orthographic eye sits an arbitrary 240 units back from
    // the board (distance being meaningless to an ortho projection), so any
    // range tuned to look right on the board also washed the entire scene out
    // to the background colour. Aerial perspective on an ortho camera would
    // have to be driven by world height or by depth from the target plane, and
    // this board is far too shallow to need it.

    this.materials = new MaterialLibrary(LOOK_DEFAULTS.rampSteps, PALETTE.ink);
    this.materials.outlineWidth.value = LOOK_DEFAULTS.outline;

    this.key = new DirectionalLight(LIGHTS.keyColor, LIGHTS.keyIntensity);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    // Small negative bias plus a normal bias: the flat hex tops are large
    // coplanar surfaces and are exactly where shadow acne shows first.
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.035;
    this.scene.add(this.key);
    this.scene.add(this.key.target);

    this.hemi = new HemisphereLight(LIGHTS.skyColor, LIGHTS.groundColor, LIGHTS.hemiIntensity);
    this.scene.add(this.hemi);

    this.ambient = new AmbientLight(LIGHTS.ambientColor, LIGHTS.ambientIntensity);
    this.scene.add(this.ambient);

    this.applyLight();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // --- board ---------------------------------------------------------------

  /** Swaps in a freshly built board, disposing the old one. */
  setBoard(board: BuiltBoard, refit: boolean): void {
    if (this.board) {
      this.scene.remove(this.board.group);
      this.board.dispose();
    }
    this.board = board;
    this.scene.add(board.group);
    this.view.setBounds(board.bounds);
    if (refit) {
      // Open zoomed in on a start position rather than fitted to the whole
      // board. Fitting a standard map puts a tile at eight pixels across,
      // which tells you nothing about a look built out of facets and contact
      // shadows — the question this page exists to answer is asked close up.
      this.view.resetZoom();
      this.view.lookAtPoint(board.focus);
    }
    this.invalidate();
  }

  // --- look ----------------------------------------------------------------

  get params(): LookParams {
    return { ...this.look };
  }

  setLook(patch: Partial<LookParams>): void {
    const next = { ...this.look, ...patch };
    if (next.rampSteps !== this.look.rampSteps) this.materials.setRampSteps(next.rampSteps);
    if (next.saturation !== this.look.saturation) this.materials.setSaturation(next.saturation);
    this.materials.outlineWidth.value = next.outline;
    this.renderer.shadowMap.enabled = next.shadows;
    if (next.shadows !== this.look.shadows) {
      // Toggling the shadow map invalidates every compiled program that
      // sampled it; three needs telling explicitly.
      this.scene.traverse((object) => {
        const material = (object as { material?: unknown }).material;
        if (!material) return;
        for (const m of Array.isArray(material) ? material : [material]) {
          (m as { needsUpdate?: boolean }).needsUpdate = true;
        }
      });
    }
    this.look = next;
    this.applyLight();
    this.invalidate();
  }

  private applyLight(): void {
    const el = this.look.lightElevation * DEG;
    const az = this.look.lightAzimuth * DEG;
    const direction = new Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    );
    this.key.position.copy(this.view.target).addScaledVector(direction, LIGHT_DISTANCE);
    this.key.target.position.copy(this.view.target);
    this.key.target.updateMatrixWorld();

    // Track the visible region rather than the whole map. On a standard map
    // this is the difference between crisp contact shadows and mush.
    const extent = this.view.radius * 1.9;
    const shadow = this.key.shadow.camera;
    shadow.left = -extent;
    shadow.right = extent;
    shadow.top = extent;
    shadow.bottom = -extent;
    shadow.near = 1;
    shadow.far = LIGHT_DISTANCE * 2.5;
    shadow.updateProjectionMatrix();
  }

  // --- frame ---------------------------------------------------------------

  invalidate(): void {
    this.dirty = true;
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.view.resize(width, height);
    this.invalidate();
  }

  /** Milliseconds spent in the last drawn frame, smoothed. For the panel. */
  get lastFrameMs(): number {
    return this.frameMs;
  }

  get stats(): { tiles: number; draws: number } {
    return { tiles: this.board?.tileCount ?? 0, draws: this.board?.drawCalls ?? 0 };
  }

  private loop(): void {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (!this.dirty) return;
    this.dirty = false;
    // The light rig follows the pan target, so it must be recomputed on any
    // frame the camera could have moved — which is every frame we draw.
    this.applyLight();
    const started = performance.now();
    this.renderer.render(this.scene, this.view.camera);
    const elapsed = performance.now() - started;
    this.frameMs = this.lastFrameAt === 0 ? elapsed : this.frameMs * 0.8 + elapsed * 0.2;
    this.lastFrameAt = started;
  }

  dispose(): void {
    this.running = false;
    if (this.board) this.board.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }
}
