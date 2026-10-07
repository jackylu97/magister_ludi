import { CylinderGeometry, Mesh, OrthographicCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PaintedUnitKit } from '../render3d/paintedUnits';
import { createPaintedLook } from '../render3d/paintedLook.js';
import { controls, element, select } from './sheet';

/** Compare sculpts without inventing gameplay stats for an upcoming unit. */
export async function drawElephants(into: HTMLElement): Promise<void> {
  const knobs = controls(into), canvas = element('canvas', 'painted-works-canvas');
  const stage = element('div', 'painted-works-stage'); stage.append(canvas); into.append(stage);
  canvas.setAttribute('aria-label', 'War elephant on the left; siege elephant on the right. Drag to orbit.');
  into.append(element('p', 'sheet-note', 'War elephant · left. Siege elephant · right. Shared ivory carving with an armoured howdah and bolt thrower. Drag to orbit; scroll to zoom.'));
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true;
  const scene = new Scene(), camera = new OrthographicCamera(-2, 2, 1.5, -1.5, .1, 40);
  const orbit = new OrbitControls(camera, canvas); orbit.enableDamping = false;
  orbit.minZoom = .5; orbit.maxZoom = 4; orbit.maxPolarAngle = Math.PI * .47;
  const look = await createPaintedLook(renderer, scene, camera, 'golden');
  const kit = new PaintedUnitKit(material => look.registerMaterial(material));
  const base = new CylinderGeometry(.82, .82, .06, 6);
  for (const [index, type] of (['warElephant', 'siegeElephant'] as const).entries()) {
    const model = kit.resolve({ type })!, piece = new Mesh(model.geometry, kit.material(model, 0x9c4435));
    piece.position.set(index ? .88 : -.88, .035, 0); piece.rotation.y = model.yaw;
    piece.castShadow = piece.receiveShadow = true; scene.add(piece);
    const tile = new Mesh(base, look.materials.earth); tile.position.x = piece.position.x;
    tile.receiveShadow = true; scene.add(tile);
  }
  let disposed = false, frame = 0;
  function invalidate() {
    if (!disposed && !frame) frame = requestAnimationFrame(() => { frame = 0; look.render(); });
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.left = -1.6 * w / h; camera.right = 1.6 * w / h;
    camera.top = 1.6; camera.bottom = -1.6; camera.updateProjectionMatrix();
    look.resize(w, h); invalidate();
  }
  select(knobs, 'Light', [['day', 'Daylight'], ['golden', 'Golden hour'], ['dusk', 'Dusk']], 'golden', value => { look.setDaylight(value); invalidate(); });
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  orbit.addEventListener('change', invalidate);
  camera.position.set(2.5, 2.7, 5.6); orbit.target.set(0, .52, 0); orbit.update();
  look.fitShadows({ minX: -2, maxX: 2, minZ: -1, maxZ: 1 }, 0); resize();
  window.addEventListener('pagehide', () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect(); orbit.dispose();
    base.dispose(); kit.dispose(); look.dispose(); renderer.dispose();
  }, { once: true });
}
