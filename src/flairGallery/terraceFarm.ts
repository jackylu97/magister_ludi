import { Box3, BufferGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMap, getTileAt } from '../sim/map';
import { terraceFarmGeometry } from '../render3d/terraceFarmGeometry';
import { createPaintedLook } from '../render3d/paintedLook.js';
// @ts-expect-error The approved terrain sculpt is shared with the JavaScript study.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';
// @ts-expect-error The approved terrain pigments are shared with the JavaScript study.
import { createTerrainPainter } from '../terrainStudy/terrainPigment.js';
// @ts-expect-error The approved terrain preparation is shared with the JavaScript study.
import { prepareTerrainMap, centre } from '../terrainStudy/surface.js';
import { button, checkbox, controls, element, select } from './sheet';

/** An isolated art proposal: neither the live terrain nor the farm recipe changes. */
export async function drawTerraceFarm(into: HTMLElement): Promise<void> {
  const params = new URLSearchParams(location.search);
  let light = ['morning', 'day', 'golden', 'dusk'].includes(params.get('light') ?? '') ? params.get('light')! : 'golden';
  let detail = params.get('detail') !== 'game', cultivated = true, neighbours = true;
  const knobs = controls(into);
  into.append(element('p', 'sheet-note', 'Broad planted shelves, stone retaining walls and a summit farmhouse. The terraced landform replaces the natural hill within its tile.'));
  const stage = element('div', 'painted-works-stage'), canvas = element('canvas', 'painted-works-canvas terrace-farm-canvas');
  canvas.setAttribute('aria-label', 'Pachacuti terrace farm model. Drag to orbit; scroll to zoom.');
  stage.append(canvas); into.append(stage);
  const status = element('p', 'sheet-note', 'Loading the painted materials…'); into.append(status);
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true;
  const scene = new Scene(), camera = new OrthographicCamera(-3, 3, 2, -2, .1, 80);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = false; orbit.minZoom = .5; orbit.maxZoom = 6;
  orbit.maxPolarAngle = Math.PI * .46;
  const geometries = new Set<BufferGeometry>();
  const own = (g: BufferGeometry): BufferGeometry => { geometries.add(g); return g; };
  let disposed = false, frameId = 0;
  const look = await createPaintedLook(renderer, scene, camera, light);
  const material = new MeshStandardMaterial({ color: '#ffffff', roughness: .95, vertexColors: true, flatShading: true });
  look.registerMaterial(material, { terrain: true });
  const world = new Group(), wild = new Group(), planted = new Group(), surrounding = new Group();
  world.add(wild, planted, surrounding); scene.add(world);
  // Close the cropped display tiles underneath: the full map normally omits
  // interior skirts, which leaves corner slivers when its neighbours are hidden.
  const tileBase = own(new CylinderGeometry(.998, .998, .1, 6));
  const cells = [[2, 2], [1, 2], [3, 2], [1, 1], [2, 1], [1, 3], [2, 3]];
  for (const farm of [false, true]) {
    const map = createMap({ width: 5, height: 5, terrain: 'grassland' });
    for (const tile of map.tiles) tile.moisture = .5;
    getTileAt(map, 2, 2)!.hills = !farm;
    getTileAt(map, 1, 1)!.hills = true; getTileAt(map, 2, 1)!.hills = true;
    getTileAt(map, 2, 3)!.terrain = 'plains';
    const prepared = prepareTerrainMap(map), painter = createTerrainPainter(prepared);
    const origin = centre(prepared.tiles[12]);
    for (const [col, row] of cells) {
      const central = col === 2 && row === 2;
      // One shared surround keeps the comparison about the central tile alone.
      if (!central && !farm) continue;
      const tile = prepared.tiles[row! * map.width + col!];
      const [top, sides] = terrainMesh(tile); sides.dispose(); painter.paint(top, tile);
      const mesh = new Mesh(own(top), look.materials.mergedLand);
      mesh.position.set(-origin.x, 0, -origin.z); mesh.castShadow = mesh.receiveShadow = true;
      const base = new Mesh(tileBase, look.materials.earth), cell = centre(tile);
      base.position.set(cell.x - origin.x, .06, cell.z - origin.z); base.receiveShadow = true;
      (central ? farm ? planted : wild : surrounding).add(base, mesh);
    }
  }
  const terraces = new Group(); planted.add(terraces); terraces.position.y = .055;
  const sculpt = new Mesh(own(terraceFarmGeometry()), material);
  sculpt.castShadow = sculpt.receiveShadow = true; terraces.add(sculpt);
  const house = new Mesh(look.workAssets.house, look.workAssets.material);
  const bounds = new Box3().setFromObject(house), size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
  const scale = .23 / Math.max(size.x, size.z);
  house.scale.setScalar(scale);
  house.position.set(.07 - center.x * scale, .39 - bounds.min.y * scale, -.32 - center.z * scale);
  house.castShadow = house.receiveShadow = true; terraces.add(house);
  const updateURL = () => {
    const url = new URL(location.href); url.searchParams.set('light', light); url.searchParams.set('detail', detail ? 'close' : 'game');
    history.replaceState(null, '', url);
  };
  function draw() {
    frameId = 0;
    if (disposed) return;
    look.setContactDetail(canvas.clientHeight / (camera.top - camera.bottom) * camera.zoom * Math.sqrt(3));
    look.render();
  }
  function invalidate() { if (!disposed && !frameId) frameId = requestAnimationFrame(draw); }
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    const span = detail ? 1.20 : 3.6;
    camera.left = -span * width / height; camera.right = span * width / height;
    camera.top = span; camera.bottom = -span; camera.updateProjectionMatrix();
    look.resize(width, height); invalidate();
  }
  function reset() {
    camera.position.set(2.6, 4.3, 5.4); camera.zoom = 1;
    orbit.target.set(0, .24, 0); orbit.update(); resize(); updateURL();
  }
  function updateModel() {
    planted.visible = cultivated; wild.visible = !cultivated; surrounding.visible = neighbours;
    look.invalidateShadows(); invalidate();
  }
  select(knobs, 'Landform', [['terraces', 'Terrace farm'], ['hill', 'Original hill']], 'terraces', value => { cultivated = value === 'terraces'; updateModel(); });
  select(knobs, 'Scale', [['close', 'Detail'], ['game', 'Game scale']], detail ? 'close' : 'game', value => { detail = value === 'close'; reset(); });
  select(knobs, 'Light', [['morning', 'Morning'], ['day', 'Daylight'], ['golden', 'Golden hour'], ['dusk', 'Dusk']], light, value => { light = value; look.setDaylight(value); updateURL(); invalidate(); });
  checkbox(knobs, 'Surrounding tiles', true, value => { neighbours = value; updateModel(); });
  button(knobs, 'Reset view', reset);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
  orbit.addEventListener('change', invalidate);
  look.fitShadows({ minX: -3, maxX: 3, minZ: -3, maxZ: 3 }, 0);
  updateModel(); reset();
  status.textContent = 'Art mockup · drag to orbit · scroll to zoom. Compare with the original hill or hide surrounding tiles to inspect the model.';
  window.addEventListener('pagehide', () => {
    disposed = true; cancelAnimationFrame(frameId); resizeObserver.disconnect(); orbit.dispose();
    for (const geometry of geometries) geometry.dispose();
    material.dispose(); look.dispose(); renderer.dispose();
  }, { once: true });
}
