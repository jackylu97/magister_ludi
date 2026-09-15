import type { BufferAttribute, BufferGeometry } from 'three';

/** Reversible hill cuts. Vertex buffers and the other cells in a chunk stay put. */
export class PaintedRelief {
  private cells = new Set<number>();
  private originals = new WeakMap<BufferGeometry, BufferAttribute>();

  replace(geometries: Iterable<BufferGeometry>, cells: ReadonlySet<number>): boolean {
    const changed = new Set([...this.cells, ...cells].filter(cell => this.cells.has(cell) !== cells.has(cell)));
    if (!changed.size) return false;
    for (const geometry of new Set(geometries)) {
      const relief = geometry.getAttribute('paintedRelief'), owners = geometry.getAttribute('paintedCell');
      if (!relief || !owners || !geometry.index) continue;
      const original = this.originals.get(geometry) ?? geometry.index;
      let affected = false;
      for (let i = 0; i < original.count; i += 3) {
        const vertex = original.getX(i);
        if (relief.getX(vertex) && changed.has(owners.getX(vertex))) { affected = true; break; }
      }
      if (!affected) continue;
      if (!this.originals.has(geometry)) this.originals.set(geometry, original.clone());
      const saved = this.originals.get(geometry)!;
      const index = geometry.index;
      for (let i = 0; i < saved.count; i += 3) {
        const vertex = saved.getX(i);
        const hidden = relief.getX(vertex) && cells.has(owners.getX(vertex));
        // Degenerate just the removed faces. Reuse the GPU index allocation
        // across build/pillage cycles instead of leaking replaced index buffers.
        index.setX(i, vertex);
        index.setX(i + 1, hidden ? vertex : saved.getX(i + 1));
        index.setX(i + 2, hidden ? vertex : saved.getX(i + 2));
      }
      index.needsUpdate = true;
    }
    this.cells = new Set(cells);
    return true;
  }
}
