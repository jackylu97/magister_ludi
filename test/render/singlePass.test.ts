/**
 * Transparent double-sided materials drawn in one pass (the render speed pass of
 * 2026-11-16, `docs/plans/render-performance-2026-11-16.md`).
 *
 * three draws a transparent material with `side: DoubleSide` twice for each
 * object, back faces and then front faces, and asks for the program again
 * between the two. At turn 130 that was about two hundred program lookups and
 * some eighty draw calls on every frame. Where every quad of a mesh faces the
 * same way (a decal lies flat, a bar, a badge or a pin faces the camera), one of
 * the two passes draws no pixel, so the material asks for one pass. The yield light and embers use Three.js’s single-pass shader material.
 */

import { describe, expect, it } from 'vitest';
import { Color, DoubleSide } from 'three';
import { createPaintedMotes } from '../../src/render3d/paintedYieldLight';

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

  it('draw the tile icons, the badges, pins and painted lights in one pass', async () => {
    const badges = await read('src/render3d/badges3d.ts');
    // The flat icons, their quieter copies, and the badge discs.
    expect(badges.match(/forceSinglePass: true/g)?.length).toBe(3);
    expect(await read('src/render3d/lens3d.ts')).toContain('material.forceSinglePass = true');
    const mote = createPaintedMotes([{ x: 0, y: 0, z: 0, color: new Color('white'), mode: 'spark', size: .2, phase: 0, rnd: 0, strength: 1 }]);
    expect(mote.material.side).toBe(DoubleSide);
    expect(mote.material.forceSinglePass).toBe(true);
    mote.geometry.dispose();
    mote.material.dispose();
  });
});
