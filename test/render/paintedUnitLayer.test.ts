import { afterEach, describe, expect, it, vi } from 'vitest';
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, GreaterDepth, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, NotEqualStencilFunc, Quaternion, Raycaster, ReplaceStencilOp, ShaderLib, Vector3, type WebGLRenderer } from 'three';
import { BoardGeometry, badgeClassFor, pieceHeightFor } from '../../src/render3d/board3d';
import { badgeCenterY, type TileIcons, type UnitBadges } from '../../src/render3d/badges3d';
import { RENDER_ORDER } from '../../src/render3d/instances';
import { cellCenter, wrapWidth } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import { PaintedUnitKit } from '../../src/render3d/paintedUnits';
import { paintedUnitSupport } from '../../src/render3d/paintedUnitPlacement';
import { installPaintedSurface, uninstallPaintedSurface } from '../../src/render3d/paintedSurface';
import * as surfaceQueries from '../../src/render3d/paintedSurface';
import { UnitLayer, badgeAnchors, placePiece, terrainUnder, unitColor } from '../../src/render3d/pieces';
import { MaterialLibrary } from '../../src/render3d/toon';
import { createMap, tileIndex } from '../../src/sim/map';
import { newGame, type GameState, type Unit } from '../../src/sim/state';
import { unitDef, type UnitTypeId } from '../../src/sim/unitData';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';

const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); vi.restoreAllMocks(); });

function fixture(types: UnitTypeId[]) {
  const state = newGame({ seed: 7, sizeName: 'duel', players: [{ name: 'A', color: '#294979', secondary: '#605040', isHuman: true }] });
  state.map = createMap({ width: 16, height: 6, terrain: 'grassland' });
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.cities = [];
  state.units = types.map((type, i) => ({
    id: i + 1, type, ownerId: 0, col: i + 2, row: 2,
    hp: unitDef(type).maxHp, movesLeft: 2, hasAttacked: false,
  }));
  resetVisibility(state);
  const board = new BoardGeometry(), library = new MaterialLibrary(VIEW3D.look.rampSteps, 0x303030);
  const layer = new UnitLayer(), kit = new PaintedUnitKit(() => {}), badgeMaterial = new MeshBasicMaterial();
  const iconMaterial = new MeshBasicMaterial();
  const badges = { material: badgeMaterial, wildMaterial: badgeMaterial, materialFor: () => badgeMaterial } as unknown as UnitBadges;
  const icons = { material: iconMaterial, standingMaterial: iconMaterial } as unknown as TileIcons;
  cleanup.push(() => { layer.dispose(); kit.dispose(); board.dispose(); library.dispose(); badgeMaterial.dispose(); iconMaterial.dispose(); });
  const build = (levels: number[] | null = null, shadows = true, markers = false): void =>
    layer.build(state, board, library, new Quaternion(), shadows, null, markers ? badges : null, null, levels, markers ? icons : null, null, kit);
  return { state, board, library, layer, kit, build };
}

function meshes(layer: UnitLayer): InstancedMesh[] {
  return layer.group.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
}

function matrices(mesh: InstancedMesh): Matrix4[] {
  return Array.from({ length: mesh.count }, (_, i) => { const matrix = new Matrix4(); mesh.getMatrixAt(i, matrix); return matrix; });
}

/** A real sloped surface, independent of the production support calculation. */
function slope(state: GameState, unit: Unit): Mesh {
  const center = cellCenter(unit.col, unit.row), vertices: number[] = [];
  const point = (x: number, z: number): number[] => [center.x + x, .5 + x * .32 + z * .19, center.z + z];
  vertices.push(...point(-1.4, -1.4), ...point(1.4, -1.4), ...point(-1.4, 1.4));
  vertices.push(...point(1.4, -1.4), ...point(1.4, 1.4), ...point(-1.4, 1.4));
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  const material = new MeshBasicMaterial({ side: DoubleSide }), mesh = new Mesh(geometry, material);
  installPaintedSurface(state.map, state.map, [mesh]);
  cleanup.push(() => { uninstallPaintedSurface(state.map); geometry.dispose(); material.dispose(); });
  return mesh;
}

function isSculptPass(actual: BufferGeometry, source: BufferGeometry): boolean {
  if (actual === source) return true;
  if (actual.userData.unitOutlineSource !== source.uuid) return false;
  expect(actual.getAttribute('position').array).toEqual(source.getAttribute('position').array);
  expect(actual.index?.array).toEqual(source.index?.array);
  return true;
}

