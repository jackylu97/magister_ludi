/**
 * The garrison badge: the roundel of whatever is holding a town, over that
 * town's banner (`src/render3d/garrison3d.ts`, the user's ruling of 2026-09-09;
 * `docs/flags.md` (hhh) 6).
 *
 * Two properties, pulling opposite ways, exactly as `cities3d.test.ts` splits
 * them:
 *
 *   the picture      a tag appears when something walks in, goes when it walks
 *                    out, wears the *piece's* seat colour rather than the
 *                    town's, and is not drawn at all on ground this seat is not
 *                    watching.
 *   the fingerprint  `signGarrisons` moves on exactly what the picture is a
 *                    function of, and on nothing else — a scout crossing empty
 *                    ground on the far side of the map must not repaint every
 *                    banner in the world, which is the whole reason this layer
 *                    is not hung off `signUnits`.
 *
 * Real three.js, no WebGL context: assertions read `InstancedMesh.count`,
 * `.geometry` and `.instanceColor` off the built group, which is the whole of
 * how this tier tests a renderer.
 */

import { describe, expect, it } from 'vitest';
import { InstancedMesh, MeshBasicMaterial, Quaternion } from 'three';

import type { TileIcons, UnitBadges } from '../../src/render3d/badges3d';
import { BoardGeometry, badgeClassFor } from '../../src/render3d/board3d';
import { GarrisonLayer, signGarrisons, strongestGarrison } from '../../src/render3d/garrison3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { playerColor } from '../../src/render3d/cities3d';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { type GameState, createUnit, newGame } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
}

