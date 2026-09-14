import { afterEach, describe, expect, it, vi } from 'vitest';
import { BufferGeometry, Color, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
// @ts-expect-error Shared terrain sculpts remain JavaScript.
import { createSpecialWorkGeometry } from '../../src/terrainStudy/specialWorkGeometry.js';

const names = ['academy', 'landmark', 'manufactory', 'customsHouse', 'citadel', 'holySite'] as const;
type Kit = Record<typeof names[number], BufferGeometry>;
const make = (): Kit => createSpecialWorkGeometry() as Kit;
const dispose = (kit: Kit): void => { Object.values(kit).forEach(geometry => geometry.dispose()); };
afterEach(() => vi.restoreAllMocks());

describe('painted special-work sculpts', () => {
  it('provides six distinct deterministic indexed assets with complete attributes and compact bounds', () => {
    const kit = make(), repeated = make(), gold = new Color('#c5a34d');
    try {
      expect(Object.keys(kit)).toEqual(names);
      const silhouettes = new Set<string>();
      for (const name of names) {
        const geometry = kit[name], p = geometry.getAttribute('position'), c = geometry.getAttribute('color');
        expect(geometry.name).toBe(name); expect(geometry.userData.paintedWorkAsset).toBe(name);
        expect(geometry.index).not.toBeNull(); expect(geometry.index!.count / 3).toBeLessThan(5000);
        let goldVertices = 0;
        for (let i = 0; i < c.count; i++) if (Math.abs(c.getX(i) - gold.r) + Math.abs(c.getY(i) - gold.g) + Math.abs(c.getZ(i) - gold.b) < .0001) goldVertices++;
        expect(goldVertices).toBeGreaterThan(0); expect(goldVertices / p.count).toBeLessThan(.15);
        for (const attribute of ['position', 'normal', 'color', 'uv']) {
          const values = geometry.getAttribute(attribute);
          expect(values.count).toBe(p.count); expect([...values.array].every(Number.isFinite)).toBe(true);
          expect(values.array).toEqual(repeated[name].getAttribute(attribute).array);
        }
        expect(geometry.index!.array).toEqual(repeated[name].index!.array);
        const bounds = geometry.boundingBox!, size = bounds.getSize(new Vector3());
        expect(bounds.min.y).toBeGreaterThanOrEqual(-1e-6);
        expect(size.x).toBeLessThanOrEqual(1.01); expect(size.z).toBeLessThanOrEqual(1.01);
        expect(bounds.max.y).toBeLessThanOrEqual(name === 'landmark' ? 1.3 : 1.15);
        silhouettes.add([size.x, size.y, size.z, geometry.index!.count].join(','));
      }
      expect(silhouettes.size).toBe(6);
    } finally { dispose(kit); dispose(repeated); }
  });

  it('keeps citadel and sanctuary courts open and supplies separate convex ground supports', () => {
    const kit = make(), material = new MeshBasicMaterial();
    try {
      for (const name of ['citadel', 'holySite'] as const) {
        const geometry = kit[name], mesh = new Mesh(geometry, material); mesh.updateMatrixWorld(true);
        expect(geometry.userData.paintedCourtRadius).toBe(.30);
        const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
        for (let x = -.29; x <= .30; x += .04) for (let z = -.29; z <= .30; z += .04) {
          if (Math.hypot(x, z) > .30) continue;
          ray.ray.origin.set(x, 2, z); expect(ray.intersectObject(mesh)).toHaveLength(0);
        }
        const supports = geometry.userData.supportFootprints as [number, number][][];
        expect(supports.length).toBeGreaterThanOrEqual(7);
        for (const polygon of supports) {
          const cross = polygon.map((a, i) => {
            const b = polygon[(i + 1) % polygon.length]!, c = polygon[(i + 2) % polygon.length]!;
            return (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
          });
          expect(cross.every(value => value > 0) || cross.every(value => value < 0)).toBe(true);
          for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!;
            const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dz) / (dx * dx + dz * dz)));
            expect(Math.hypot(a[0] + t * dx, a[1] + t * dz)).toBeGreaterThan(.30);
          }
          const center = polygon.reduce(([x, z], p) => [x + p[0] / polygon.length, z + p[1] / polygon.length], [0, 0]);
          ray.ray.origin.set(center[0]!, 2, center[1]!); expect(ray.intersectObject(mesh).length).toBeGreaterThan(0);
        }
      }
    } finally { dispose(kit); material.dispose(); }
  });

  it('exposes correctly wound roof and pyramid faces to the normal front-face renderer', () => {
    const kit = make(), material = new MeshBasicMaterial(), ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
    try {
      for (const [name, x, z, minimum] of [['academy', .20, 0, .61], ['landmark', .01, .01, 1.07], ['customsHouse', .21, .09, .83]] as const) {
        const mesh = new Mesh(kit[name], material); mesh.updateMatrixWorld(true); ray.ray.origin.set(x, 2, z);
        expect(ray.intersectObject(mesh)[0]!.point.y).toBeGreaterThan(minimum);
      }
    } finally { dispose(kit); material.dispose(); }
  });

  it('keeps arcade interiors darker than the exterior limestone at actual open floor and wall hits', () => {
    const kit = make(), material = new MeshBasicMaterial();
    try {
      for (const name of ['academy', 'customsHouse'] as const) {
        const geometry = kit[name], mesh = new Mesh(geometry, material); mesh.updateMatrixWorld(true);
        const colors = geometry.getAttribute('color');
        const brightness = (ray: Raycaster): number => {
          const hit = ray.intersectObject(mesh)[0]!; expect(hit).toBeDefined();
          const vertex = hit.face!.a;
          return colors.getX(vertex) + colors.getY(vertex) + colors.getZ(vertex);
        };
        const exterior = brightness(new Raycaster(new Vector3(.11, .22, -1), new Vector3(0, 0, 1)));
        const floor = brightness(new Raycaster(new Vector3(.08, .20, .12), new Vector3(0, -1, 0)));
        const rear = brightness(new Raycaster(new Vector3(.11, .22, 0), new Vector3(0, 0, -1)));
        expect(floor).toBeLessThan(exterior * .5); expect(rear).toBeLessThan(exterior * .5);
      }
    } finally { dispose(kit); material.dispose(); }
  });

  it('releases intermediate geometry and leaves only the six caller-owned results', () => {
    const created = new Set<BufferGeometry>(), released = new Set<BufferGeometry>();
    const setAttribute = BufferGeometry.prototype.setAttribute, release = BufferGeometry.prototype.dispose;
    vi.spyOn(BufferGeometry.prototype, 'setAttribute').mockImplementation(function(this: BufferGeometry, ...args) { created.add(this); return setAttribute.apply(this, args); });
    vi.spyOn(BufferGeometry.prototype, 'dispose').mockImplementation(function(this: BufferGeometry) { released.add(this); release.call(this); });
    const kit = make();
    expect(new Set([...created].filter(geometry => !released.has(geometry)))).toEqual(new Set(Object.values(kit)));
    dispose(kit); expect([...created].every(geometry => released.has(geometry))).toBe(true);
  });
});
