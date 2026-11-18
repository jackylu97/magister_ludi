import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial } from 'three';
import { disposeInstancedGroupSoon, flushInstancedDisposals } from '../../src/render3d/instances';

// Through a variable specifier, so the project's type surface stays vite/client (as in `paintedShadowWrap.test.ts`).
const FS_SPECIFIER = 'node:fs';
let readFileSync: (path: URL, encoding: string) => string;
beforeAll(async () => {
  const fs = (await import(/* @vite-ignore */ FS_SPECIFIER)) as { readFileSync: typeof readFileSync };
  readFileSync = fs.readFileSync;
});

// The pieces' layer is rebuilt whole, and three's disposal of each instanced mesh walks its record of every geometry
// and program the renderer has drawn. At the turn-130 turn end that disposal was more than half of the layer's
// rebuild, inside the frame that ends the turn. The fourth render speed pass takes the meshes out at once and
// disposes them in idle time.
describe('disposing a group of instanced meshes soon', () => {
  afterEach(() => { flushInstancedDisposals(); vi.useRealTimers(); });

  function group(count: number): { group: Group; disposals: ReturnType<typeof vi.spyOn>[]; other: Mesh } {
    const g = new Group(), geometry = new BoxGeometry(), material = new MeshBasicMaterial();
    const disposals: ReturnType<typeof vi.spyOn>[] = [];
    for (let i = 0; i < count; i++) { const mesh = new InstancedMesh(geometry, material, 2); g.add(mesh); disposals.push(vi.spyOn(mesh, 'dispose')); }
    const other = new Mesh(geometry, material); g.add(other);
    return { group: g, disposals, other };
  }

  it('empties the group at once and disposes each mesh later, once', async () => {
    vi.useFakeTimers();
    const { group: g, disposals } = group(5);
    disposeInstancedGroupSoon(g);
    expect(g.children).toHaveLength(0);
    expect(disposals.every(spy => spy.mock.calls.length === 0)).toBe(true);
    await vi.runAllTimersAsync();
    expect(disposals.every(spy => spy.mock.calls.length === 1)).toBe(true);
  });

  it('disposes everything still waiting when flushed, and nothing twice', async () => {
    vi.useFakeTimers();
    const first = group(3), second = group(4);
    disposeInstancedGroupSoon(first.group);
    disposeInstancedGroupSoon(second.group);
    flushInstancedDisposals();
    expect([...first.disposals, ...second.disposals].every(spy => spy.mock.calls.length === 1)).toBe(true);
    await vi.runAllTimersAsync();
    expect([...first.disposals, ...second.disposals].every(spy => spy.mock.calls.length === 1)).toBe(true);
  });

  it('is what the pieces use for a rebuild, and the layer flushes the queue when it is disposed', () => {
    const source = readFileSync(new URL('../../src/render3d/pieces.ts', import.meta.url), 'utf8');
    expect(source).toContain('this.disposeGroup(true);');
    expect(source).toContain('if (soon) disposeInstancedGroupSoon(this.group);');
    expect(source).toMatch(/dispose\(\): void \{\n\s+this\.disposeGroup\(\);\n\s+flushInstancedDisposals\(\);/);
  });
});
