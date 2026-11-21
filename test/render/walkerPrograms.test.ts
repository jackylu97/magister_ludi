import { afterEach, describe, expect, it, vi } from 'vitest';
import { Group, OrthographicCamera, Scene, type WebGLRenderer } from 'three';
import { prepareWalkerPrograms } from '../../src/render3d/seaMirror';

afterEach(() => vi.useRealTimers());

function fixture() {
  vi.useFakeTimers();
  const scene = new Scene(), camera = new OrthographicCamera(), walker = new Group();
  const material = {};
  const make = () => ({ program: {} as unknown, isReady: vi.fn(() => true), getUniforms: vi.fn() });
  const plain = make(), clipped = make(), other = make();
  let active = plain, live = true;
  const get = vi.fn(() => ({ currentProgram: active }));
  const renderer = {
    clippingPlanes: [], properties: { get },
    getRenderTarget: () => null, setRenderTarget: vi.fn(), render: vi.fn(),
    compile: vi.fn(() => {
      active = renderer.clippingPlanes.length ? clipped : plain;
      return new Set([material]);
    }),
  };
  const task = prepareWalkerPrograms(renderer as unknown as WebGLRenderer, scene, camera, walker, () => live);
  return { scene, camera, walker, renderer, material, task, plain, clipped, other,
    useOtherProgram() { active = other; }, loseContext() { live = false; } };
}

describe('prepare the walking piece before play', () => {
  it('waits for each captured program and leaves later material selections alone', async () => {
    const f = fixture();
    expect(f.renderer.compile.mock.calls).toEqual([[f.walker, f.camera, f.scene], [f.walker, f.camera, f.scene]]);
    expect(f.renderer.properties.get.mock.calls).toEqual([[f.material], [f.material]]);
    expect(f.renderer.clippingPlanes).toEqual([]);
    expect(f.clipped.isReady).not.toHaveBeenCalled();
    expect(f.plain.getUniforms).not.toHaveBeenCalled();
    f.clipped.isReady.mockReturnValueOnce(false);
    f.useOtherProgram();
    await vi.advanceTimersToNextTimerAsync();
    expect(f.clipped.getUniforms).not.toHaveBeenCalled();
    expect(f.plain.getUniforms).toHaveBeenCalledOnce();
    await vi.advanceTimersToNextTimerAsync();
    await f.task;
    expect(f.clipped.getUniforms).toHaveBeenCalledOnce();
    expect(f.other.getUniforms).not.toHaveBeenCalled();
  });

  it('skips a released program and stops if the context is lost between checks', async () => {
    const f = fixture();
    f.clipped.program = undefined;
    f.plain.isReady.mockReturnValue(false);
    await vi.advanceTimersToNextTimerAsync();
    expect(f.clipped.isReady).not.toHaveBeenCalled();
    f.loseContext();
    await vi.advanceTimersToNextTimerAsync();
    await f.task;
    expect(f.plain.isReady).toHaveBeenCalledOnce();
    expect(f.clipped.getUniforms).not.toHaveBeenCalled();
    expect(f.plain.getUniforms).not.toHaveBeenCalled();
  });
});
