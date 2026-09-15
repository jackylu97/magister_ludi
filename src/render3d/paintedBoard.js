import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terrainMesh } from '../terrainStudy/terrainMesh.js';
import { terrainColors, createTerrainPainter } from '../terrainStudy/terrainPigment.js';
import { createWaterPainter } from '../terrainStudy/waterPigment.js';
import { waterDetails, shoreStones } from '../terrainStudy/water.js';
import { featureDetails } from '../terrainStudy/features.js';
import { sculptedTurf } from '../terrainStudy/turf.js';
import { openLandTree, stoneCluster } from '../terrainStudy/groundDressing.js';
import { createMountainRanges } from '../terrainStudy/mountainRanges.js';
import { indexGeometry } from '../terrainStudy/indexGeometry.js';
import { centre, isWater, neighbour, onTileTop, surfaceHeight, prepareTerrainMap } from '../terrainStudy/surface.js';
import { createPaintedFog, paintedFogMaterial, paintedFogDepth } from './paintedFog.js';
import { VIEW3D } from './lookData';

const axis = new T.Vector3(0, 1, 0);
const NEVER = 0, CLUTTER = 1, DECOR = 2;
function hash(a, b, n = 0) {
  let x = Math.imul(a + 53, 374761393) ^ Math.imul(b + 71, 668265263) ^ Math.imul(n + 1, 1274126177);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** Build only from a real map and ready assets. No study plans, DOM or loaders. */
export function buildPaintedBoard(map, assets, materials, shadows = true, prepared = null, progress = () => {}, preparedMap = null) {
  const renderMap = preparedMap || prepareTerrainMap(map, { wrap: true });
  const group = new T.Group();
  group.name = 'painted-board';
  const period = Math.sqrt(3) * map.width;
  const copies = [-period, 0, period].map(offset => {
    const copy = new T.Group(); copy.position.x = offset; group.add(copy); return copy;
  });
  const fog = createPaintedFog(map.width, map.height);
  const CellArray = map.tiles.length <= 65536 ? Uint16Array : Float32Array;
  const ownedGeometry = new Set(), ownedMaterials = new Map(), depthMaterials = new Map();
  const pickMeshes = [], nearProps = [], farProps = [], visibilityBatches = [];
  const sources = new Map(), instanceBases = new WeakMap();
  const chunks = new Map(), mapProps = new Map(), mapSurfaces = new Map();
  const ranges = prepared ? null : createMountainRanges(renderMap);
  const painter = prepared ? null : createTerrainPainter(renderMap, ranges), waterPainter = prepared ? null : createWaterPainter(renderMap);
  const ground = materials.ground, water = materials.water, features = materials.features;
  const terrainMaterials = new Set([...Object.values(ground), water.river]);
  const waterMaterials = new Set([ground.ocean, ground.coast, ground.lake, water.river]);
  const detailMaterials = new Set([...Object.values(water).filter(m => m !== water.river),
    ...Object.values(features).filter(m => m !== features.stone && m !== features.shrub)]);
  const treedCells = renderMap.tiles.flatMap((tile, i) => ['forest', 'jungle'].includes(tile.feature) ? [i] : []);
  // Three questions, three flags. `showingDistant` is what the zoom asks of the
  // colour pass; `bakingDetail` is the static sun's answer to the same question,
  // which is always "near" — the far batches cast no shadow at all, so a bake
  // taken at far LOD would come back empty. `drawingDistant` is only the memo of
  // what the batches are currently set to, so a flip that changes nothing costs
  // nothing. See `setBakeDetail` for why the two may now disagree.
  let instanceCount = 0, showingDistant = false, bakingDetail = false, drawingDistant = false, disposed = false;

  function showBatch(batch) {
    const visible = batch.charted && (batch.detail === 'always' || (batch.detail === 'far') === drawingDistant);
    for (const mesh of batch.meshes) mesh.visible = visible;
  }
  function applyDetail() {
    const distant = showingDistant && !bakingDetail;
    if (drawingDistant === distant) return false;
    drawingDistant = distant;
    for (const batch of visibilityBatches) showBatch(batch);
    return true;
  }
  function refreshVisibility() {
    // Shader discard still handles individual cells, clearing and reservations.
    // A wholly unexplored batch contributes neither colour nor shadow depth.
    for (const batch of visibilityBatches) {
      batch.charted = batch.cells.some(cell => fog.visible(cell));
      showBatch(batch);
    }
  }

  // Attribution reads off the mesh, never off a map held somewhere else: a prop
  // is the sculpt it was instanced from, a surface batch is the merged material
  // it belongs to. Cloned wrap copies keep the string, which is why it is one.
  const materialNames = new Map([[materials.earth, 'earth'], [materials.mergedLand, 'merged land'],
    [materials.mergedWater, 'merged water'], [materials.mergedDetails, 'merged details']]);
  for (const [group, entries] of [['ground', ground], ['water', water], ['feature', features]])
    for (const [key, source] of Object.entries(entries)) if (!materialNames.has(source)) materialNames.set(source, `${group} ${key}`);
  // The map-scale stand-ins, by the sculpt each stands in for. A family without
  // one is simply absent here and draws its own sculpt at every distance.
  const distantGeometry = new Map();
  for (const asset of [...assets.broadleaves, ...assets.cypresses, ...assets.escarpments, assets.limestone]) {
    if (asset.farGeometry) distantGeometry.set(asset.geometry, asset.farGeometry);
    if (asset.shoulderGeometry && asset.farShoulderGeometry) distantGeometry.set(asset.shoulderGeometry, asset.farShoulderGeometry);
  }
  function familyName(source, base) {
    const sculpt = base?.userData?.paintedAsset;
    if (sculpt) return source === assets.rangeMaterial ? `range ${sculpt}` : sculpt;
    return materialNames.get(source) || 'unnamed';
  }
  /**
   * What a vertex that no longer carries an attribute reads as.
   *
   * Three leaves a program attribute the geometry does not supply at whatever
   * the context's generic value happens to be unless the material names one, so
   * the zero the fog shader's reservation test relies on is stated here rather
   * than inherited. `uv` is on the list for the same reason, one layer down: the
   * bump path is re-pointed at the position below, but the stock `vUv` line is
   * still compiled in and would otherwise read a value nobody set.
   */
  const SURFACE_DEFAULTS = {paintedReservationDistance: [0], uv: [0, 0]};
  /**
   * The merged land's pigment `uv`, computed instead of stored (#10).
   *
   * `normalize` used to write `position.xz * .6` into eight bytes a vertex —
   * some twenty-seven mebibytes on a standard map — for one reader: the mineral
   * bump map three samples at `vBumpMapUv`. The name three builds that varying
   * from is a macro, so re-pointing the macro at the coordinate the shader
   * already has gives the identical value at the identical cost of nothing:
   * `bumpMapTransform` is the identity here (no repeat, no offset), and a
   * quantity linear in `position` interpolates exactly as the attribute did.
   * Only the merged land wears a bump map; nothing else on the board asks.
   */
  function deriveSurfaceUv(material) {
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.vertexShader = `#undef BUMPMAP_UV\n#define BUMPMAP_UV (position.xz * .6)\n${shader.vertexShader}`;
    };
    material.customProgramCacheKey = () => `${key()}:painted-derived-uv`;
    return material;
  }
  function materialFor(source) {
    if (!ownedMaterials.has(source)) {
      const material = paintedFogMaterial(source, fog, source === materials.mergedWater);
      material.defaultAttributeValues = {...material.defaultAttributeValues, ...SURFACE_DEFAULTS};
      if (source === materials.mergedLand) deriveSurfaceUv(material);
      ownedMaterials.set(source, material); sources.set(material, source);
    }
    return ownedMaterials.get(source);
  }
  function decorateMesh(mesh, source, castShadow) {
    // What this batch casts when shadows are *on* is a fact about the batch —
    // the ground and the standing stone throw a shadow, the far clones and the
    // water do not — and is kept apart from whether shadows are on at all, so
    // the switch is a flag written over a built board rather than a rebuild.
    mesh.userData.paintedCasts = !!castShadow;
    // What it *receives* is a fact about the batch too, and `receiveShadow`
    // compiles the shadow sampling chunks into that batch's program: every
    // fragment it covers then pays a PCF lookup against the sun's map. The
    // detail pigment — riverbanks, foam, shallows, oasis pools, reeds, the
    // floodplain's fertile marks — is a thin decal lying on ground that is
    // already sampling the same shadow directly underneath it, and turning it
    // off moved not one pixel at either zoom (`.claude/scratch/p9`, four pairs).
    //
    // The water keeps it. It reads as a flat surface and the temptation is to
    // treat it the same way, but a headland's shadow falling across a river or a
    // lake edge is drawn *on the water* — take the flag away and the band over
    // the blue disappears (measured: 634 pixels at play, and the picture is
    // plainly worse). The audit called this an art call, and that is the call.
    mesh.receiveShadow = source !== materials.mergedDetails;
    mesh.castShadow = shadows && !!castShadow;
    const shared = source === materials.mergedWater, key = `${source.side}:${shared}`;
    if (!depthMaterials.has(key)) {
      const depth = paintedFogDepth(fog, source.side, shared);
      // The depth pass reads the same reservation the colour pass does, so it
      // takes the same stated zero for the attribute the surfaces dropped.
      depth.defaultAttributeValues = {...depth.defaultAttributeValues, ...SURFACE_DEFAULTS};
      depthMaterials.set(key, depth);
    }
    mesh.customDepthMaterial = depthMaterials.get(key);
  }
  function addCopies(mesh, list, surface = false, detail = 'always', preparedCells = null) {
    const cells = new Set(), meshes = [];
    if (!preparedCells) for (const name of ['paintedCell', 'paintedOther']) {
      const attribute = mesh.geometry.getAttribute(name);
      if (attribute) for (let i = 0; i < attribute.count; i++) cells.add(attribute.getX(i));
    }
    for (const copy of copies) {
      const placed = copy === copies[1] ? mesh : mesh.clone();
      placed.customDepthMaterial = mesh.customDepthMaterial;
      copy.add(placed); if (list) list.push(placed);
      meshes.push(placed);
      if (surface) { placed.userData.paintedSurface = true; pickMeshes.push(placed); }
    }
    // Include both banks of shared river sectors, even across chunk/wrap edges.
    const batch = { cells: preparedCells || [...cells], meshes, detail, surface, charted: false,
      casts: !!mesh.userData.paintedCasts };
    visibilityBatches.push(batch); showBatch(batch);
  }
  function normalize(geometry, cell, grade, turfStrength, material) {
    if (geometry.index) { const source = geometry; geometry = source.toNonIndexed(); source.dispose(); }
    const p = geometry.getAttribute('position'), count = p.count;
    let color = geometry.getAttribute('color');
    if (!color) { color = new T.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3); geometry.setAttribute('color', color); }
    if (material && !geometry.userData.pigmentBaked) for (let i = 0; i < count; i++)
      color.setXYZ(i, color.getX(i) * material.color.r, color.getY(i) * material.color.g, color.getZ(i) * material.color.b);
    // A uniform attribute layout keeps features, folds and painted top faces
    // in the same chunk instead of creating a draw call for each hex.
    geometry.setAttribute('paintedCell', new T.BufferAttribute(new CellArray(count).fill(cell), 1));
    geometry.setAttribute('paintedOther', geometry.getAttribute('paintedCell'));
    geometry.setAttribute('paintedSuppress', new T.BufferAttribute(new Uint8Array(count).fill(grade), 1));
    // No `paintedReservationDistance` and no `uv` (#10, and see `SURFACE_DEFAULTS`
    // and `deriveSurfaceUv`): a footprint reservation is a rule about *props*
    // standing near a building, so on a surface batch the attribute was four
    // million zeroes, and the pigment's `uv` is `position.xz * .6` — a function
    // of a coordinate the vertex shader already has. Both are supplied where
    // they are read instead of stored per vertex.
    geometry.setAttribute('turfWeight', new T.Float32BufferAttribute(new Float32Array(count).fill(turfStrength), 1));
    return geometry;
  }
  function batchMesh(source, list, surface = false, detail = 'always') {
    const geometry = mergeGeometries(list);
    for (const piece of list) piece.dispose();
    if (!geometry) throw new Error('Painted terrain batch has incompatible attributes');
    // Each batch has one material. Its unused inputs need not occupy vertex
    // memory; retained coordinates, normals and pigments remain bit-identical.
    if (source !== materials.mergedLand) geometry.deleteAttribute('turfWeight');
    if (source !== materials.mergedWater) geometry.deleteAttribute('paintedOther');
    indexGeometry(geometry); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); ownedGeometry.add(geometry);
    const mesh = new T.Mesh(geometry, materialFor(source));
    mesh.userData.paintedFamily = familyName(source, null);
    decorateMesh(mesh, source, source === materials.earth || source === materials.mergedLand || source === features.stone || source === features.shrub);
    if (detail === 'far') mesh.castShadow = mesh.userData.paintedCasts = false;
    const placed = []; addCopies(mesh, placed, surface, detail); return placed;
  }
  function propMeshes(batches, target, distant) {
    for (const { geometry: original, material, matrices, tints, cells, grades, reservationDistances } of batches.values()) {
      // Instance-specific ownership must not be attached to the shared asset.
      // The geometry view shares immutable vertex buffers with that asset.
      const geometry = new T.BufferGeometry();
      instanceBases.set(geometry, original);
      for (const [name, attribute] of Object.entries(original.attributes)) geometry.setAttribute(name, attribute);
      geometry.setIndex(original.index); geometry.boundingBox = original.boundingBox?.clone() || null;
      geometry.boundingSphere = original.boundingSphere?.clone() || null;
      geometry.setAttribute('paintedCell', new T.InstancedBufferAttribute(new CellArray(cells), 1));
      geometry.setAttribute('paintedSuppress', new T.InstancedBufferAttribute(new Uint8Array(grades), 1));
      geometry.setAttribute('paintedReservationDistance', new T.InstancedBufferAttribute(new Float32Array(reservationDistances), 1));
      ownedGeometry.add(geometry);
      const mesh = new T.InstancedMesh(geometry, materialFor(material), matrices.length);
      mesh.userData.paintedFamily = familyName(material, original);
      matrices.forEach((matrix, i) => { mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, tints[i]); });
      mesh.computeBoundingSphere(); decorateMesh(mesh, material, !distant); mesh.visible = !distant;
      const mountainPick = !distant && material === assets.rangeMaterial;
      if (mountainPick) mesh.userData.paintedPickOnly = true;
      const first = target.length;
      addCopies(mesh, target, false, distant ? 'far' : 'near');
      if (mountainPick) for (const placed of target.slice(first)) {
        // Attach after cloning: Object3D serializes userData and would drop
        // this predicate, letting hidden peaks intercept visible ground.
        placed.userData.paintedCellVisible = (cell, grade = 0) => fog.visible(cell, grade);
        pickMeshes.push(placed);
      }
      if (!distant) instanceCount += matrices.length * copies.length;
    }
  }
  if (prepared) {
    for (const batch of prepared) {
      const {geometry, source, matrix, color, count, detail, surface, mountainPick, base, castShadow} = batch;
      ownedGeometry.add(geometry);
      if (base) instanceBases.set(geometry, base);
      const mesh = matrix ? new T.InstancedMesh(geometry, materialFor(source), count) : new T.Mesh(geometry, materialFor(source));
      mesh.userData.paintedFamily = familyName(source, base);
      if (matrix) { mesh.instanceMatrix = matrix; mesh.instanceColor = color; mesh.computeBoundingSphere(); }
      decorateMesh(mesh, source, castShadow);
      if (mountainPick) mesh.userData.paintedPickOnly = true;
      const placed = []; addCopies(mesh, placed, surface, detail, batch.cells);
      if (mountainPick) for (const copy of placed) {
        copy.userData.paintedCellVisible = (cell, grade = 0) => fog.visible(cell, grade);
        pickMeshes.push(copy);
      }
      if (matrix && detail === 'near') instanceCount += count * copies.length;
    }
  } else {
    for (const tile of renderMap.tiles) {
      const key = `${Math.floor(tile.col / 6)},${Math.floor(tile.row / 6)}`;
      if (!chunks.has(key)) chunks.set(key, []); chunks.get(key).push(tile);
    }
    let completed = 0;
    for (const tiles of chunks.values()) {
      const surfaces = new Map(), farSurfaces = new Map(), props = new Map();
      let cell = 0, activeTile;
      function push(source, geometry, farGeometry, grade = NEVER, bucket = surfaces) {
        if (bucket === surfaces && terrainMaterials.has(source) && !waterMaterials.has(source))
          push(source, farGeometry || geometry.clone(), undefined, grade, farSurfaces);
        if (!geometry.getAttribute('position').count) { geometry.dispose(); return; }
        if (waterMaterials.has(source)) waterPainter.paint(geometry);
        const turf = source === ground.grassland ? 1 : [ground.plains, ground.oasis, ground.floodplain].includes(source) ? .65 : source === ground.tundra ? .3 : 0;
        const merge = terrainMaterials.has(source) || detailMaterials.has(source);
        geometry = normalize(geometry, cell, grade, turf, merge ? source : null);
        if (source === water.river && activeTile.riverEdges) {
          // The flat underlay consists of six triangular edge sectors. Keep
          // each river sector while either bank is charted, without granting
          // the neighbouring bank visibility over any terrain or decoration.
          const p = geometry.getAttribute('position'), otherCells = new CellArray(p.count).fill(cell), c = centre(activeTile);
          for (let i = 0; i < p.count; i += 3) {
            const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3 - c.x;
            const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3 - c.z;
            const direction = (Math.round(Math.atan2(z, x) * 3 / Math.PI) + 6) % 6;
            if (!(activeTile.riverEdges & (1 << direction))) continue;
            const other = neighbour(activeTile, renderMap, direction);
            if (other) otherCells.fill(other.row * map.width + other.col, i, i + 3);
          }
          geometry.setAttribute('paintedOther', new T.BufferAttribute(otherCells, 1));
        }
        const material = !merge ? source : detailMaterials.has(source) ? materials.mergedDetails : waterMaterials.has(source) ? materials.mergedWater : materials.mergedLand;
        if (!bucket.has(material)) bucket.set(material, []); bucket.get(material).push(geometry);
      }
      function prop(geometry, material, x, y, z, sx, sy, sz, angle = 0, tint = 0xffffff, grade = CLUTTER) {
        if (!geometry) return;
        const matrix = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromAxisAngle(axis, angle), new T.Vector3(sx, sy, sz));
        const color = tint?.isColor ? tint : new T.Color(tint);
        // At overview zoom a whole-map instance sphere touches all three wrap
        // copies and submits every tree three times. Coarser spatial batches
        // retain the study's low draw count while culling those unseen copies.
        // The far copy also stands the family's map-scale sculpt where one
        // exists: same place, same pose, same pigment, a tenth of the facets.
        const farKey = `${Math.floor(activeTile.col / 18)},${Math.floor(activeTile.row / 18)}`;
        if (!mapProps.has(farKey)) mapProps.set(farKey, new Map());
        for (const [batches, sculpt] of [[props, geometry], [mapProps.get(farKey), distantGeometry.get(geometry) || geometry]]) {
          const key = sculpt.uuid + material.uuid;
          if (!batches.has(key)) batches.set(key, { geometry: sculpt, material, matrices: [], tints: [], cells: [], grades: [], reservationDistances: [] });
          const batch = batches.get(key); batch.matrices.push(matrix); batch.tints.push(color); batch.cells.push(cell); batch.grades.push(grade);
          const c = centre(activeTile);
          batch.reservationDistances.push(grade === NEVER ? 0 : 1 + Math.hypot(x-c.x,z-c.z));
        }
      }
      for (const t of tiles) {
        cell = t.row * map.width + t.col; activeTile = t;
        const [top, skirt] = terrainMesh(t); painter.paint(top, t);
        let farTop;
        if (!isWater(t)) { const far = terrainMesh(t, { distant: true }); farTop = far[0]; far[1].dispose(); painter.paint(farTop, t); }
        push(ground[['floodplain', 'oasis'].includes(t.feature) ? t.feature : t.terrain], top, farTop);
        push(materials.earth, skirt);
        waterDetails(t, renderMap, push, water);
        featureDetails(t, (m, g) => push(m, g, undefined, m === features.shrub ? DECOR : [features.stone, features.reeds].includes(m) ? CLUTTER : NEVER), features, hash);
        sculptedTurf(t, (m, g) => push(m, g, undefined, CLUTTER), ground[t.terrain], hash);
        const c = centre(t);
        for (const piece of ranges.pieces.get(t) || []) {
          const rock = piece.asset === 'talus' ? assets.limestone : assets.escarpments[piece.variant];
          prop(piece.asset === 'shoulder' ? rock.shoulderGeometry : rock.geometry, assets.rangeMaterial,
            piece.x, piece.y, piece.z, piece.sx, piece.sy, piece.sz, piece.angle, new T.Color(terrainColors[piece.biome]), piece.kind === 'summit' ? NEVER : DECOR);
        }
        for (const r of stoneCluster(t, hash)) prop(assets.limestone.geometry, assets.limestone.material, c.x + r.x, r.y - .008, c.z + r.z, r.s, r.s * .45, r.s * .80, r.angle, new T.Color('#dbe0c7'));
        for (const r of shoreStones(t, renderMap, hash)) prop(assets.limestone.geometry, assets.limestone.material, c.x + r.x, r.y, c.z + r.z, r.s, r.s * .70, r.s * .85, r.angle, new T.Color('#dbe0cf'));
        const sapling = openLandTree(t, hash);
        if (sapling) {
          const variant = Math.floor(t.col / 6) + Math.floor(t.row / 6) * 2;
          const tree = sapling.cypress ? assets.cypresses[variant % 2] : assets.broadleaves[variant % 3], s = sapling.scale;
          prop(tree.geometry, tree.material, c.x + sapling.x, sapling.y - .008, c.z + sapling.z, s * (sapling.cypress ? 1.15 : 1), s * .92, s * (sapling.cypress ? 1.15 : 1), sapling.angle, new T.Color('#d7e5c5'), DECOR);
        }
        if (t.terrain === 'grassland' && hash(t.col, t.row, 700) > .65) {
          const angle = hash(t.col, t.row, 710) * 6.28;
          for (let i = 0; i < 3; i++) {
            const x = Math.cos(angle) * .5 + Math.sin(i * 3) * .13, z = Math.sin(angle) * .5 + Math.cos(i * 3) * .13;
            if (!onTileTop(t, x, z, .09)) continue;
            const s = .10 + hash(t.col, t.row, 720 + i) * .06;
            prop(assets.broadleaf.geometry, assets.broadleaf.material, c.x + x, surfaceHeight(t, x, z) - s * .45, c.z + z, s * 1.2, s * .75, s * 1.2, angle + i, 0xffffff, CLUTTER);
          }
        }
        if (!isWater(t) && t.terrain !== 'mountain' && ['forest', 'jungle'].includes(t.feature)) {
          for (let i = 0; i < 5; i++) {
            const a = hash(t.col, t.row, i + 90) * 6.28, d = Math.sqrt(hash(t.col, t.row, i + 110)) * .72;
            const x = Math.cos(a) * d, z = Math.sin(a) * d;
            if (!onTileTop(t, x, z, .1)) continue;
            const hero = i === 1 && hash(t.col, t.row, 75) > .55, s = hero ? .68 : .32 + hash(t.col, t.row, i + 140) * .24;
            const variant = Math.floor(t.col / 6) + Math.floor(t.row / 6) * 2;
            const tree = i % 3 === 0 ? assets.cypresses[variant % 2] : assets.broadleaves[variant % 3];
            const warm = i % 3 !== 0 && t.feature !== 'jungle' && t.terrain !== 'snow' && hash(t.col, t.row, 170 + i) > .91;
            const tint = warm ? new T.Color(2.55, .48, .5) : new T.Color([0xffffff, 0xc3dec9, 0xd6ddbd][i % 3]);
            prop(tree.geometry, tree.material, c.x + x, surfaceHeight(t, x, z) - .012, c.z + z,
              s * (i % 3 === 0 ? 1.5 : hero ? 1.13 : 1), s * (i % 3 === 0 ? 1.05 : .93), s * (i % 3 === 0 ? 1.5 : 1), a, tint, DECOR);
          }
        }
      }
      for (const [material, list] of surfaces) {
        batchMesh(material, list, material === materials.mergedLand || material === materials.mergedWater,
          farSurfaces.has(material) ? 'near' : 'always');
        if (farSurfaces.has(material)) {
          // The overview uses the exact same distant faces in larger spatial
          // batches. Close views and static shadow baking retain 6×6 chunks.
          const key = `${Math.floor(tiles[0].col / 18)},${Math.floor(tiles[0].row / 18)}`;
          if (!mapSurfaces.has(key)) mapSurfaces.set(key, new Map());
          const batches = mapSurfaces.get(key);
          if (!batches.has(material)) batches.set(material, []);
          batches.get(material).push(...farSurfaces.get(material));
        }
      }
      propMeshes(props, nearProps, false);
      progress(++completed, chunks.size);
    }
    for (const batches of mapSurfaces.values())
      for (const [material, list] of batches) batchMesh(material, list, false, 'far');
    for (const batches of mapProps.values()) propMeshes(batches, farProps, true);
  }
  group.updateMatrixWorld(true);
  // Board transforms never animate. Match the study's static matrix path;
  // fog and LOD change visibility/attributes without walking these matrices.
  group.traverse(object => { object.matrixAutoUpdate = false; object.matrixWorldAutoUpdate = false; });
  const buffers = new Set();
  for (const geometry of ownedGeometry) {
    for (const attribute of Object.values(geometry.attributes)) buffers.add(attribute.array);
    if (geometry.index) buffers.add(geometry.index.array);
  }
  const geometryBytes = [...buffers].reduce((bytes, array) => bytes + array.byteLength, 0);
  let instanceBytes = 0;
  group.traverse(object => {
    if (object.isInstancedMesh) instanceBytes += object.instanceMatrix.array.byteLength + (object.instanceColor?.array.byteLength || 0);
  });
  return {
    group, renderMap, pickMeshes, fogTexture: fog.texture,
    // Canonical batches only. Wrapping, shader hooks and fog callbacks are
    // rebound by the consumer, never serialized as Three.js scene objects.
    exportBatches() {
      return visibilityBatches.map(({meshes, detail, surface, cells, casts}) => {
        const mesh = meshes[1];
        // The batch's own cast fact, not the live flag: a board prepared while
        // shadows were off would otherwise hydrate into a world that throws
        // none, whatever the consumer asks for.
        return {geometry: mesh.geometry, source: sources.get(mesh.material), detail, surface, cells,
          mountainPick: !!mesh.userData.paintedPickOnly, castShadow: casts,
          base: instanceBases.get(mesh.geometry), count: mesh.count,
          matrix: mesh.instanceMatrix, color: mesh.instanceColor};
      });
    },
    get shadowRevision() { return fog.shadowRevision; },
    tiles: { own: new Map(), shared: [] }, treedCells, resourceCells: [],
    bounds: { minX: 0, maxX: Math.sqrt(3) * (map.width - 1 + (map.height > 1 ? .5 : 0)), minZ: 0, maxZ: 1.5 * (map.height - 1) },
    wrapWidth: period, tileCount: map.tiles.length, instanceCount,
    geometryBytes, instanceBytes,
    get triangleCount() {
      let count = 0;
      group.traverseVisible(object => {
        if (object.isMesh) count += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.count : 1);
      });
      return count;
    },
    get drawCalls() { return copies[1].children.filter(mesh => mesh.visible).length * copies.length; },
    applyFog(levels) {
      if (disposed) return 0;
      const revision = fog.shadowRevision, changed = fog.apply(levels);
      if (revision !== fog.shadowRevision) refreshVisibility();
      return changed;
    },
    suppressTile(cell, scope) { return !disposed && fog.suppress(cell, scope); },
    unsuppressTile(cell) { return !disposed && fog.unsuppress(cell); },
    reserveFootprints(radii) {
      if (disposed) return 0;
      let changed = 0;
      for (let cell=0; cell<map.tiles.length; cell++) if (fog.reserve(cell, radii.get(cell) || 0)) changed++;
      return changed;
    },
    isCellVisible(cell, grade = 0) { return !disposed && fog.visible(cell, grade); },
    /**
     * Turns the world's shadows on or off on the board that is already built.
     *
     * `castShadow` is a flag on a mesh, not something baked into its buffers, so
     * this is a walk over the batches rather than the multi-second regeneration
     * of terrain, pigment cuts, instance matrices and contact metadata the
     * settings toggle used to pay for. The materials are told to recompile
     * because whether a program samples a shadow map is a compile-time fact for
     * three; the geometry, the instance buffers, the fog texture, the
     * suppression grades and the footprint reservations are all untouched.
     */
    setShadows(enabled) {
      if (disposed || shadows === !!enabled) return false;
      shadows = !!enabled;
      for (const batch of visibilityBatches)
        for (const mesh of batch.meshes) mesh.castShadow = shadows && batch.casts;
      for (const material of ownedMaterials.values()) material.needsUpdate = true;
      return true;
    },
    /** What the camera asks of the colour pass, and nothing else. */
    updateDetail(pixels) {
      const lod = VIEW3D.painted.lod;
      showingDistant = pixels < (showingDistant ? lod.farPixels : lod.nearPixels);
      return applyDetail();
    },
    /**
     * Raises the near geometry for the static sun's depth pass alone.
     *
     * Three builds the colour render list *before* it renders any shadow map, so
     * a flip made from inside `separatePaintedShadows` reaches the depth
     * submission and nothing else: the frame that has to rebake still draws the
     * far LOD the zoom asked for. Before this, a hex crossing into the charted
     * world dragged the whole overview back to near geometry for one frame —
     * the one visible frame that disagreed with every other frame at that zoom.
     *
     * A batch that casts nothing (`casts`, and the far clones are all of them)
     * is raised all the same: what it contributes to the depth map is nothing,
     * and the flag that decides that is the mesh's, not this one's.
     *
     * Always paired with its own `false`; the caller's `finally` is what makes
     * a failed bake leave the colour pass where it found it.
     */
    setBakeDetail(active) {
      if (disposed || bakingDetail === active) return false;
      bakingDetail = active;
      return applyDetail();
    },
    dispose() {
      if (disposed) return; disposed = true;
      group.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      for (const geometry of ownedGeometry) geometry.dispose();
      for (const material of ownedMaterials.values()) material.dispose();
      for (const material of depthMaterials.values()) material.dispose();
      fog.dispose(); group.clear();
    },
  };
}
