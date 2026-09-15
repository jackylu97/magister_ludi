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

  function materialFor(source) {
    if (!ownedMaterials.has(source)) {
      const material = paintedFogMaterial(source, fog, source === materials.mergedWater);
      ownedMaterials.set(source, material); sources.set(material, source);
    }
    return ownedMaterials.get(source);
  }
  function decorateMesh(mesh, source, castShadow) {
    mesh.receiveShadow = true; mesh.castShadow = shadows && castShadow;
    const shared = source === materials.mergedWater, key = `${source.side}:${shared}`;
    if (!depthMaterials.has(key)) depthMaterials.set(key, paintedFogDepth(fog, source.side, shared));
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
    const batch = { cells: preparedCells || [...cells], meshes, detail, surface, charted: false };
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
    geometry.setAttribute('paintedReservationDistance', new T.BufferAttribute(new Uint8Array(count), 1));
    geometry.setAttribute('turfWeight', new T.Float32BufferAttribute(new Float32Array(count).fill(turfStrength), 1));
    const uv = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) { uv[i * 2] = p.getX(i) * .6; uv[i * 2 + 1] = p.getZ(i) * .6; }
    geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
    return geometry;
  }
  function batchMesh(source, list, surface = false, detail = 'always') {
    const geometry = mergeGeometries(list);
    for (const piece of list) piece.dispose();
    if (!geometry) throw new Error('Painted terrain batch has incompatible attributes');
    // Each batch has one material. Its unused inputs need not occupy vertex
    // memory; retained coordinates, normals and pigments remain bit-identical.
    if (source !== materials.mergedLand) { geometry.deleteAttribute('turfWeight'); geometry.deleteAttribute('uv'); }
    if (source !== materials.mergedWater) geometry.deleteAttribute('paintedOther');
    indexGeometry(geometry); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); ownedGeometry.add(geometry);
    const mesh = new T.Mesh(geometry, materialFor(source));
    decorateMesh(mesh, source, source === materials.earth || source === materials.mergedLand || source === features.stone || source === features.shrub);
    if (detail === 'far') mesh.castShadow = false;
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
        const key = geometry.uuid + material.uuid;
        const matrix = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromAxisAngle(axis, angle), new T.Vector3(sx, sy, sz));
        const color = tint?.isColor ? tint : new T.Color(tint);
        // At overview zoom a whole-map instance sphere touches all three wrap
        // copies and submits every tree three times. Coarser spatial batches
        // retain the study's low draw count while culling those unseen copies.
        const farKey = `${Math.floor(activeTile.col / 18)},${Math.floor(activeTile.row / 18)}`;
        if (!mapProps.has(farKey)) mapProps.set(farKey, new Map());
        for (const batches of [props, mapProps.get(farKey)]) {
          if (!batches.has(key)) batches.set(key, { geometry, material, matrices: [], tints: [], cells: [], grades: [], reservationDistances: [] });
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
      return visibilityBatches.map(({meshes, detail, surface, cells}) => {
        const mesh = meshes[1];
        return {geometry: mesh.geometry, source: sources.get(mesh.material), detail, surface, cells,
          mountainPick: !!mesh.userData.paintedPickOnly, castShadow: mesh.castShadow,
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
    /** What the camera asks of the colour pass, and nothing else. */
    updateDetail(pixels) {
      showingDistant = pixels < (showingDistant ? 29 : 25);
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
