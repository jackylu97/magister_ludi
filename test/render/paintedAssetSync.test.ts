/**
 * Two shipped files are *derived* from other files in the tree, and nothing at
 * runtime can tell that one of them is stale:
 *
 *   - `public/terrain-study/asset-bundle/vegetation-1.bundle` is the vegetation
 *     GLBs already expanded, baked, welded and indexed. A bundle built from an
 *     older sculpt still loads — the version matches, the header is well formed —
 *     and the board quietly draws the old tree.
 *   - `public/terrain-study/*-grain.png` is the red channel of the authored RGB
 *     grain in `scripts/terrain-study/grain-source/`. A grain re-authored without
 *     a rebuild changes no pixel, because the renderer is still sampling the old
 *     one.
 *
 * That is the shape CLAUDE.md gives a sync test: a thing edited in one place and
 * not the other must fail core. The re-derivation itself lives in the build
 * scripts, because both sides are binaries and this suite reads sources as text;
 * so the test's job is to run them and insist on a clean exit.
 */
import { describe, expect, it } from 'vitest';
// `node:child_process` has no typings here — the project deliberately carries
// none (`tsconfig.json`'s `types: ["vite/client"]`), and every other test reads
// what it needs through Vite's `?raw` glob. A PNG and a packed attribute buffer
// cannot be read that way, which is the whole reason this one spawns Node.
// @ts-expect-error No Node typings in this project; see above.
import { execFileSync } from 'node:child_process';

/** Run a build script's own verifier, and fail with what it printed. */
function reDerive(script: string): string {
  try {
    return execFileSync('node', [`scripts/terrain-study/${script}`, '--check'], { encoding: 'utf8', stdio: 'pipe' }) as string;
  } catch (error) {
    const reason = error as { stderr?: string; stdout?: string; message?: string };
    throw new Error(`node scripts/terrain-study/${script} --check failed:\n${reason.stderr || reason.stdout || reason.message}`);
  }
}

describe('shipped painted assets are the ones the sources derive', () => {
  // ~2 s: three 1254² PNG inflations and nine GLB parses, in two Node processes.
  it('re-derives the vegetation bundle and the grains from their own sources', () => {
    expect(reDerive('build_asset_bundle.mjs')).toContain('matches the live loader');
    expect(reDerive('build_grains.mjs')).toContain('smaller');
  }, 60_000);
});
