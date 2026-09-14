// @ts-expect-error Shared procedural naval catalogue remains JavaScript.
import { navalVariants } from '../terrainStudy/navalUnitModels.js';
// @ts-expect-error Shared procedural mounted catalogue remains JavaScript.
import { mountedVariants } from '../terrainStudy/mountedUnitModels.js';
import { AlwaysStencilFunc, BufferGeometry, Color, Float32BufferAttribute, MeshStandardMaterial, ReplaceStencilOp } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Unit } from '../sim/state';
import { greatPersonDef, isGreatPersonId, type Family } from '../sim/greatPeopleData';
import { isWaterTerrain, type TerrainId } from '../sim/terrainData';
// @ts-expect-error The approved shared study asset packer remains JavaScript.
import { packUnitAsset } from '../terrainStudy/unitAssets.js';
// @ts-expect-error The approved shared study sculpts remain JavaScript.
import { createPrimitiveUnitScene } from '../terrainStudy/primitiveUnitModels.js';
// @ts-expect-error The study inventory remains JavaScript.
import { paintedUnitTypes, unitReviewVariants } from '../terrainStudy/unitCatalog.js';

export interface PaintedUnitModel {
  readonly geometry: BufferGeometry;
  readonly height: number;
  readonly radius: number;
  /** Actual underside samples in the unrotated model's local coordinates. */
  readonly contacts: [number, number, number][];
  readonly yaw: number;
  readonly waterborne?: boolean;
}

interface PackedUnitAsset {
  fixed: BufferGeometry;
  owner: BufferGeometry;
  height: number;
  radius: number;
  contacts: [number, number, number][];
}

type UnitArtState = Pick<Unit, 'type' | 'person' | 'trade'>;
type RegisterMaterial = (material: MeshStandardMaterial) => void;
const implementedTypes = new Set<string>(paintedUnitTypes);

/** The accepted study poses; equipment variants share the infantry's facing. */
function studyYaw(type: Unit['type']): number {
  if (type === 'horseman' || type === 'horseArcher' || mountedVariants.includes(type)) return -.35;
  if (navalVariants.includes(type)) return -.65;
  if (type === 'catapult' || type === 'trebuchet') return -.60;
  if (type === 'warElephant') return -.58;
  if (type === 'trader' || type === 'rihlaCaravan') return -.62;
  if (type === 'settler') return 2.92;
  return type === 'warrior' || unitReviewVariants.includes(type) ? -.16 : .12;
}

/** Geometry and owner pigments shared by resting, moving and falling pieces. */
export class PaintedUnitKit {
  private readonly models = new Map<string, PaintedUnitModel>();
  private readonly materials = new Map<number, MeshStandardMaterial>();
  private disposed = false;

  constructor(private readonly registerMaterial: RegisterMaterial) {}

  resolve(unit: UnitArtState, terrain?: TerrainId): PaintedUnitModel | null {
    if (this.disposed || !implementedTypes.has(unit.type)) return null;
    const embarked = terrain !== undefined && isWaterTerrain(terrain) && !navalVariants.includes(unit.type);
    const family: Family = unit.type === 'greatPerson' && isGreatPersonId(unit.person)
      ? greatPersonDef(unit.person).family : 'scholar';
    const key = embarked ? 'embarked' : unit.type === 'greatPerson' ? `greatPerson:${family}` : unit.type;
    const cached = this.models.get(key);
    if (cached) return cached;

    const packed = packUnitAsset(createPrimitiveUnitScene(embarked ? 'embarked' : unit.type, { family })) as PackedUnitAsset;
    let geometry: BufferGeometry | null = null;
    try {
      for (const [part, owner] of [[packed.fixed, 0], [packed.owner, 1]] as const) {
        const count = part.getAttribute('position').count;
        part.setAttribute('paintedOwner', new Float32BufferAttribute(new Float32Array(count).fill(owner), 1));
        // The study welds profitable meshes; the production bucket contract is
        // indexed even for a small part whose vertices could not be shared.
        if (!part.index) part.setIndex(Array.from({ length: count }, (_, index) => index));
      }
      geometry = mergeGeometries([packed.fixed, packed.owner], false);
      if (!geometry) throw new Error(`Could not merge painted unit ${key}`);
      geometry.name = `Painted unit ${key}`;
      geometry.userData.paintedUnitAsset = key;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const model: PaintedUnitModel = {
        geometry, height: packed.height, radius: packed.radius,
        contacts: packed.contacts, yaw: embarked ? -.65 : studyYaw(unit.type), waterborne: embarked || navalVariants.includes(unit.type),
      };
      this.models.set(key, model);
      return model;
    } catch (error) {
      geometry?.dispose();
      throw error;
    } finally {
      packed.fixed.dispose();
      packed.owner.dispose();
    }
  }

  material(_model: PaintedUnitModel, bodyColor: number): MeshStandardMaterial {
    if (this.disposed) throw new Error('Painted unit kit has been disposed');
    const cached = this.materials.get(bodyColor);
    if (cached) return cached;
    const material = new MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, flatShading: true, roughness: .94, metalness: 0,
      stencilWrite: true, stencilRef: 1, stencilFunc: AlwaysStencilFunc,
      stencilZPass: ReplaceStencilOp, stencilWriteMask: 1,
    });
    material.name = `Painted unit pigment ${bodyColor.toString(16).padStart(6, '0')}`;
    const ownerColor = { value: new Color(bodyColor) };
    try {
      // Register the lighting first, then preserve its hook and changing cache
      // key. Only the enamel receives seat/routed ink; ivory and gilt stay fixed.
      this.registerMaterial(material);
      const originalHook = material.onBeforeCompile;
      const originalKey = material.customProgramCacheKey.bind(material);
      material.onBeforeCompile = function(shader, renderer): void {
        originalHook.call(this, shader, renderer);
        shader.uniforms.paintedUnitBodyColor = ownerColor;
        shader.vertexShader = `attribute float paintedOwner;\nvarying float vPaintedOwner;\n${shader.vertexShader}`
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintedOwner = paintedOwner;');
        shader.fragmentShader = `uniform vec3 paintedUnitBodyColor;\nvarying float vPaintedOwner;\n${shader.fragmentShader}`
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(vec3(1.0), paintedUnitBodyColor, vPaintedOwner);');
      };
      material.customProgramCacheKey = () => `${originalKey()}:painted-unit-owner-v1`;
      this.materials.set(bodyColor, material);
      return material;
    } catch (error) {
      material.dispose();
      throw error;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const model of this.models.values()) model.geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.models.clear();
    this.materials.clear();
  }
}
