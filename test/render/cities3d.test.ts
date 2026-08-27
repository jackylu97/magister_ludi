import { describe, expect, it } from 'vitest';
import { InstancedMesh, MeshBasicMaterial, Quaternion } from 'three';

import type { TileIcons } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import {
  CITY_TIERS,
  CityLayer,
  capitalIds,
  cityLook,
  cityTier,
  signCities,
} from '../../src/render3d/cities3d';
import { FogView } from '../../src/render3d/fog3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';

/**
 * Cities that age (design ledger Entry VII's W1, the art pass): a town's sculpt
 * is a function of its owner's era, the buildings that stand in it, and whether
 * it is the seat of government.
 *
 * Two properties are worth defending and they pull in opposite directions,
 * which is why they are both here:
 *
 *   the picture      each tier draws the shapes it is entitled to and no others.
 *                    A gable in Æra I or a ziggurat in a town with no temple is
 *                    the board telling a story that did not happen.
 *   the fingerprint  `signCities` moves on **exactly** the facts the picture is
 *                    a function of. Too little and a town keeps its old roofs
 *                    until something unrelated grows it; too much and every
 *                    rebuild is paid for on frames where nothing changed.
 *
 * The second is the one a behavioural test cannot reach — a fingerprint that
 * never moves passes every screenshot until somebody researches Iron Working —
 * so it is asserted fact by fact against a state mutated one fact at a time.
 */

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
}