describe('painted units through the production unit layer', () => {
  it('keeps floating hulls at the water level even when their footprint meets high ground', () => {
    const { state, kit } = fixture(['trireme']);
    const unit = state.units[0]!, center = cellCenter(unit.col, unit.row);
    slope(state, unit);
    const ship = kit.resolve(unit, 'coast')!;
    for (const moving of [false, true]) {
      expect(paintedUnitSupport(state.map, ship, center.x, center.z, .07, moving)).toBe(.07);
    }
    const land = kit.resolve({ type: 'warrior' })!;
    expect(paintedUnitSupport(state.map, land, center.x, center.z, .07)).toBeGreaterThan(.5);
  });

  it('highlights only the hovered piece across wraps without rebuilding or recolouring another piece', () => {
    const {state, layer, kit, library, build} = fixture(['warrior', 'warrior']);
    build();
    const before = meshes(layer), candidates = layer.modelCandidates();
    const body = before.find(mesh => mesh.material instanceof MeshStandardMaterial)!;
    const shell = before.find(mesh => mesh.material === library.unitOutline)!;
    const widths = shell.geometry.getAttribute('unitOutlineWidth');
    const positions = [...body.instanceMatrix.array], inks = [...shell.instanceColor!.array];
    expect([...widths.array]).toEqual(new Array(6).fill(Math.fround(VIEW3D.units.outlineWidth)));
    layer.setHoveredUnitId(state.units[0]!.id);
    expect([...widths.array]).toEqual([
      ...new Array(3).fill(Math.fround(VIEW3D.units.hoverOutlineWidth)),
      ...new Array(3).fill(Math.fround(VIEW3D.units.outlineWidth)),
    ]);
    layer.setHoveredUnitId(state.units[1]!.id);
    expect([...widths.array]).toEqual([
      ...new Array(3).fill(Math.fround(VIEW3D.units.outlineWidth)),
      ...new Array(3).fill(Math.fround(VIEW3D.units.hoverOutlineWidth)),
    ]);
    expect(meshes(layer)).toEqual(before);
    expect([...body.instanceMatrix.array]).toEqual(positions);
    expect([...shell.instanceColor!.array]).toEqual(inks);
    expect(kit.resolve(state.units[0]!)!.geometry.getAttribute('unitOutlineWidth')).toBeUndefined();
    layer.hide(state.units[1]!.id);
    expect(layer.modelCandidates()).toHaveLength(3);
    expect(layer.modelCandidates().every(candidate => candidate.unitId === state.units[0]!.id)).toBe(true);
    layer.restore(state.units[1]!.id);
    expect(layer.modelCandidates()).toEqual(candidates);
    layer.setHoveredUnitId(null);
    expect([...widths.array]).toEqual(new Array(6).fill(Math.fround(VIEW3D.units.outlineWidth)));
  });

  it('keeps opaque painted faces out of the self-intersecting x-ray pass', () => {
    const {state, layer, library, build} = fixture(['warrior']); build();
    const body = meshes(layer).find(mesh => mesh.material instanceof MeshStandardMaterial)!;
    const material = body.material as MeshStandardMaterial;
    const ghost = library.silhouette(unitColor(state, state.units[0]!));
    expect(material.opacity).toBe(1); expect(material.transparent).toBe(false);
    expect(material.depthWrite).toBe(true); expect(material.stencilWrite).toBe(true);
    expect(material.stencilRef).toBe(ghost.stencilRef);
    expect(material.stencilZPass).toBe(ReplaceStencilOp);
    expect(ghost.stencilFunc).toBe(NotEqualStencilFunc); expect(ghost.stencilWriteMask).toBe(0);
    expect(ghost.depthFunc).toBe(GreaterDepth);
    expect(body.renderOrder).toBe(RENDER_ORDER.unitBody);
  });
  it.each<{ name: string; types: UnitTypeId[] }>([
    { name: 'accepted representatives', types: ['warrior', 'spearman', 'horseman', 'archer', 'horseArcher', 'worker', 'prophet', 'scout', 'settler', 'trader', 'greatPerson', 'warElephant'] },
    { name: 'naval hulls', types: ['trireme', 'bireme', 'galley', 'caravel', 'corvette', 'alexandrianGalley', 'warGalley', 'towerShip', 'carrack', 'shipOfTheLine', 'treasureShip', 'fireShip', 'gunGalley', 'frigate'] },
    { name: 'religious and journey variants', types: ['augur', 'apostle', 'inquisitor', 'canoness', 'rihlaCaravan'] },
    { name: 'siege engines', types: ['catapult', 'trebuchet'] },
    { name: 'mounted variants', types: ['cataphract', 'knight', 'knightsTemplar', 'tangCavalry', 'chanyuGuard', 'gendarme', 'mandekalu', 'whistlingArrow', 'xiongnuHorseArcher', 'camelArcher', 'chariot', 'scythedChariot', 'chariotArcher'] },
    { name: 'anti-cavalry and ranged variants', types: ['phalanx', 'spearWall', 'pikeman', 'fubing', 'ponticPeltast', 'bowman', 'compositeBowman', 'crossbowman', 'slinger'] },
    { name: 'infantry equipment variants', types: ['swordsman', 'legionary', 'longswordsman', 'fireLance', 'khopesh', 'eagleWarrior'] },
  ])('instances $name with lit materials, outlines and ghosts across three wrap copies', ({ types, name }) => {
    const { state, board, layer, kit, library, build } = fixture(types);
    if (name === 'naval hulls') for (const tile of state.map.tiles) tile.terrain = 'coast';
    build();
    const all = meshes(layer); expect(all).toHaveLength(types.length * 3);
    for (const unit of state.units) {
      const model = kit.resolve(unit)!;
      const passes = all.filter(mesh => mesh.geometry.userData.paintedUnitAsset === model.geometry.userData.paintedUnitAsset);
      expect(passes).toHaveLength(3);
      const body = passes.find(mesh => mesh.material instanceof MeshStandardMaterial)!;
      const shell = passes.find(mesh => mesh.material === library.unitOutline)!;
      const ghost = passes.find(mesh => mesh.renderOrder === RENDER_ORDER.silhouette)!;
      expect(body.material).toBe(kit.material(model, unitColor(state, unit)));
      expect(body.castShadow).toBe(true); expect(body.receiveShadow).toBe(true);
      expect(shell.castShadow || shell.receiveShadow || ghost.castShadow || ghost.receiveShadow).toBe(false);
      expect(model.geometry.groups).toHaveLength(0); expect(model.geometry.getAttribute('aHullNormal')).toBeDefined();
      const placement = placePiece(state.map, unit, 0, model), bodyMatrices = matrices(body);
      expect(bodyMatrices).toHaveLength(3);
      for (const [i, copy] of [-1, 0, 1].entries()) {
        const p = new Vector3(), q = new Quaternion(), scale = new Vector3(); bodyMatrices[i]!.decompose(p, q, scale);
        expect(p.x).toBeCloseTo(placement.position.x + copy * wrapWidth(state.map), 5);
        expect(p.y).toBeCloseTo(placement.position.y, 6); expect(p.z).toBeCloseTo(placement.position.z, 6);
        expect(scale.x).toBeCloseTo(1, 6); expect(scale.y).toBeCloseTo(1, 6); expect(scale.z).toBeCloseTo(1, 6);
        expect(Math.abs(q.dot(placement.quaternion))).toBeCloseTo(1, 6);
        expect(matrices(shell)[i]!.equals(bodyMatrices[i]!)).toBe(true);
        expect(matrices(ghost)[i]!.equals(bodyMatrices[i]!)).toBe(true);
      }
    }
    expect(all.some(mesh => mesh.geometry === board.blob || mesh.geometry === board.standee)).toBe(false);
    build(null, false); expect(meshes(layer).every(mesh => !mesh.castShadow && !mesh.receiveShadow)).toBe(true);
  });

  it('preserves ivory/gilt while the primary ink colors enamel and the secondary ink colors only the shell', () => {
    const { state, layer, kit, library, build } = fixture(['settler']); build();
    const model = kit.resolve(state.units[0]!)!, all = meshes(layer);
    const body = all.find(mesh => mesh.material instanceof MeshStandardMaterial)!;
    const shell = all.find(mesh => mesh.material === library.unitOutline)!;
    expect([...body.instanceColor!.array]).toEqual(new Array(9).fill(1));
    expect(body.instanceColor).not.toBe(shell.instanceColor);
    for (let i = 0; i < shell.count; i++) {
      expect(shell.instanceColor!.getX(i)).toBeCloseTo(2, 6);
      expect(shell.instanceColor!.getY(i)).toBeCloseTo(5 / 3, 6);
      expect(shell.instanceColor!.getZ(i)).toBeCloseTo(4 / 3, 6);
    }
    const material = body.material as MeshStandardMaterial;
    const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader } as Parameters<MeshStandardMaterial['onBeforeCompile']>[0];
    material.onBeforeCompile(shader, {} as WebGLRenderer);
    expect(shader.uniforms.paintedUnitBodyColor.value).toEqual(new Color(0x294979));
    expect(material.color.getHex()).toBe(0xffffff);
    const color = model.geometry.getAttribute('color'), mask = model.geometry.getAttribute('paintedOwner');
    for (const pigment of [new Color('#e8d8b2'), new Color('#b69045')]) {
      expect(Array.from({ length: color.count }, (_, i) => i).some(i => mask.getX(i) === 0 &&
        Math.abs(color.getX(i) - pigment.r) + Math.abs(color.getY(i) - pigment.g) + Math.abs(color.getZ(i) - pigment.b) < 1e-6)).toBe(true);
    }
  });

  it('draws no remembered or hidden units and includes all three passes only at current visibility', () => {
    const { state, layer, kit, build } = fixture(['warrior', 'worker', 'settler']);
    const levels = new Array<number>(state.map.tiles.length).fill(HIDDEN);
    levels[tileIndex(state.map, state.units[1]!.col, 2)] = EXPLORED;
    levels[tileIndex(state.map, state.units[2]!.col, 2)] = VISIBLE;
    build(levels, true, true);
    const all = meshes(layer);
    expect(all.some(mesh => mesh.geometry === kit.resolve(state.units[0]!)!.geometry)).toBe(false);
    expect(all.some(mesh => mesh.geometry === kit.resolve(state.units[1]!)!.geometry)).toBe(false);
    expect(all.filter(mesh => isSculptPass(mesh.geometry, kit.resolve(state.units[2]!)!.geometry))).toHaveLength(3);
    levels.fill(EXPLORED); build(levels, true, true); expect(meshes(layer)).toHaveLength(0);
    levels.fill(HIDDEN); build(levels, true, true); expect(meshes(layer)).toHaveLength(0);
    build(null, true, true);
    for (const unit of state.units) expect(meshes(layer).filter(mesh => isSculptPass(mesh.geometry, kit.resolve(unit)!.geometry))).toHaveLength(3);
  });

  it('hides and restores the body, outline, ghost, badge, charge and HP bar together across a rebuild', () => {
    const { state, board, layer, kit, build } = fixture(['worker']);
    const unit = state.units[0]!; unit.chargesLeft = 2; unit.hp = Math.floor(unitDef(unit.type).maxHp / 2);
    build(null, true, true);
    const before = meshes(layer).map(mesh => ({ geometry: mesh.geometry, material: mesh.material, matrices: matrices(mesh) }));
    expect(before.filter(part => isSculptPass(part.geometry, kit.resolve(unit)!.geometry))).toHaveLength(3);
    expect(before.some(part => part.geometry === board.badgeIcons[badgeClassFor(unit.type)])).toBe(true);
    expect(before.some(part => part.geometry === board.numeralMarkers[2])).toBe(true);
    expect(before.filter(part => part.geometry === board.bar)).toHaveLength(2);
    layer.hide(unit.id);
    for (const mesh of meshes(layer)) for (const matrix of matrices(mesh)) expect(matrix.determinant()).toBe(0);
    build(null, true, true);
    for (const mesh of meshes(layer)) for (const matrix of matrices(mesh)) expect(matrix.determinant()).toBe(0);
    layer.restore(unit.id);
    for (const mesh of meshes(layer)) {
      const saved = before.find(part => (part.geometry === mesh.geometry || (part.geometry.userData.unitOutlineSource && part.geometry.userData.unitOutlineSource === mesh.geometry.userData.unitOutlineSource)) && part.material === mesh.material)!;
      expect(saved).toBeDefined(); expect(matrices(mesh).map(matrix => matrix.elements)).toEqual(saved.matrices.map(matrix => matrix.elements));
    }
  });

  it('places stacked badge targets over the actual model height and the exact rendered instance', () => {
    const { state, board, layer, kit, build } = fixture(['settler', 'warrior']);
    state.units[1]!.col = state.units[0]!.col;
    slope(state, state.units[0]!); build(null, true, true);
    const callback = vi.fn((_type: UnitTypeId, unit: Unit) => kit.resolve(unit, terrainUnder(state.map, unit))?.height ?? pieceHeightFor(unit.type));
    const anchors = badgeAnchors(state, 0, callback, kit);
    expect(anchors).toHaveLength(6); expect(callback).toHaveBeenCalledTimes(2);
    for (const unit of state.units) {
      const model = kit.resolve(unit)!, body = meshes(layer).find(mesh => mesh.geometry === model.geometry && mesh.material instanceof MeshStandardMaterial)!;
      const disc = meshes(layer).find(mesh => mesh.geometry === board.badgeIcons[badgeClassFor(unit.type)])!;
      for (const [i, matrix] of matrices(body).entries()) {
        const p = new Vector3().setFromMatrixPosition(matrix), badge = new Vector3().setFromMatrixPosition(matrices(disc)[i]!);
        const anchor = anchors.filter(anchor => anchor.unitId === unit.id)[i]!;
        expect(anchor.x).toBeCloseTo(p.x, 5); expect(anchor.z).toBeCloseTo(p.z, 5);
        expect(anchor.y).toBeCloseTo(p.y + badgeCenterY(model.height), 6);
        expect(anchor.x).toBeCloseTo(badge.x, 5); expect(anchor.y).toBeCloseTo(badge.y, 6); expect(anchor.z).toBeCloseTo(badge.z, 5);
      }
    }
  });

  it('instances shared transports and ordinary trading wagons with their original unit IDs', () => {
    const { state, layer, kit, build } = fixture(['worker', 'settler', 'trader', 'rihlaCaravan']);
    for (const unit of state.units.slice(0, 2)) state.map.tiles[tileIndex(state.map, unit.col, 2)]!.terrain = 'coast';
    for (const unit of state.units.slice(2)) unit.trade = {} as NonNullable<Unit['trade']>;
    build();
    const boat = kit.resolve(state.units[0]!, 'coast')!;
    expect(meshes(layer).filter(mesh => isSculptPass(mesh.geometry, boat.geometry))).toHaveLength(3);
    for (const unit of state.units) {
      const model = kit.resolve(unit, terrainUnder(state.map, unit))!;
      const candidates = layer.modelCandidates().filter(candidate => candidate.unitId === unit.id);
      expect(candidates).toHaveLength(3);
      expect(candidates.every(candidate => candidate.object.geometry === model.geometry)).toBe(true);
      expect(model.geometry.userData.paintedUnitAsset).toBe(unit.type === 'worker' || unit.type === 'settler' ? 'embarked' : unit.type);
    }
  });

  it('fits plinths and all wagon wheel contacts to terrain triangles and reuses resting samples', () => {
    for (const type of ['warrior', 'trader', 'rihlaCaravan'] as const) {
      const { state, layer, kit, build } = fixture([type]);
      const unit = state.units[0]!, mesh = slope(state, unit), model = kit.resolve(unit)!;
      const before = JSON.stringify(state.map); build();
      const placement = placePiece(state.map, unit, 0, model);
      const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
      let highestSupport = -Infinity;
      for (const contact of model.contacts) {
        const rotated = new Vector3(...contact).applyQuaternion(placement.quaternion);
        ray.ray.origin.set(placement.position.x + rotated.x, 10, placement.position.z + rotated.z);
        const actual = ray.intersectObject(mesh)[0]!.point.y;
        highestSupport = Math.max(highestSupport, actual - rotated.y);
        expect(placement.position.y + rotated.y - actual).toBeGreaterThanOrEqual(.002 - 1e-7);
      }
      expect(placement.position.y).toBeCloseTo(highestSupport + .002, 8);
      expect(placement.position.y - .5).toBeGreaterThan(.05);
      const body = meshes(layer).find(part => part.geometry === model.geometry && part.material instanceof MeshStandardMaterial)!;
      expect(matrices(body)[1]!.elements[13]).toBeCloseTo(placement.position.y, 6);
      const cast = vi.spyOn(mesh, 'raycast');
      const samples = vi.spyOn(surfaceQueries, 'samplePaintedWorld'); samples.mockClear();
      expect(paintedUnitSupport(state.map, model, placement.position.x, placement.position.z, 0)).toBe(placement.position.y);
      expect(samples).not.toHaveBeenCalled();
      expect(Number.isFinite(paintedUnitSupport(state.map, model, placement.position.x + .1, placement.position.z, 0, true))).toBe(true);
      expect(samples.mock.calls.length).toBeGreaterThan(0); expect(samples.mock.calls.length).toBeLessThanOrEqual(24);
      expect(cast).not.toHaveBeenCalled();
      expect(JSON.stringify(state.map)).toBe(before);
    }
  });
});
