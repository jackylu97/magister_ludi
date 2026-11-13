import {
  AmbientLight, Box3, type BufferGeometry, Color, DirectionalLight, Group, Mesh, type MeshStandardMaterial,
  OrthographicCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { loadSettlementAssets } from '../terrainStudy/settlementAssets.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { NORTH_STAR_HOUSES, NORTH_STAR_TOWN_ASSETS, NORTH_STAR_WORK_ASSETS } from '../terrainStudy/northStarAssets.js';
import { controls, element, slider } from './sheet';

/**
 * Every model of the north-star look on one table: `flair.html?review=northstar`.
 * The houses of the three ages, the hall, the mine, the quarry, the barn and
 * the haystack (`scripts/terrain-study/build_northstar_assets.py`), and the
 * three monuments. Each stands at its authored size under a soft light, with
 * no terrain, so a shape can be judged by itself. A new model of this look is
 * added to the rows below in the pass that ships it.
 */
const ROWS: readonly (readonly [label: string, names: readonly string[]])[] = [
  ['Houses, first age', (NORTH_STAR_HOUSES as string[]).slice(0, 3)],
  ['Houses, middle ages', (NORTH_STAR_HOUSES as string[]).slice(3, 6)],
  ['Houses, late ages', (NORTH_STAR_HOUSES as string[]).slice(6, 9)],
  ['Hall and monuments', ['ns-hall', 'monument-obelisk', 'monument-ziggurat', 'monument-armillary']],
  ['Works', ['ns-mine', 'ns-quarry', 'ns-barn', 'ns-haystack']],
];

export async function drawNorthStarKit(into: HTMLElement): Promise<() => void> {
  const knobs = controls(into);
  const stage = element('div', 'painted-works-stage'), canvas = element('canvas', 'painted-works-canvas');
  canvas.setAttribute('aria-label', 'The models of the north-star look, in rows.');
  const overlay = element('div', 'painted-works-labels');
  stage.append(canvas, overlay); into.append(stage);
  const status = element('p', 'sheet-note', 'Loading the models…'); status.setAttribute('role', 'status'); into.append(status);
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(new Color('#b9c98a'));
  const scene = new Scene(), table = new Group(); scene.add(table);
  scene.add(new AmbientLight('#fff4e2', 1.5));
  const sun = new DirectionalLight('#fff1d6', 2.4); sun.position.set(-3, 6, 4); scene.add(sun);
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 100);
  const columns = Math.max(...ROWS.map(([, names]) => names.length)), spacingX = 1.6, spacingZ = 1.6;
  const pieces: { pivot: Group; label: HTMLElement; at: Vector3 }[] = [];
  let disposed = false, turn = .35, tilt = 50, material: MeshStandardMaterial | undefined;
  const geometries: BufferGeometry[] = [];

  const draw = (): void => {
    if (disposed) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(width, height, false);
    const halfX = columns * spacingX * .5 + .3, halfZ = ROWS.length * spacingZ * .5 + .4;
    const half = Math.max(halfX / (width / height), halfZ * .6);
    camera.left = -half * width / height; camera.right = half * width / height; camera.top = half; camera.bottom = -half;
    const angle = tilt * Math.PI / 180;
    camera.position.set(0, Math.sin(angle) * 20, Math.cos(angle) * 20); camera.lookAt(0, .2, 0); camera.updateProjectionMatrix();
    for (const piece of pieces) piece.pivot.rotation.y = turn;
    renderer.render(scene, camera);
    for (const { label, at } of pieces) {
      const p = at.clone().project(camera);
      label.style.left = `${(p.x * .5 + .5) * width}px`; label.style.top = `${(-p.y * .5 + .5) * height + 6}px`;
    }
  };
  slider(knobs, 'Turn', { min: -3.14, max: 3.14, step: .01, value: turn }, value => value.toFixed(2), value => { turn = value; draw(); });
  slider(knobs, 'Camera tilt', { min: 25, max: 80, step: 1, value: tilt }, value => `${value}°`, value => { tilt = value; draw(); });
  const resize = new ResizeObserver(draw); resize.observe(canvas);
  const dispose = (): void => {
    if (disposed) return; disposed = true;
    resize.disconnect(); for (const geometry of geometries) geometry.dispose(); material?.dispose(); renderer.dispose();
  };
  window.addEventListener('pagehide', dispose, { once: true });
  try {
    const names = [...new Set(ROWS.flatMap(([, row]) => row))];
    const assets = await loadSettlementAssets({ register() {} }, null, { names }) as Record<string, BufferGeometry> & { material: MeshStandardMaterial };
    if (disposed) { for (const name of names) assets[name]?.dispose(); assets.material.dispose(); return dispose; }
    material = assets.material;
    ROWS.forEach(([rowLabel, row], r) => row.forEach((name, i) => {
      const geometry = assets[name]!; geometries.push(geometry);
      const pivot = new Group(), z = (r - (ROWS.length - 1) * .5) * spacingZ, x = (i - (row.length - 1) * .5) * spacingX;
      pivot.position.set(x, 0, z); pivot.add(new Mesh(geometry, assets.material)); table.add(pivot);
      const box = new Box3().setFromBufferAttribute(geometry.getAttribute('position') as never);
      const label = element('span', 'painted-works-label', i === 0 ? `${rowLabel}: ${name}` : name); overlay.append(label);
      pieces.push({ pivot, label, at: new Vector3(x, Math.min(0, box.min.y), z + .55) });
    }));
    status.textContent = `${NORTH_STAR_TOWN_ASSETS.length + NORTH_STAR_WORK_ASSETS.length} new models and the three monuments, at their authored sizes.`;
    draw();
    document.body.dataset.sceneReady = '1';
  } catch (error) {
    status.textContent = `The models could not load: ${error instanceof Error ? error.message : String(error)}`;
    dispose();
  }
  return dispose;
}
