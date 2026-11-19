import { VIEW3D } from '../render3d/lookData';
import {
  AmbientLight, Box3, type BufferGeometry, Color, DirectionalLight, Group, InstancedMesh, Matrix4, Mesh, type MeshStandardMaterial,
  OrthographicCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { loadSettlementAssets } from '../terrainStudy/settlementAssets.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { NORTH_STAR_AGED_TOWN_ASSETS, NORTH_STAR_AGED_WORK_ASSETS, NORTH_STAR_GREAT_WORKS, NORTH_STAR_HERDS, NORTH_STAR_HOUSES, NORTH_STAR_TOWN_ASSETS, NORTH_STAR_WORK_ASSETS } from '../terrainStudy/northStarAssets.js';
// @ts-expect-error The reusable terrain art modules remain JavaScript.
import { loadVegetation, VEGETATION_SPECIES } from '../terrainStudy/vegetation.js';
import { controls, element, slider } from './sheet';

/**
 * Every model of the north-star look on one table: `flair.html?review=northstar`.
 * The houses of the three ages, the hall, the mine, the quarry, the barn and
 * the haystack (`scripts/terrain-study/build_northstar_assets.py`), and the
 * three monuments, and the mountains with the saddle of each
 * (`scripts/terrain-study/build_crag_mountains.py`). Each stands at its authored
 * size under a soft light, with no terrain, so a shape can be judged by itself.
 * Then the animals of the herds (`build_northstar_animals.py`) and the six
 * works of the great people (`build_northstar_great_works.py`).
 * A mountain is drawn as the board draws it, on grass: its ledges take the
 * grass's colour. The table is seen from the south at a turn of 0, which is the
 * side a mountain shows on the board. A new model of this look is
 * added to the rows below in the pass that ships it.
 */
/** The mountains the renderer loads now (`NORTH_STAR_CRAGS` picks the set), then the saddle of each. */
const RANGES: readonly string[] = (VEGETATION_SPECIES as { name: string; family: string }[]).filter(row => row.family === 'escarpments').map(row => row.name);
const SADDLE = ' saddle';
/** The ground a mountain on the table stands on: the board's deep grass. */
const RANGE_GROUND = '#86b54a';
type RangeAsset = { geometry: BufferGeometry; shoulderGeometry?: BufferGeometry | null };
type VegetationKit = { broadleaves: RangeAsset[]; cypresses: RangeAsset[]; escarpments: RangeAsset[]; limestone: RangeAsset; rangeMaterial: MeshStandardMaterial; materials: MeshStandardMaterial[] };

/** `rows=mountains` in the URL draws only the five mountains, spaced so that no two overlap from above. */
const selectedRows = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).get('rows');
const ONLY_RANGES = selectedRows === 'mountains';
const ONLY_PILLAGED = selectedRows === 'pillaged';
const PILLAGED_ROWS = [
  ['Grain loft', ['ns-loft-barn', 'ns-pillaged-grain-loft']],
  ['Pasture shelter', ['ns-stable', 'ns-pillaged-pasture']],
  ['Windmill', ['ns-windmill', 'ns-pillaged-windmill']],
  ['Fishing boat', ['fishing-boat', 'ns-pillaged-fishing-boat']],
  ['Mine hoist', ['ns-mine-headframe', 'ns-pillaged-mine-hoist']],
  ['Quarry', ['ns-quarry', 'ns-pillaged-quarry']],
  ['Saw hall', ['ns-saw-hall', 'ns-pillaged-saw-hall']],
] as const;
const ROWS: readonly (readonly [label: string, names: readonly string[]])[] = ONLY_PILLAGED ? PILLAGED_ROWS : ONLY_RANGES ? [['Mountains', RANGES]] : [
  ['Mountains', [...RANGES, ...RANGES.map(name => name + SADDLE)]],
  ['Houses, first age', (NORTH_STAR_HOUSES as string[]).slice(0, 3)],
  ['Houses, middle ages', (NORTH_STAR_HOUSES as string[]).slice(3, 6)],
  ['Houses, late ages', (NORTH_STAR_HOUSES as string[]).slice(6, 9)],
  ['Hall and monuments', ['ns-hall', 'monument-obelisk', 'monument-ziggurat', 'monument-armillary']],
  // A town's centre in the first and second ages, and the richer houses and hall of the late ages (`NORTH_STAR_TOWN_AGES`).
  ['Town centres and late houses by age', NORTH_STAR_AGED_TOWN_ASSETS as string[]],
  // The animals (`build_northstar_animals.py`), a row for the grazing herds and a row for the rest.
  ...(['horses', 'cattle', 'deer'].some(herd => (NORTH_STAR_HERDS as Record<string, string[]>)[herd]) ? [
    ['Herds', ['horses', 'cattle', 'deer'].flatMap(herd => (NORTH_STAR_HERDS as Record<string, string[]>)[herd] ?? [])] as const,
    ['More animals', ['bison', 'camels', 'ivory'].flatMap(herd => (NORTH_STAR_HERDS as Record<string, string[]>)[herd] ?? [])] as const,
  ] : []),
  // The six works of the great people (`build_northstar_great_works.py`).
  ...(Object.keys(NORTH_STAR_GREAT_WORKS as Record<string, string>).length ? [['Great works', Object.values(NORTH_STAR_GREAT_WORKS as Record<string, string>)] as const] : []),
  ['Works', ['ns-mine', 'ns-quarry', 'ns-barn', 'ns-haystack', 'ns-windmill', 'ns-windmill-sails', 'ns-sheaf', 'ns-logs', 'ns-stall']],
  // These working buildings change with the owner's age.
  ['Working buildings by age', NORTH_STAR_AGED_WORK_ASSETS as string[]],
];

