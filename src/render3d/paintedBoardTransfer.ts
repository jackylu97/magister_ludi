import * as T from 'three';
import type { ExportedPaintedBatch, PaintedBoardBatch, PaintedBoardMaterials, PaintedVegetationAsset, PaintedVegetationAssets } from './paintedBoard.js';

type Binding = T.BufferGeometry | T.MeshStandardMaterial;
type Reference = { binding: number };
type Attribute = T.BufferAttribute | T.InterleavedBufferAttribute;

function isInstanced(attribute: T.BufferAttribute): attribute is T.InstancedBufferAttribute {
  return 'isInstancedBufferAttribute' in attribute && attribute.isInstancedBufferAttribute === true;
}

function packAttribute(attribute: Attribute) {
  if ('isInterleavedBufferAttribute' in attribute) throw new Error('Painted assets must use non-interleaved attributes');
  const instanced = isInstanced(attribute);
  return {
    array: attribute.array,
    itemSize: attribute.itemSize,
    normalized: attribute.normalized,
    instanced,
    meshPerAttribute: instanced ? attribute.meshPerAttribute : undefined,
  };
}
type AttributePacket = ReturnType<typeof packAttribute>;

function unpackInstance(packet: AttributePacket) {
  return new T.InstancedBufferAttribute(packet.array, packet.itemSize, packet.normalized, packet.meshPerAttribute);
}

function unpackAttribute(packet: AttributePacket) {
  if (packet.instanced) return unpackInstance(packet);
  return new T.BufferAttribute(packet.array, packet.itemSize, packet.normalized);
}

function packGeometry(geometry: T.BufferGeometry, base?: T.BufferGeometry | null) {
  const attributes: Record<string, AttributePacket> = {};
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    if (base?.attributes[name] !== attribute) attributes[name] = packAttribute(attribute);
  }
  const { boundingBox, boundingSphere, index } = geometry;
  return {
    attributes,
    index: index && base?.index !== index ? packAttribute(index) : null,
    groups: geometry.groups,
    box: boundingBox ? [...boundingBox.min.toArray(), ...boundingBox.max.toArray()] : null,
    sphere: boundingSphere ? [...boundingSphere.center.toArray(), boundingSphere.radius] : null,
  };
}
type GeometryPacket = ReturnType<typeof packGeometry>;

function unpackGeometry(packet: GeometryPacket, base?: T.BufferGeometry | null) {
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

/** Both threads visit the same asset fields so far and near batches can share base geometry. */
function mapAssets<G, M, H, N>(assets: PaintedVegetationAssets<G, M>, geometry: (value: G) => H, material: (value: M) => N) {
  const asset = (value: PaintedVegetationAsset<G, M>) => ({
    geometry: geometry(value.geometry),
    shoulderGeometry: value.shoulderGeometry ? geometry(value.shoulderGeometry) : null,
    farGeometry: value.farGeometry ? geometry(value.farGeometry) : null,
    farShoulderGeometry: value.farShoulderGeometry ? geometry(value.farShoulderGeometry) : null,
    material: material(value.material),
  });
  return {
    broadleaves: assets.broadleaves.map(asset),
    cypresses: assets.cypresses.map(asset),
    escarpments: assets.escarpments.map(asset),
    limestone: asset(assets.limestone),
    broadleaf: asset(assets.broadleaf),
    rangeMaterial: material(assets.rangeMaterial),
  };
}

function mapMaterials<M, N>(materials: PaintedBoardMaterials<M>, material: (value: M) => N): PaintedBoardMaterials<N> {
  const group = (values: Record<string, M>) => Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, material(value)] as const),
  );
  return {
    ground: group(materials.ground),
    earth: material(materials.earth),
    mergedLand: material(materials.mergedLand),
    mergedWater: material(materials.mergedWater),
    mergedDetails: material(materials.mergedDetails),
    water: group(materials.water),
    features: group(materials.features),
  };
}