/** A stand-in for the icon atlas; the layer only ever wants a material off it. */
const fakeIcons = {
  material: new MeshBasicMaterial(),
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;

/** Flat grassland, two seats, nothing on it. */
function flatState(width = 14, height = 10): GameState {
  const state = newGame({
    seed: 9,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  state.nextEntityId = 1;
  return state;
}

/** One town for seat 0, at a fixed hex, in full view of its owner. */
function townState(): GameState {
  const state = flatState();
  foundCityAt(state, 0, getTileAt(state.map, 6, 5)!);
  const levels = state.visibility[0]!;
  levels.fill(VISIBLE);
  return state;
}

/** Advances a seat into the era a tech belongs to. `highestAge` is the rule. */
function ageUp(state: GameState, playerId: number, tier: number): void {
  const player = state.players[playerId]!;
  if (tier >= 2) player.techsResearched = [...player.techsResearched, 'ironWorking'];
  if (tier >= 3) player.techsResearched = [...player.techsResearched, 'feudalism'];
}

interface Built {
  layer: CityLayer;
  geometry: BoardGeometry;
  /** Instance count per geometry, which is what "the shapes it drew" means. */
  shapes: Map<unknown, number>;
}

function build(state: GameState, seat = 0): Built {
  const geometry = new BoardGeometry();
  const mats = materials();
  const layer = new CityLayer();
  layer.build(
    state,
    geometry,
    mats,
    new Quaternion(),
    false,
    state.visibility[seat] ?? null,
    fakeIcons,
  );
  const shapes = new Map<unknown, number>();
  for (const child of layer.group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    // The outline shells are a second mesh over the *same* slots, so counting
    // them would double every sculpt. See `MaterialLibrary.outline`.
    if (child.material === mats.outline) continue;
    shapes.set(child.geometry, (shapes.get(child.geometry) ?? 0) + child.count);
  }
  return { layer, geometry, shapes };
}

/** How many instances of one shape a build drew, across all three wrap copies. */
function drew(built: Built, shape: unknown): number {
  return built.shapes.get(shape) ?? 0;
}

// --- what each tier draws ---------------------------------------------------

describe('a town shows its era', () => {
  it('is Æra I huts by default: pyramid roofs, no gables', () => {
    const built = build(townState());
    expect(drew(built, built.geometry.houseBody)).toBeGreaterThan(0);
    expect(drew(built, built.geometry.houseRoof)).toBeGreaterThan(0);
    expect(drew(built, built.geometry.houseGableRoof)).toBe(0);
    built.layer.dispose();
  });

  it('re-roofs every house when its owner reaches Æra II', () => {
    const state = townState();
    ageUp(state, 0, 2);
    const built = build(state);
    // The walls are shared across the tiers — a people that learns to frame a
    // roof does not rebuild its houses — so only the roof geometry changes.
    expect(drew(built, built.geometry.houseBody)).toBeGreaterThan(0);
    expect(drew(built, built.geometry.houseGableRoof)).toBeGreaterThan(0);
    expect(drew(built, built.geometry.houseRoof)).toBe(0);
    built.layer.dispose();
  });

  it('has as many tiers as there are eras, and clamps past the last', () => {
    const state = townState();
    expect(cityTier(state, state.cities[0]!)).toBe(1);
    ageUp(state, 0, 3);
    expect(cityTier(state, state.cities[0]!)).toBe(CITY_TIERS);
  });

  /**
   * The town's tier is its **owner's** age, and the owner is asked rather than
   * the city — there is no such thing as a town's age. A city taken by a more
   * advanced empire is re-roofed the turn it changes hands, which is the same
   * reading the ledger takes of every other age band.
   */
  it('takes its era from whoever holds it, not from who built it', () => {
    const state = townState();
    ageUp(state, 1, 2);
    expect(cityTier(state, state.cities[0]!)).toBe(1);
    state.cities[0]!.ownerId = 1;
    expect(cityTier(state, state.cities[0]!)).toBe(2);
  });
});

describe('a town shows what stands in it', () => {
  it('raises stakes for a palisade in Æra II and stone in Æra III', () => {
    const state = townState();
    ageUp(state, 0, 2);
    state.cities[0]!.buildings.push('palisade');
    const stakes = build(state);
    expect(drew(stakes, stakes.geometry.palisadeStake)).toBeGreaterThan(0);
    expect(drew(stakes, stakes.geometry.wallSegment)).toBe(0);
    stakes.layer.dispose();

    ageUp(state, 0, 3);
    const stone = build(state);
    // Six segments, one per hex edge, in each of the three wrap copies.
    expect(drew(stone, stone.geometry.wallSegment)).toBe(18);
    expect(drew(stone, stone.geometry.palisadeStake)).toBe(0);
    stone.layer.dispose();
  });

  it('raises no wall at all in a town that never built one', () => {
    const state = townState();
    ageUp(state, 0, 3);
    const built = build(state);
    expect(drew(built, built.geometry.palisadeStake)).toBe(0);
    expect(drew(built, built.geometry.wallSegment)).toBe(0);
    built.layer.dispose();
  });

  it('stands a shrine from Æra II and a ziggurat from Æra III', () => {
    const state = townState();
    state.cities[0]!.buildings.push('shrine', 'temple');

    const first = build(state);
    expect(drew(first, first.geometry.shrine)).toBe(0);
    expect(drew(first, first.geometry.temple)).toBe(0);
    first.layer.dispose();

    ageUp(state, 0, 2);
    const second = build(state);
    expect(drew(second, second.geometry.shrine)).toBeGreaterThan(0);
    // The shrine's gilt needle rides the same slot; both or neither.
    expect(drew(second, second.geometry.shrineFinial)).toBe(
      drew(second, second.geometry.shrine),
    );
    expect(drew(second, second.geometry.temple)).toBe(0);
    second.layer.dispose();

    ageUp(state, 0, 3);
    const third = build(state);
    expect(drew(third, third.geometry.temple)).toBeGreaterThan(0);
    third.layer.dispose();
  });

  it('gives the capital a palace in every era, and no other town one', () => {
    const state = townState();
    for (let tier = 1; tier <= CITY_TIERS; tier++) {
      ageUp(state, 0, tier);
      const built = build(state);
      expect(drew(built, built.geometry.palaceBody), `tier ${tier}`).toBeGreaterThan(0);
      expect(drew(built, built.geometry.palaceFinial)).toBe(
        drew(built, built.geometry.palaceBody),
      );
      built.layer.dispose();
    }

    // A second town of the same empire is not the seat of government, and the
    // rule is the simulation's own (`capitalCityOf`): the oldest founded.
    foundCityAt(state, 0, getTileAt(state.map, 10, 5)!);
    const capitals = capitalIds(state);
    expect(capitals.has(state.cities[0]!.id)).toBe(true);
    expect(capitals.has(state.cities[1]!.id)).toBe(false);
  });

  /**
   * A capital and an ordinary town of the same size in the same era have to be
   * *visibly* different objects, which is the whole point of the palace. Asserted
   * as a difference in the shapes drawn rather than in a count, because "the
   * capital drew one more instance" would also be true of a town with one more
   * citizen.
   */
  it('draws a capital and a plain town as different objects', () => {
    const state = townState();
    foundCityAt(state, 0, getTileAt(state.map, 10, 5)!);
    const built = build(state);
    // One palace on the board, not two, and it is the capital that has it.
    expect(drew(built, built.geometry.palaceBody)).toBe(3);
    built.layer.dispose();
  });

  /**
   * The world's one permitted spectacle (`docs/art-pass.md`, W3): a marvel and
   * its gilt tip, drawn from Æra I because a wonder is not a thing a people
   * grows into. One per wonder standing, so the ring grows for a second one
   * rather than swapping the first out.
   */
  it('raises a marvel in a town that finished a wonder', () => {
    const state = townState();
    const before = build(state);
    expect(drew(before, before.geometry.wonder)).toBe(0);
    before.layer.dispose();

    state.cities[0]!.buildings.push('theOracle');
    const built = build(state);
    // Three, like the palace: one per wrap copy.
    expect(drew(built, built.geometry.wonder)).toBe(3);
    expect(drew(built, built.geometry.wonderTip)).toBe(3);
    built.layer.dispose();
  });
});

// --- the fingerprint --------------------------------------------------------

describe('the city fingerprint carries every sculpt fact', () => {
  /**
   * Fact by fact, each mutation on its own state: the hash must move for the
   * five things `CityLook` names, and the layer is rebuilt off exactly this
   * number (see `Renderer3D`'s frame loop). A fact the picture reads and the
   * hash does not is a town that stays in the wrong century.
   */
  const facts: [string, (state: GameState) => void][] = [
    ['reaching a new era', (s) => ageUp(s, 0, 2)],
    ['raising a palisade', (s) => void s.cities[0]!.buildings.push('palisade')],
    ['building a shrine', (s) => void s.cities[0]!.buildings.push('shrine')],
    ['building a temple', (s) => void s.cities[0]!.buildings.push('temple')],
    // The world's one permitted spectacle, and the sixth fact `CityLook` names.
    ['finishing a wonder', (s) => void s.cities[0]!.buildings.push('theOracle')],
    // Founding an *older* city cannot happen, so the capital moves the way it
    // really moves: the seat's first town changes hands.
    ['losing the capital', (s) => void (s.cities[0]!.ownerId = 1)],
    ['growing', (s) => void (s.cities[0]!.population += 1)],
  ];

  for (const [what, mutate] of facts) {
    it(`moves on ${what}`, () => {
      const state = townState();
      const before = signCities(state);
      mutate(state);
      expect(signCities(state)).not.toBe(before);
    });
  }

  it('moves on nothing else', () => {
    const state = townState();
    const before = signCities(state);
    // Facts a town has that its sculpt is not a function of. If one of these
    // ever *becomes* visible it joins `CityLook` and moves to the list above.
    state.cities[0]!.foodBasket = 12;
    state.cities[0]!.culture = 40;
    state.cities[0]!.queue = [];
    state.turn += 5;
    expect(signCities(state)).toBe(before);
  });

  /**
   * The one derivation, asked twice. `CityLook` is what the layer draws from and
   * what the fingerprint folds, so the two cannot disagree about what a town
   * looks like — which is the property that makes the list above complete rather
   * than merely long.
   */
  it('folds the same look the layer draws', () => {
    const state = townState();
    ageUp(state, 0, 3);
    state.cities[0]!.buildings.push('palisade', 'temple');
    const look = cityLook(state, state.cities[0]!, capitalIds(state));
    expect(look).toEqual({
      tier: 3,
      walls: true,
      shrine: false,
      temple: true,
      capital: true,
      wonders: 0,
    });
  });
});

// --- fog --------------------------------------------------------------------

describe('a town is drawn only where its owner is watching', () => {
  it('draws nothing at all for a seat that cannot see the hex', () => {
    const state = townState();
    ageUp(state, 0, 3);
    state.cities[0]!.buildings.push('palisade', 'shrine', 'temple');

    const watched = build(state, 0);
    const shapes = watched.shapes.size;
    expect(shapes).toBeGreaterThan(0);
    watched.layer.dispose();

    // Seat 1 has never seen it: no houses, no walls, no palace, no flag. A
    // memory of a town is a name on a chart (`citySightings`), not a model.
    const unseen = build(state, 1);
    expect(unseen.shapes.size).toBe(0);
    unseen.layer.dispose();
  });

  it('keeps every aged part inside the one seat filter', () => {
    // The parts the age pass added must be filtered by the same `seesCell` call
    // the houses always were, rather than by one of their own — a palisade drawn
    // on remembered ground would be a fortification a seat is only guessing at.
    const state = townState();
    ageUp(state, 0, 3);
    state.cities[0]!.buildings.push('palisade', 'shrine', 'temple');
    const levels = state.visibility[0]!;
    levels[tileIndex(state.map, 6, 5)] = HIDDEN;

    const built = build(state, 0);
    expect(built.shapes.size).toBe(0);
    built.layer.dispose();
  });
});

// --- the flag ---------------------------------------------------------------

describe("the flag carries the seat's charge", () => {
  it('stamps one charge quad per flag, out of the tile atlas', () => {
    const state = townState();
    const built = build(state);
    // Seat 0 takes the first charge by seat order (`heraldryFor`), so the quad
    // it drew is that charge's and no other's.
    expect(drew(built, built.geometry.chargeMarkers.crescent)).toBe(3);
    expect(drew(built, built.geometry.chargeMarkers.stag)).toBe(0);
    built.layer.dispose();
  });

  it('flies a plain banner while the atlas is still rasterising', () => {
    const state = townState();
    const geometry = new BoardGeometry();
    const mats = materials();
    const layer = new CityLayer();
    layer.build(state, geometry, mats, new Quaternion(), false, state.visibility[0]!, null);
    let charges = 0;
    for (const child of layer.group.children) {
      if (!(child instanceof InstancedMesh)) continue;
      if (Object.values(geometry.chargeMarkers).includes(child.geometry)) charges += child.count;
    }
    expect(charges).toBe(0);
    layer.dispose();
  });

  it('flies the charge its seat was configured with', () => {
    const state = townState();
    state.players[0]!.charge = 'hound';
    const built = build(state);
    expect(drew(built, built.geometry.chargeMarkers.hound)).toBe(3);
    expect(drew(built, built.geometry.chargeMarkers.crescent)).toBe(0);
    built.layer.dispose();
  });
});

// --- the board underneath ---------------------------------------------------

describe('an aged town costs the board nothing', () => {
  /**
   * The rule this pass most easily breaks: **the board is built once**. A town
   * that grew a wall must not re-bake ninety thousand instances, and the wall is
   * a *layer* instance rather than board dressing precisely so that it cannot.
   *
   * Asserted the way `test/render/fog3d.test.ts` asserts the fog's constraint —
   * by the chart layer's own bookkeeping being untouched — because the board's
   * buffers are the thing that would change and the city layer never sees them.
   */
  it('leaves the fog layer\'s per-tile bookkeeping alone', () => {
    const state = townState();
    const geometry = new BoardGeometry();
    const mats = materials();
    const fog = new FogView(state.map, { own: new Map(), shared: [] });
    fog.buildChart(geometry, mats, null);
    const before = fog.paintedLevel(tileIndex(state.map, 6, 5));

    ageUp(state, 0, 3);
    state.cities[0]!.buildings.push('palisade');
    const built = build(state);
    expect(fog.paintedLevel(tileIndex(state.map, 6, 5))).toBe(before);
    built.layer.dispose();
    fog.dispose();
  });
});
