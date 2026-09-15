import * as T from 'three';

// GPU materials (textures, uniforms and shader functions) stay on the main
// thread. The worker only needs their identity, linear colour and sidedness.
function packAttribute(attribute) {
  if (!attribute) return null;
  if (attribute.isInterleavedBufferAttribute) throw new Error('Painted assets must use non-interleaved attributes');
  return {array: attribute.array, itemSize: attribute.itemSize, normalized: attribute.normalized,
    instanced: !!attribute.isInstancedBufferAttribute, meshPerAttribute: attribute.meshPerAttribute};
}
function unpackAttribute(packet) {
  if (!packet) return null;
  return packet.instanced
    ? new T.InstancedBufferAttribute(packet.array, packet.itemSize, packet.normalized, packet.meshPerAttribute)
    : new T.BufferAttribute(packet.array, packet.itemSize, packet.normalized);
}
function packGeometry(geometry, base) {
  return {attributes: Object.fromEntries(Object.entries(geometry.attributes)
    .filter(([name, attribute]) => !base || base.attributes[name] !== attribute)
    .map(([name, attribute]) => [name, packAttribute(attribute)])),
    index: base && base.index === geometry.index ? null : packAttribute(geometry.index),
    groups: geometry.groups, box: (geometry.boundingBox ? [...geometry.boundingBox.min.toArray(), ...geometry.boundingBox.max.toArray()] : null),
    sphere: geometry.boundingSphere ? [...geometry.boundingSphere.center.toArray(), geometry.boundingSphere.radius] : null};
}
function unpackGeometry(packet, base) {
  const geometry = new T.BufferGeometry();
  if (base) {
    for (const [name, attribute] of Object.entries(base.attributes)) geometry.setAttribute(name, attribute);
    geometry.setIndex(base.index);
  }
  for (const [name, attribute] of Object.entries(packet.attributes)) geometry.setAttribute(name, unpackAttribute(attribute));
  if (packet.index) geometry.setIndex(unpackAttribute(packet.index));
  geometry.groups = packet.groups.map(group => ({...group}));
  if (packet.box) geometry.boundingBox = new T.Box3(new T.Vector3().fromArray(packet.box), new T.Vector3().fromArray(packet.box, 3));
  if (packet.sphere) geometry.boundingSphere = new T.Sphere(new T.Vector3().fromArray(packet.sphere), packet.sphere[3]);
  return geometry;
}

export function packPaintedKit(assets, materials) {
  const bindings = [], ids = new Map(), resources = [];
  function encode(value) {
    if (value?.isMaterial || value?.isBufferGeometry) {
      if (!ids.has(value)) {
        const id = bindings.length; ids.set(value, id); bindings.push(value);
        resources.push(value.isMaterial ? {type: 'material', color: value.color.toArray(), side: value.side}
          : {type: 'geometry', geometry: packGeometry(value)});
      }
      return {binding: ids.get(value)};
    }
    if (Array.isArray(value)) return value.map(encode);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
    return value;
  }
  // Explicit asset contract avoids walking loader textures or callbacks.
  // The map-scale stand-ins travel with their sculpts: a far batch's geometry
  // must resolve to a binding both threads know, or the worker's own object
  // comes back unnamed and every far batch ships a second copy of the vertices.
  const asset = value => ({geometry: value.geometry, shoulderGeometry: value.shoulderGeometry || null,
    farGeometry: value.farGeometry || null, farShoulderGeometry: value.farShoulderGeometry || null, material: value.material});
  const tree = encode({assets: {broadleaves: assets.broadleaves.map(asset), cypresses: assets.cypresses.map(asset),
    escarpments: assets.escarpments.map(asset), limestone: asset(assets.limestone), broadleaf: asset(assets.broadleaf), rangeMaterial: assets.rangeMaterial}, materials});
  return {packet: {tree, resources}, bindings};
}
export function unpackPaintedKit(packet) {
  const bindings = packet.resources.map(resource => resource.type === 'geometry' ? unpackGeometry(resource.geometry)
    : new T.MeshStandardMaterial({color: new T.Color().fromArray(resource.color), side: resource.side}));
  function decode(value) {
    if (value && typeof value === 'object' && 'binding' in value) return bindings[value.binding];
    if (Array.isArray(value)) return value.map(decode);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
    return value;
  }
  return {...decode(packet.tree), bindings};
}
export function packPaintedBatches(batches, bindings) {
  const ids = new Map(bindings.map((value, id) => [value, id]));
  return batches.map(({geometry, source, base, matrix, color, ...metadata}) => {
    if (!ids.has(source) || (base && !ids.has(base))) throw new Error('Unbound painted board resource');
    return {...metadata, source: ids.get(source), base: base ? ids.get(base) : null,
      geometry: packGeometry(geometry, base), matrix: packAttribute(matrix), color: packAttribute(color)};
  });
}
export function unpackPaintedBatches(packets, bindings) {
  return packets.map(({geometry, source, base, matrix, color, ...metadata}) => ({...metadata,
    source: bindings[source], base: base === null ? null : bindings[base],
    geometry: unpackGeometry(geometry, base === null ? null : bindings[base]),
    matrix: unpackAttribute(matrix), color: unpackAttribute(color)}));
}
export function paintedTransferBuffers(packets) {
  const buffers = new Set();
  for (const packet of packets) {
    for (const attribute of [...Object.values(packet.geometry.attributes), packet.geometry.index, packet.matrix, packet.color])
      if (attribute) buffers.add(attribute.array.buffer);
  }
  return [...buffers];
}
