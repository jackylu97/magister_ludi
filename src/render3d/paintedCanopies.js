import { BufferGeometry } from 'three';

/** Keep the complete grove for export and for restoring a tree when its tile
 * becomes visible. All three map copies draw the same ordered list of trees. */
export function createCanopyBatch(meshes, normalSculpt) {
  const middle = meshes[1];
  const source = {
    geometry: middle.geometry, matrix: middle.instanceMatrix, color: middle.instanceColor, count: middle.count,
  };
  const attributes = source.geometry.attributes;
  const cell = attributes.paintedCell, grade = attributes.paintedSuppress, distance = attributes.paintedReservationDistance;
  if (![cell, grade, distance].every(a => a?.isInstancedBufferAttribute) || attributes.paintedOther) return null;
  const instanceAttributes = Object.values(attributes).filter(a => a.isInstancedBufferAttribute);
  if (instanceAttributes.some(a => a.meshPerAttribute !== 1)) return null;

  const geometry = new BufferGeometry();
  geometry.setIndex(source.geometry.index);
  geometry.groups = source.geometry.groups;
  geometry.setDrawRange(source.geometry.drawRange.start, source.geometry.drawRange.count);
  geometry.boundingBox = source.geometry.boundingBox;
  geometry.boundingSphere = source.geometry.boundingSphere;
  const fields = [];
  function drawBuffer(original) {
    const draw = original.clone();
    fields.push({ original, draw });
    return draw;
  }
  for (const [name, attribute] of Object.entries(attributes)) {
    geometry.setAttribute(name, attribute.isInstancedBufferAttribute ? drawBuffer(attribute) : attribute);
  }
  // Only the vertices differ between the two zooms. Fog compacts the same
  // instance attributes, transforms and colours for both shapes.
  let normalGeometry = null;
  if (normalSculpt) {
    normalGeometry = new BufferGeometry();
    normalGeometry.setIndex(normalSculpt.index);
    normalGeometry.boundingBox = normalSculpt.boundingBox;
    normalGeometry.boundingSphere = normalSculpt.boundingSphere;
    for (const [name, attribute] of Object.entries(normalSculpt.attributes)) normalGeometry.setAttribute(name, attribute);
    for (const [name, attribute] of Object.entries(geometry.attributes))
      if (attribute.isInstancedBufferAttribute) normalGeometry.setAttribute(name, attribute);
    // The simpler crown can reach past the original sphere. The grove box
    // encloses both shapes and their wind motion on every instance.
    for (const mesh of meshes) mesh.boundingBox.getBoundingSphere(mesh.boundingSphere);
  }
  const matrix = drawBuffer(source.matrix);
  const color = source.color && drawBuffer(source.color);
  for (const mesh of meshes) {
    mesh.geometry = geometry;
    mesh.instanceMatrix = matrix;
    mesh.instanceColor = color;
  }

  // Each entry identifies the source tree currently in that GPU slot. Keeping
  // the old tail lets a newly visible tree reuse a slot that still holds it.
  const slots = Uint32Array.from({ length: source.count }, (_, i) => i);
  return {
    source, geometry, normalGeometry,
    refresh(fog) {
      let count = 0, changed = false;
      for (let i = 0; i < source.count; i++) {
        if (!fog.canopyVisible(cell.getX(i), grade.getX(i), distance.getX(i))) continue;
        if (slots[count] !== i) {
          for (const { original, draw } of fields) draw.copyAt(count, original, i);
          slots[count] = i;
          changed = true;
        }
        count++;
      }
      if (changed) for (const { draw } of fields) draw.needsUpdate = true;
      for (const mesh of meshes) mesh.count = count;
    },
  };
}
