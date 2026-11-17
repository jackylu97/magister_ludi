/**
 * Transparent double-sided materials drawn in one pass (the render speed pass of
 * 2026-11-16, `docs/plans/render-performance-2026-11-16.md`).
 *
 * three draws a transparent material with `side: DoubleSide` twice for each
 * object, back faces and then front faces, and asks for the program again
 * between the two. At turn 130 that was about two hundred program lookups and
 * some eighty draw calls on every frame. Where every quad of a mesh faces the
 * same way (a decal lies flat, a bar, a badge or a pin faces the camera), one of
 * the two passes draws no pixel, so the material asks for one pass. The yield
 * light is the exception: one of its meshes holds washes that lie on the ground,
 * seen from their backs, and motes that face the camera, so the order of its
 * two passes is part of its picture.
 */

import { describe, expect, it } from 'vitest';
import { DoubleSide } from 'three';

import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';

const FS_SPECIFIER = 'node:fs';
const read = async (path: string): Promise<string> =>
  ((await import(/* @vite-ignore */ FS_SPECIFIER)) as { readFileSync(path: string, encoding: string): string }).readFileSync(path, 'utf8');

describe('transparent double-sided quads', () => {
  it('draw the board\'s overlays, bars and rings in one pass, on top or not', () => {
    const materials = new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
    for (const onTop of [false, true]) {
      const material = materials.overlay(0x336699, .5, onTop);
      expect(material.transparent).toBe(true);
      expect(material.side).toBe(DoubleSide);
      expect(material.forceSinglePass).toBe(true);
    }
    materials.dispose();
  });

  it('draw the tile icons, the badges and the pins in one pass, and the yield light in two', async () => {
    const badges = await read('src/render3d/badges3d.ts');
    // The flat icons, their quieter copies, and the badge discs.
    expect(badges.match(/forceSinglePass: true/g)?.length).toBe(3);
    expect(await read('src/render3d/lens3d.ts')).toContain('material.forceSinglePass = true');
    expect(await read('src/render3d/paintedYieldLight.ts')).not.toContain('forceSinglePass');
  });
});