function releaseKit(kit: VegetationKit | undefined): void {
  if (!kit) return;
  for (const asset of [...kit.broadleaves, ...kit.cypresses, ...kit.escarpments, kit.limestone]) { asset.geometry.dispose(); asset.shoulderGeometry?.dispose(); }
  for (const each of kit.materials) each.dispose();
}

export async function drawNorthStarKit(into: HTMLElement): Promise<() => void> {
  const knobs = controls(into);
  const stage = element('div', 'painted-works-stage'), canvas = element('canvas', 'painted-works-canvas');
  canvas.setAttribute('aria-label', 'The models of the north-star look, in rows.');
  const overlay = element('div', 'painted-works-labels');
  // The table grows with its rows, so a label never lies on the row in front of it.
  canvas.style.height = `${ONLY_PILLAGED ? 420 : ONLY_RANGES ? 520 : ROWS.length * 170}px`;
  stage.append(canvas, overlay); into.append(stage);
  const status = element('p', 'sheet-note', 'Loading the models…'); status.setAttribute('role', 'status'); into.append(status);
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(new Color('#b9c98a'));
  const scene = new Scene(), table = new Group(); scene.add(table);
  scene.add(new AmbientLight('#fff4e2', 1.5));
  const sun = new DirectionalLight('#fff1d6', 2.4); sun.position.set(-3, 6, 4); scene.add(sun);
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 100);
  const columns = Math.max(...ROWS.map(([, names]) => names.length)), spacingX = ONLY_RANGES ? 2.1 : 1.6, spacingZ = 1.6;
  let selectedPair = 0;
  const pieces: { pivot: Group; label: HTMLElement; at: Vector3; row: number }[] = [];
  // `turn` and `tilt` in the URL set the two sliders' first values, so a screenshot is one URL. A tilt of 90 looks straight down.
  const asked = new URLSearchParams(location.search), given = (key: string, fallback: number): number => asked.has(key) && Number.isFinite(Number(asked.get(key))) ? Number(asked.get(key)) : fallback;
  let disposed = false, turn = given('turn', .35), tilt = Math.min(90, Math.max(25, given('tilt', 50))), material: MeshStandardMaterial | undefined, kit: VegetationKit | undefined;
  const geometries: BufferGeometry[] = [];

  const draw = (): void => {
    if (disposed) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(width, height, false);
    const halfX = columns * spacingX * .5 + .3, halfZ = ROWS.length * spacingZ * .5 + .9;
    // The back row holds the mountains, which stand far taller than a house, so the frame leaves room above it.
    const half = ONLY_PILLAGED ? Math.max(.75, 1.17 * height / width) : ONLY_RANGES ? halfX / (width / height) : Math.max(halfX / (width / height), halfZ * .8);
    camera.left = -half * width / height; camera.right = half * width / height; camera.top = half; camera.bottom = -half;
    const angle = tilt * Math.PI / 180;
    camera.up.set(0, tilt >= 89.5 ? 0 : 1, tilt >= 89.5 ? -1 : 0); camera.position.set(0, Math.sin(angle) * 20, Math.cos(angle) * 20); camera.lookAt(0, .2, 0);
    if (!ONLY_PILLAGED) camera.position.y += .35;
    camera.updateProjectionMatrix();
    for (const piece of pieces) {
      piece.pivot.rotation.y = turn;
      if (ONLY_PILLAGED) {
        piece.pivot.visible = piece.row === selectedPair;
        piece.label.style.display = piece.pivot.visible ? '' : 'none';
      }
    }
    renderer.render(scene, camera);
    for (const { label, at } of pieces) {
      const p = at.clone().project(camera);
      label.style.left = `${(p.x * .5 + .5) * width}px`; label.style.top = `${ONLY_PILLAGED ? height - 36 : (-p.y * .5 + .5) * height + 6}px`;
    }
  };
  if (ONLY_PILLAGED) {
    const label = element('label', undefined, 'Improvement ');
    const select = document.createElement('select');
    for (const [index, [name]] of PILLAGED_ROWS.entries()) select.add(new Option(name, String(index)));
    select.onchange = () => { selectedPair = Number(select.value); draw(); };
    label.append(select);
    knobs.append(label);
  }
  slider(knobs, 'Turn', { min: -3.14, max: 3.14, step: .01, value: turn }, value => value.toFixed(2), value => { turn = value; draw(); });
  slider(knobs, 'Camera tilt', { min: 25, max: 90, step: 1, value: tilt }, value => `${value}°`, value => { tilt = value; draw(); });
  const resize = new ResizeObserver(draw); resize.observe(canvas);
  const dispose = (): void => {
    if (disposed) return; disposed = true;
    resize.disconnect(); for (const geometry of geometries) geometry.dispose(); material?.dispose(); releaseKit(kit); renderer.dispose();
  };
  window.addEventListener('pagehide', dispose, { once: true });
  try {
    const ranges = new Map<string, BufferGeometry>();
    const names = [...new Set(ROWS.flatMap(([, row]) => row))].filter(name => !name.startsWith(RANGES[0]!.replace(/-\d+$/, '')));
    if (ONLY_PILLAGED) names.push('ns-windmill-sails');
    const assets = await loadSettlementAssets({ register() {} }, null, { names }) as Record<string, BufferGeometry> & { material: MeshStandardMaterial };
    if (disposed) { for (const name of names) assets[name]?.dispose(); assets.material.dispose(); return dispose; }
    material = assets.material;
    // The mountains come from the vegetation kit, with the shader the board uses for them.
    if (!ONLY_PILLAGED) {
      const loaded = await loadVegetation({ value: 0 }, null, null) as VegetationKit;
      if (disposed) { releaseKit(loaded); return dispose; }
      kit = loaded;
      RANGES.forEach((name, i) => {
        ranges.set(name, loaded.escarpments[i]!.geometry);
        const saddle = loaded.escarpments[i]!.shoulderGeometry; if (saddle) ranges.set(name + SADDLE, saddle);
      });
    }
    const ground = new Color(RANGE_GROUND);
    ROWS.forEach(([rowLabel, row], r) => row.forEach((name, i) => {
      const range = ranges.get(name), geometry = range ?? assets[name]!;
      if (!range) geometries.push(geometry);
      const pivot = new Group(), z = ONLY_PILLAGED ? 0 : (r - (ROWS.length - 1) * .5) * spacingZ;
      const x = (i - (row.length - 1) * .5) * (ONLY_PILLAGED ? 1.08 : spacingX);
      pivot.position.set(x, 0, z); table.add(pivot);
      if (range) {
        // One instance, because the mountain's shader reads the ground's colour from the instance.
        const mesh = new InstancedMesh(geometry, kit!.rangeMaterial, 1);
        mesh.setMatrixAt(0, new Matrix4()); mesh.setColorAt(0, ground); pivot.add(mesh);
      } else pivot.add(new Mesh(geometry, assets.material));
      if (ONLY_PILLAGED && name === 'ns-windmill') {
        const sails = new Mesh(assets['ns-windmill-sails'], assets.material);
        sails.position.fromArray(VIEW3D.visualTest.works.windmillHub);
        sails.rotation.z = .43;
        pivot.add(sails);
        geometries.push(sails.geometry);
      }
      const box = new Box3().setFromBufferAttribute(geometry.getAttribute('position') as never);
      const caption = name === 'ns-stable' ? 'Pasture shelter, Ages III and IV' : name;
      const labelText = ONLY_PILLAGED ? `${rowLabel} · ${i === 0 ? 'Working' : 'Pillaged'}` : i === 0 ? `${rowLabel}: ${caption}` : caption;
      const label = element('span', 'painted-works-label', labelText); overlay.append(label);
      pieces.push({ pivot, label, row: r, at: new Vector3(x, Math.min(0, box.min.y), z + .55) });
    }));
    status.textContent = ONLY_PILLAGED ? '' : `${NORTH_STAR_TOWN_ASSETS.length + NORTH_STAR_WORK_ASSETS.length} new models, the three monuments and the ${RANGES.length} mountains with their saddles, at their authored sizes.`;
    draw();
    document.body.dataset.sceneReady = '1';
  } catch (error) {
    status.textContent = `The models could not load: ${error instanceof Error ? error.message : String(error)}`;
    dispose();
  }
  return dispose;
}