/** Stand-ins for the two atlases; the layer only ever wants a material off them. */
const fakeBadges = {
  materialFor: () => new MeshBasicMaterial(),
} as unknown as UnitBadges;
const fakeIcons = {
  material: new MeshBasicMaterial(),
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;

/** One town for seat 0, in full view of its owner. Nothing standing in it. */
function townState(): GameState {
  const state = newGame({
    seed: 9,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 14, height: 10, terrain: 'grassland' });
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  state.nextEntityId = 1;
  foundCityAt(state, 0, getTileAt(state.map, 6, 5)!);
  state.visibility[0]!.fill(VISIBLE);
  return state;
}

interface Built {
  layer: GarrisonLayer;
  geometry: BoardGeometry;
  meshes: InstancedMesh[];
  /** Instance count per geometry — "the shapes it drew". */
  shapes: Map<unknown, number>;
}

function build(state: GameState, seat = 0, icons: TileIcons | null = fakeIcons): Built {
  const geometry = new BoardGeometry();
  const layer = new GarrisonLayer();
  layer.build(
    state,
    geometry,
    materials(),
    new Quaternion(),
    false,
    fakeBadges,
    state.visibility[seat] ?? null,
    icons,
  );
  const meshes: InstancedMesh[] = [];
  const shapes = new Map<unknown, number>();
  for (const child of layer.group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    meshes.push(child);
    shapes.set(child.geometry, (shapes.get(child.geometry) ?? 0) + child.count);
  }
  return { layer, geometry, meshes, shapes };
}

/** How many instances of one shape a build drew, across all three wrap copies. */
function drew(built: Built, shape: unknown): number {
  return built.shapes.get(shape) ?? 0;
}

describe('the tag over the banner', () => {
  it('draws nothing over an empty town', () => {
    const built = build(townState());
    expect(drew(built, built.geometry.badgeRim)).toBe(0);
    built.layer.dispose();
  });

  it('appears when a unit stands on the town’s hex, and goes when it leaves', () => {
    const state = townState();
    const guard = createUnit(state, 0, 'warrior', 6, 5);
    const held = build(state);
    // Three wrap copies of the disc and three of the rim.
    expect(drew(held, held.geometry.badgeIcons[badgeClassFor('warrior')])).toBe(3);
    expect(drew(held, held.geometry.badgeRim)).toBe(3);
    held.layer.dispose();

    guard.col = 7;
    const gone = build(state);
    expect(drew(gone, gone.geometry.badgeRim)).toBe(0);
    gone.layer.dispose();
  });

  it('draws nothing for a unit merely standing beside the town', () => {
    const state = townState();
    createUnit(state, 0, 'warrior', 7, 5);
    const built = build(state);
    expect(drew(built, built.geometry.badgeRim)).toBe(0);
    built.layer.dispose();
  });

  it('is hidden on ground this seat is not watching', () => {
    const state = townState();
    createUnit(state, 0, 'warrior', 6, 5);
    // A garrison is an army, and an army is not something a chart remembers —
    // so an *explored* town is as bare as an unseen one.
    state.visibility[0]!.fill(HIDDEN);
    const built = build(state);
    expect(drew(built, built.geometry.badgeRim)).toBe(0);
    built.layer.dispose();
  });

  it('flies no tag at all while the badge atlas is still loading', () => {
    const state = townState();
    createUnit(state, 0, 'warrior', 6, 5);
    const geometry = new BoardGeometry();
    const layer = new GarrisonLayer();
    layer.build(state, geometry, materials(), new Quaternion(), false, null, state.visibility[0]!, null);
    expect(layer.group.children).toHaveLength(0);
    layer.dispose();
  });
});

describe('whose tag it is', () => {
  /**
   * The rim is one bucket per ink (`instances.ts`: the colour list is part of
   * the bucket key), so "whose colour is it" is read off the bucket's own
   * material — which is exactly how the badges on the ground are told apart.
   */
  function rimInk(built: Built): number | null {
    const rim = built.meshes.find((mesh) => mesh.geometry === built.geometry.badgeRim);
    const material = rim?.material as { color?: { getHex(): number } } | undefined;
    return material?.color ? material.color.getHex() : null;
  }

  it('takes the piece’s seat colour, not the town’s', () => {
    const mine = townState();
    createUnit(mine, 0, 'warrior', 6, 5);
    const held = build(mine);

    // The same town, with seat 1's piece standing in it — the picture a captured
    // town makes before its captor has walked in.
    const theirs = townState();
    createUnit(theirs, 1, 'warrior', 6, 5);
    const taken = build(theirs);

    expect(rimInk(held)).toBe(playerColor(mine, 0));
    expect(rimInk(taken)).toBe(playerColor(theirs, 1));
    expect(rimInk(held)).not.toBe(rimInk(taken));
    held.layer.dispose();
    taken.layer.dispose();
  });
});

describe('a stack in one town', () => {
  it('names the strongest piece, by the roster’s own figure', () => {
    const state = townState();
    const scout = createUnit(state, 0, 'scout', 6, 5);
    const guard = createUnit(state, 0, 'warrior', 6, 5);
    expect(unitDef('warrior').combatStrength).toBeGreaterThan(unitDef('scout').combatStrength);
    expect(strongestGarrison([scout, guard])?.id).toBe(guard.id);
    // And the order they were founded in makes no difference to the answer.
    expect(strongestGarrison([guard, scout])?.id).toBe(guard.id);
  });

  it('breaks a tie by the order the pieces are iterated in, never by a sort', () => {
    const state = townState();
    const first = createUnit(state, 0, 'warrior', 6, 5);
    createUnit(state, 0, 'warrior', 6, 5);
    expect(strongestGarrison(state.units)?.id).toBe(first.id);
  });

  it('bosses the badge with a count once more than one is in', () => {
    const state = townState();
    createUnit(state, 0, 'warrior', 6, 5);
    const alone = build(state);
    expect(drew(alone, alone.geometry.numeralMarkers[2]!)).toBe(0);
    alone.layer.dispose();

    createUnit(state, 0, 'warrior', 6, 5);
    const pair = build(state);
    expect(drew(pair, pair.geometry.numeralMarkers[2]!)).toBe(3);
    pair.layer.dispose();
  });

  it('draws the badge without its count while the tile atlas is still loading', () => {
    const state = townState();
    createUnit(state, 0, 'warrior', 6, 5);
    createUnit(state, 0, 'warrior', 6, 5);
    const built = build(state, 0, null);
    expect(drew(built, built.geometry.badgeRim)).toBe(3);
    expect(drew(built, built.geometry.numeralMarkers[2]!)).toBe(0);
    built.layer.dispose();
  });
});

describe('the fingerprint', () => {
  const facts: [string, (state: GameState) => void][] = [
    ['a piece walking in', (s) => void createUnit(s, 0, 'warrior', 6, 5)],
    [
      'a second piece joining it',
      (s) => {
        createUnit(s, 0, 'warrior', 6, 5);
        s.units.push(createUnit(s, 0, 'warrior', 6, 5));
      },
    ],
    ['the town changing hands', (s) => void (s.cities[0]!.ownerId = 1)],
  ];

  for (const [what, mutate] of facts) {
    it(`moves on ${what}`, () => {
      const state = townState();
      const before = signGarrisons(state);
      mutate(state);
      expect(signGarrisons(state)).not.toBe(before);
    });
  }

  it('moves when a stronger piece arrives and changes which badge is drawn', () => {
    const state = townState();
    createUnit(state, 0, 'scout', 6, 5);
    const scouted = signGarrisons(state);
    createUnit(state, 0, 'warrior', 6, 5);
    expect(signGarrisons(state)).not.toBe(scouted);
  });

  /**
   * The property this layer exists to have: it is **not** `signUnits`. A scout
   * crossing empty ground moves that one and must not move this one, or every
   * banner on the map repaints on every step anybody takes.
   */
  it('stands still while the world walks around it', () => {
    const state = townState();
    const wanderer = createUnit(state, 0, 'scout', 2, 2);
    const before = signGarrisons(state);
    wanderer.col = 3;
    wanderer.hp -= 5;
    state.turn += 4;
    state.cities[0]!.population += 1;
    expect(signGarrisons(state)).toBe(before);
  });
});

describe('the tunables', () => {
  it('hangs the tag clear above the pole the banner flies from', () => {
    const city = VIEW3D.city;
    expect(city.garrisonRise).toBeGreaterThan(0);
    // Above the flag, which hangs `flagDrop` below the pole's top: the two can
    // never overlap however either is dialled.
    expect(city.garrisonRise + city.flagDrop).toBeGreaterThan(0);
    // The count is a boss on the badge, so it is smaller than what it bosses.
    expect(city.garrisonCountSize).toBeLessThan(city.garrisonSize);
  });
});