type Resource = { type: 'geometry'; geometry: GeometryPacket }
  | { type: 'material'; color: number[]; side: T.Side };

export function packPaintedKit(assets: PaintedVegetationAssets, materials: PaintedBoardMaterials) {
  const bindings: Binding[] = [];
  const ids = new Map<Binding, number>();
  const resources: Resource[] = [];

  // The worker needs only the material's colour and sidedness. GPU resources stay on the page.
  function bind(value: Binding): Reference {
    const existing = ids.get(value);
    if (existing !== undefined) return {binding: existing};
    const id = bindings.length;
    ids.set(value, id);
    bindings.push(value);
    if ('isMaterial' in value) {
      resources.push({type: 'material', color: value.color.toArray(), side: value.side});
    } else {
      resources.push({type: 'geometry', geometry: packGeometry(value)});
    }
    return {binding: id};
  }
  const tree = {assets: mapAssets(assets, bind, bind), materials: mapMaterials(materials, bind)};
  return {packet: {tree, resources}, bindings};
}

export type PaintedKitPacket = ReturnType<typeof packPaintedKit>['packet'];

function geometryAt(bindings: Binding[], id: number) {
  const value = bindings[id];
  if (!value || !('isBufferGeometry' in value)) throw new Error('Invalid painted geometry binding');
  return value;
}
function materialAt(bindings: Binding[], id: number) {
  const value = bindings[id];
  if (!value || !('isMaterial' in value)) throw new Error('Invalid painted material binding');
  return value;
}

export function unpackPaintedKit(packet: PaintedKitPacket) {
  const bindings = packet.resources.map(resource => resource.type === 'geometry'
    ? unpackGeometry(resource.geometry)
    : new T.MeshStandardMaterial({color: new T.Color().fromArray(resource.color), side: resource.side}));
  const material = (ref: Reference) => materialAt(bindings, ref.binding);
  const assets = mapAssets(packet.tree.assets, ref => geometryAt(bindings, ref.binding), material);
  return {assets, materials: mapMaterials(packet.tree.materials, material), bindings};
}

export function packPaintedBatches(batches: ExportedPaintedBatch[], bindings: Binding[]) {
  const ids = new Map(bindings.map((value, id) => [value, id]));
  function idOf(value: Binding) {
    const id = ids.get(value);
    if (id === undefined) throw new Error('Unbound painted board resource');
    return id;
  }
  return batches.map(({geometry, source, base, matrix, color, ...metadata}) => ({
    ...metadata,
    source: idOf(source),
    base: base ? idOf(base) : null,
    geometry: packGeometry(geometry, base),
    matrix: matrix ? packAttribute(matrix) : null,
    color: color ? packAttribute(color) : null,
  }));
}
export type PaintedBatchPacket = ReturnType<typeof packPaintedBatches>[number];

export function unpackPaintedBatches(packets: PaintedBatchPacket[], bindings: Binding[]): PaintedBoardBatch[] {
  return packets.map(({geometry, source, base, matrix, color, ...metadata}) => {
    const baseGeometry = base === null ? null : geometryAt(bindings, base);
    return {
      ...metadata,
      source: materialAt(bindings, source),
      base: baseGeometry,
      geometry: unpackGeometry(geometry, baseGeometry),
      matrix: matrix ? unpackInstance(matrix) : null,
      color: color ? unpackInstance(color) : null,
    };
  });
}

export function paintedTransferBuffers(packets: PaintedBatchPacket[]) {
  const buffers = new Set<ArrayBuffer>();
  for (const packet of packets) {
    const attributes = [...Object.values(packet.geometry.attributes), packet.geometry.index, packet.matrix, packet.color];
    for (const attribute of attributes) {
      if (attribute) {
        const buffer = attribute.array.buffer;
        if (!(buffer instanceof ArrayBuffer)) throw new Error('Painted attributes require transferable buffers');
        buffers.add(buffer);
      }
    }
  }
  return [...buffers];
}
