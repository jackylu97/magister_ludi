// @ts-check
/** @typedef {import('../sim/map').GameMap} GameMap */
/** @typedef {import('./terrainPacket').TerrainPacket} TerrainPacket */
/** @typedef {import('./terrainPacket').HillMound} HillMound */
/** @typedef {import('./terrainPacket').MoundsByTile} MoundsByTile */

/** Wrapping and hill contacts belong to the prepared map and its tile objects. */
/** @type {WeakSet<GameMap>} */
export const wrappingMaps = new WeakSet();
/** @type {WeakMap<GameMap['tiles'][number], HillMound[]>} */
export const moundCache = new WeakMap();

/** @param {GameMap} map @returns {TerrainPacket} */
export function packTerrainMap(map) {
  const lists = map.tiles.map(tile => moundCache.get(tile) ?? null);
  return {map, wrap: wrappingMaps.has(map), mounds: packMounds(lists) ?? lists};
}

/** @param {TerrainPacket} packet */
export function restoreTerrainMap({map, wrap, mounds}) {
  if (wrap) wrappingMaps.add(map);
  if (Array.isArray(mounds)) {
    map.tiles.forEach((tile, i) => {
      const list = mounds[i];
      if (list) moundCache.set(tile, list);
    });
    return map;
  }

  const {present, pieces, faces, corners, rest} = mounds;
  let piece = 0;
  let at = 0;
  map.tiles.forEach((tile, i) => {
    if (!present[i]) return;
    const list = [];
    for (let k = 0; k < pieces[i]; k++, piece++) {
      const triangles = [];
      for (let f = 0; f < faces[piece]; f++, at += 9) {
        triangles.push([
          [corners[at], corners[at + 1], corners[at + 2]],
          [corners[at + 3], corners[at + 4], corners[at + 5]],
          [corners[at + 6], corners[at + 7], corners[at + 8]],
        ]);
      }
      list.push({faces: triangles, ...rest[piece]});
    }
    moundCache.set(tile, list);
  });
  return map;
}

/**
 * Store triangle corners as doubles so a worker copies their bytes in one block.
 * Keep the original lists when their shape or field order would change on restore.
 * @param {MoundsByTile} lists
 */
function packMounds(lists) {
  const present = new Uint8Array(lists.length);
  const pieces = new Uint32Array(lists.length);
  const faces = [];
  const rest = [];
  let total = 0;
  for (const [i, list] of lists.entries()) {
    if (!list) continue;
    present[i] = 1;
    pieces[i] = list.length;
    for (const piece of list) {
      if (Object.keys(piece)[0] !== 'faces') return null;
      for (const face of piece.faces) {
        if (face.length !== 3 || face.some(corner => corner.length !== 3)) return null;
      }
      const {faces: triangles, ...metadata} = piece;
      faces.push(triangles.length);
      rest.push(metadata);
      total += triangles.length * 9;
    }
  }
  const corners = new Float64Array(total);
  let at = 0;
  for (const list of lists) {
    if (!list) continue;
    for (const piece of list) {
      for (const face of piece.faces) {
        for (const corner of face) {
          corners[at++] = corner[0];
          corners[at++] = corner[1];
          corners[at++] = corner[2];
        }
      }
    }
  }
  return {present, pieces, faces: Uint32Array.from(faces), corners, rest};
}
