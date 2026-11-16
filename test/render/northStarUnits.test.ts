import { afterEach, describe, expect, it } from 'vitest';
import { ShaderLib, type MeshStandardMaterial, type WebGLRenderer } from 'three';
import { PaintedUnitKit } from '../../src/render3d/paintedUnits';
import { buildNorthStarUnit, northStarUnitModel, overrideNorthStarUnit } from '../../src/render3d/northStarUnits';
// @ts-expect-error The list of north-star models is a plain JavaScript module.
import { NORTH_STAR_UNITS } from '../../src/terrainStudy/northStarAssets.js';

const kits: PaintedUnitKit[] = [];
const make = (): PaintedUnitKit => { const kit = new PaintedUnitKit(() => {}); kits.push(kit); return kit; };
afterEach(() => { for (const kit of kits.splice(0)) kit.dispose(); overrideNorthStarUnit('swordsman', (NORTH_STAR_UNITS as Record<string, string>).swordsman ?? null); });

describe('north-star unit pieces', () => {
  // The north-star unit models are switched off (`NORTH_STAR_UNIT_MODELS` is false: the user chose small changes to
  // the pieces of today, 2026-11-15). So no type has a model by default, and these tests name one to keep the path
  // covered.
  it('draws no north-star model by default, and the named model for the swordsman alone when one is named', () => {
    expect(northStarUnitModel('swordsman')).toBeNull();
    expect(make().resolve({ type: 'swordsman' })!.geometry.userData.paintedUnitAsset).toBe('swordsman');
    overrideNorthStarUnit('swordsman', 'ns-swordsman');
    expect(northStarUnitModel('swordsman')).toBe('ns-swordsman');
    expect(northStarUnitModel('warrior')).toBeNull();
    const kit = make(), model = kit.resolve({ type: 'swordsman' })!;
    expect(model.geometry.userData.paintedUnitAsset).toBe('ns-swordsman');
    expect(model.trimmed).toBe(true);
    expect(kit.resolve({ type: 'swordsman' }, 'grassland')).toBe(model);
    expect(kit.resolve({ type: 'warrior' })!.geometry.userData.paintedUnitAsset).toBe('warrior');
    // On water the swordsman is the shared transport, as every land piece is.
    expect(kit.resolve({ type: 'swordsman' }, 'coast')!.geometry.userData.paintedUnitAsset).toBe('embarked');
  });

  it('gives back the piece of today when the model is switched off', () => {
    overrideNorthStarUnit('swordsman', 'ns-swordsman');
    overrideNorthStarUnit('swordsman', null);
    const model = make().resolve({ type: 'swordsman' })!;
    expect(model.geometry.userData.paintedUnitAsset).toBe('swordsman');
    // The piece of today has parts in the seat's second colour too (its plinth, bands and crest).
    expect(model.trimmed).toBe(true);
    expect(new Set(model.geometry.getAttribute('paintedOwner').array)).toEqual(new Set([0, 1, 2]));
  });

  it('builds a model the unit layer can place: a size like the pieces of today, a floor at zero and contacts under the base', () => {
    const asset = buildNorthStarUnit('ns-swordsman'), geometry = asset.geometry;
    try {
      geometry.computeBoundingBox();
      expect(geometry.index).not.toBeNull();
      expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 4);
      expect(asset.height).toBeGreaterThan(.8); expect(asset.height).toBeLessThan(1.3);
      expect(asset.radius).toBeGreaterThan(.2); expect(asset.radius).toBeLessThan(.7);
      expect(asset.contacts.length).toBeGreaterThan(4);
      for (const contact of asset.contacts) expect(Math.hypot(contact[0], contact[2])).toBeLessThanOrEqual(asset.radius + 1e-6);
      const count = geometry.getAttribute('position').count;
      for (const name of ['normal', 'color', 'uv', 'paintedOwner', 'paintedIdle']) {
        const attribute = geometry.getAttribute(name);
        expect(attribute.count).toBe(count);
        expect([...attribute.array].every(Number.isFinite)).toBe(true);
      }
      expect(geometry.index!.count / 3).toBeLessThan(900);
    } finally { geometry.dispose(); }
  });

  it('paints one seat colour on a triangle: its own, the first or the second, and uses all three', () => {
    const geometry = buildNorthStarUnit('ns-swordsman').geometry;
    try {
      const owner = geometry.getAttribute('paintedOwner'), index = geometry.index!;
      expect(new Set(owner.array)).toEqual(new Set([0, 1, 2]));
      for (let i = 0; i < index.count; i += 3) {
        expect(owner.getX(index.getX(i + 1))).toBe(owner.getX(index.getX(i)));
        expect(owner.getX(index.getX(i + 2))).toBe(owner.getX(index.getX(i)));
      }
    } finally { geometry.dispose(); }
  });

  it('keeps the board game piece low in triangles and few in colours, and the cast piece in one seat colour', () => {
    const piece = buildNorthStarUnit('ns-swordsman').geometry, cast = buildNorthStarUnit('ns-swordsman-cast').geometry, toon = buildNorthStarUnit('ns-swordsman-toon').geometry;
    try {
      for (const geometry of [piece, cast, toon]) expect(geometry.index!.count / 3).toBeLessThan(900);
      expect(piece.index!.count).toBe(cast.index!.count);
      // The cast piece has no part in the seat's second colour and no neutral part.
      expect(new Set(cast.getAttribute('paintedOwner').array)).toEqual(new Set([1]));
      // The board game piece has two neutral colours at most: the pale blade and the dark slit.
      const neutral = new Set<string>(), owner = piece.getAttribute('paintedOwner'), color = piece.getAttribute('color');
      for (let i = 0; i < owner.count; i++) if (owner.getX(i) === 0) neutral.add([color.getX(i), color.getY(i), color.getZ(i)].join(','));
      expect(neutral.size).toBeLessThanOrEqual(2);
      expect(new Set(toon.getAttribute('paintedOwner').array)).toEqual(new Set([0, 1, 2]));
    } finally { piece.dispose(); cast.dispose(); toon.dispose(); }
  });

  it('keeps the base still when the piece idles, and moves the head more than the feet', () => {
    const geometry = buildNorthStarUnit('ns-swordsman').geometry;
    try {
      const position = geometry.getAttribute('position'), idle = geometry.getAttribute('paintedIdle');
      let top = 0;
      for (let i = 0; i < position.count; i++) {
        if (position.getY(i) < .03) { expect(idle.getX(i)).toBe(0); expect(idle.getY(i)).toBe(0); }
        if (position.getY(i) > .8) top = Math.max(top, idle.getX(i));
      }
      expect(top).toBeGreaterThan(.6);
    } finally { geometry.dispose(); }
  });

  it('has a material for each pair of seat colours, with the second colour and the idle motion in its shader', () => {
    overrideNorthStarUnit('swordsman', 'ns-swordsman');
    const kit = make(), model = kit.resolve({ type: 'swordsman' })!, today = kit.resolve({ type: 'warrior' })!;
    const a = kit.material(model, 0x714291, 0xc9ccd6);
    expect(kit.material(model, 0x714291, 0xc9ccd6)).toBe(a);
    expect(kit.material(model, 0x714291, 0xe8c672)).not.toBe(a);
    // A piece of today has parts in the second colour, so it shares the material of its pair of colours.
    expect(kit.material(today, 0x714291, 0xc9ccd6)).toBe(a);
    expect(kit.material(today, 0x714291, 0xe8c672)).not.toBe(a);
    // A model with no part in the second colour keeps one material for a first colour, whatever second colour is passed.
    const plain = { ...today, trimmed: false }, old = kit.material(plain, 0x714291);
    expect(kit.material(plain, 0x714291, 0xe8c672)).toBe(old);
    expect(old).not.toBe(a);
    const compile = (material: MeshStandardMaterial) => {
      const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader } as Parameters<MeshStandardMaterial['onBeforeCompile']>[0];
      material.onBeforeCompile(shader, {} as WebGLRenderer);
      return shader;
    };
    const shader = compile(a), oldShader = compile(old);
    expect(shader.fragmentShader).toContain('paintedUnitTrimColor');
    expect(shader.vertexShader).toContain('paintedIdle');
    expect(oldShader.fragmentShader).not.toContain('paintedUnitTrimColor');
    expect(oldShader.vertexShader).not.toContain('paintedIdle');
    expect(a.customProgramCacheKey()).not.toBe(old.customProgramCacheKey());
  });
});
