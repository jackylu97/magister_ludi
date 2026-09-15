import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Group, OrthographicCamera, Scene, Texture } from 'three';
import { Renderer3D } from '../../src/render3d/renderer3d';

/**
 * `node:fs` behind a variable specifier, so the project's type surface stays
 * `vite/client` alone — `paintedBenchmark.test.ts`'s bargain, for its reason: a
 * source-reading register has to read source.
 */
const FS_SPECIFIER = 'node:fs';
interface MinimalFs { readFileSync(path: string, encoding: string): string }
const read = async (path: string): Promise<string> =>
  ((await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs).readFileSync(path, 'utf8');

/**
 * **P8 — what the first drawn frame no longer has to do.**
 *
 * The gap between "playable" and the first frame of the board was one unbroken
 * main-thread task, and what filled it was work three defers to the moment a
 * thing is first drawn: the canvas atlases are uploaded when a material first
 * asks for them, and a program is linked when an object first uses it. Both
 * have a window of their own earlier in the startup — the seconds the terrain
 * worker owns the board, and the second `setGameState` spends building the
 * layers — and these are the two seams that use them.
 *
 * No GPU here (and no canvas): `Renderer3D` is built off its prototype exactly
 * as `paintedWorkerLifecycle.test.ts` builds it, with a renderer stub that
 * records the two calls this batch is about.
 */

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

/** A texture with an image on it — the only ones three would ever upload. */
function loaded(): Texture {
  const texture = new Texture();
  texture.image = { width: 2, height: 2 };
  return texture;
}

function fixture(parts: Record<string, unknown> = {}) {
  const initTexture = vi.fn();
  const compileAsync = vi.fn(async () => undefined);
  const renderer = Object.create(Renderer3D.prototype) as Renderer3D;
  Object.assign(renderer, {
    running: true,
    renderer: { initTexture, compileAsync },
    scene: new Scene(),
    view: { camera: new OrthographicCamera() },
    warmedTextures: new WeakSet<Texture>(),
    badges: null, icons: null, paintedLook: null,
    preparedBoard: null, paintedBoard: null,
    ...parts,
  });
  // The warm-up yields a frame between uploads so the loading sheet behind it
  // keeps painting; in a test the frame is now.
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
  return { renderer, initTexture, compileAsync };
}

function atlases() {
  const badge = loaded(), wild = loaded(), icons = loaded(), grain = loaded();
  return {
    textures: { badge, wild, icons, grain },
    parts: {
      badges: { material: { map: badge }, wildMaterial: { map: wild } },
      icons: { material: { map: icons } },
      paintedLook: { materials: { mergedLand: { bumpMap: grain } } },
    },
  };
}

describe('the GPU warm-up before the first frame', () => {
  it('hands every atlas and grain to the GPU, and each of them once', async () => {
    const { textures, parts } = atlases();
    const { renderer, initTexture } = fixture(parts);
    await renderer.warmTextures();
    expect(initTexture.mock.calls.map(([texture]) => texture)).toEqual([
      textures.badge, textures.wild, textures.icons, textures.grain,
    ]);
    // A second pass is the whole point of the register: nothing crosses twice.
    await renderer.warmTextures();
    expect(initTexture).toHaveBeenCalledTimes(4);
  });

  it('skips a texture that has not arrived, so it uploads on the frame that draws it', async () => {
    const empty = new Texture();
    const { renderer, initTexture } = fixture({ icons: { material: { map: empty } } });
    await renderer.warmTextures();
    expect(initTexture).not.toHaveBeenCalled();
  });

  it('stops the moment the renderer is disposed mid-warm', async () => {
    const { parts } = atlases();
    const { renderer, initTexture } = fixture(parts);
    Object.assign(renderer, { running: false });
    await renderer.warmTextures();
    expect(initTexture).not.toHaveBeenCalled();
  });

  it('compiles the prepared board against the live scene — the board, not the scene', async () => {
    // The scene compiled whole asked for 49 programs where the first frame draws
    // with 27: `compile` walks hidden children too, and every built-but-lowered
    // layer came with it. The board is where the programs that matter are.
    const group = new Group();
    const { renderer, compileAsync } = fixture({ preparedBoard: { board: { group } } });
    await renderer.warmPrograms();
    expect(compileAsync).toHaveBeenCalledTimes(1);
    const [root, camera, target] = compileAsync.mock.calls[0] as unknown as [Group, OrthographicCamera, Scene];
    expect(root).toBe(group);
    expect(target).toBe((renderer as unknown as { scene: Scene }).scene);
    expect(camera).toBe((renderer as unknown as { view: { camera: OrthographicCamera } }).view.camera);
  });

  it('falls back to the board already in the scene, and asks for nothing without one', async () => {
    const group = new Group();
    const standing = fixture({ paintedBoard: { group } });
    await standing.renderer.warmPrograms();
    expect((standing.compileAsync.mock.calls[0] as unknown as [Group])[0]).toBe(group);

    const bare = fixture();
    await bare.renderer.warmPrograms();
    expect(bare.compileAsync).not.toHaveBeenCalled();
  });
});

describe('where the warm-up sits in the boot', () => {
  let main = '', source = '';
  beforeAll(async () => {
    main = await read('src/main.ts');
    source = await read('src/render3d/renderer3d.ts');
  });

  it('uploads the atlases while the terrain worker still has the board', () => {
    // Not two awaits: the build is started, then both are waited on together,
    // so a board that fails while the atlases are going lands on the caller's
    // catch instead of as an unhandled rejection.
    expect(main).toContain('const terrain = renderer.preparePaintedMap(game.state.map, terrainBuildProgress);');
    expect(main).toContain('await Promise.all([terrain, renderer.warmTextures()]);');
    const warm = main.indexOf('await Promise.all([terrain, renderer.warmTextures()]);');
    expect(warm).toBeGreaterThan(main.indexOf("performance.mark('magisterludi:assets-loaded');"));
    expect(warm).toBeLessThan(main.indexOf("performance.mark('magisterludi:terrain-ready');"));
  });

  it('links the board’s programs while the layers are being built', () => {
    const compile = main.indexOf('await renderer.warmPrograms();');
    expect(compile).toBeGreaterThan(main.indexOf("performance.mark('magisterludi:terrain-ready');"));
    expect(compile).toBeLessThan(main.indexOf('renderer.setGameState(game.state);'));
  });

  it('warms an atlas the moment it rasterises, however late that is', () => {
    expect(source).toContain('this.warmTexture(badges.material.map);');
    expect(source).toContain('this.warmTexture(badges.wildMaterial.map);');
    expect(source).toContain('this.warmTexture(icons.material.map);');
  });
});
