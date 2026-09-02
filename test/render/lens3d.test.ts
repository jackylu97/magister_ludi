import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';

import { type TileIcons, tileIconFlags } from '../../src/render3d/badges3d';
import { BoardGeometry, buildBoard } from '../../src/render3d/board3d';
import { RENDER_ORDER } from '../../src/render3d/instances';
import { cellCenter } from '../../src/render3d/layout';
import { LensLayer, NO_LENS, sameLens, signReligion } from '../../src/render3d/lens3d';
import { playerColor } from '../../src/render3d/cities3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { foundCityAt } from '../../src/sim/cities';
import { type GameState, newGame } from '../../src/sim/state';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import type { LensView } from '../../src/ui/mapView';

function lens(overrides: Partial<LensView> = {}): LensView {
  return { ...NO_LENS, ...overrides };
}

/**
 * `sameLens` is the guard on a rebuild that throws away and remakes a few
 * thousand instances, so it has to be exactly right in both directions: a false
 * "same" leaves a stale picture on the board, and a false "different" rebuilds
 * the layer on every mouse move.
 */
describe('sameLens', () => {
  it('is true for the plain board against itself', () => {
    expect(sameLens(NO_LENS, lens())).toBe(true);
  });

  it('separates the lens mode from the two switches', () => {
    expect(sameLens(lens({ mode: 'none' }), lens({ mode: 'settler' }))).toBe(false);
    expect(sameLens(lens({ yields: false }), lens({ yields: true }))).toBe(false);
    expect(sameLens(lens({ resources: false }), lens({ resources: true }))).toBe(false);
    // All three are independent, so a lens with a switch up is not the lens
    // without it.
    expect(
      sameLens(lens({ mode: 'settler', yields: true }), lens({ mode: 'settler' })),
    ).toBe(false);
    expect(
      sameLens(lens({ mode: 'settler', resources: true }), lens({ mode: 'settler' })),
    ).toBe(false);
  });

  it('notices the seat, because the settler lens judges ownership by it', () => {
    expect(sameLens(lens({ playerId: 0 }), lens({ playerId: 1 }))).toBe(false);
  });

  it('compares the wash restriction by value, not by identity', () => {
    const a = lens({ mode: 'settler', cells: [{ col: 1, row: 2 }] });
    const b = lens({ mode: 'settler', cells: [{ col: 1, row: 2 }] });
    expect(sameLens(a, b)).toBe(true);
    expect(sameLens(a, lens({ mode: 'settler', cells: [{ col: 1, row: 3 }] }))).toBe(false);
    expect(sameLens(a, lens({ mode: 'settler', cells: null }))).toBe(false);
    expect(
      sameLens(a, lens({ mode: 'settler', cells: [{ col: 1, row: 2 }, { col: 2, row: 2 }] })),
    ).toBe(false);
  });

  it('compares the pip restriction the same way, while the pips are up', () => {
    const a = lens({ yields: true, yieldCells: [{ col: 4, row: 4 }] });
    expect(sameLens(a, lens({ yields: true, yieldCells: [{ col: 4, row: 4 }] }))).toBe(true);
    expect(sameLens(a, lens({ yields: true, yieldCells: [{ col: 5, row: 4 }] }))).toBe(false);
    expect(sameLens(a, lens({ yields: true, yieldCells: null }))).toBe(false);
  });

  it('ignores the pip restriction while the pips are down', () => {
    // Nothing is drawn from it, so a change to it is not a change to look at.
    const off = lens({ yields: false, yieldCells: [{ col: 4, row: 4 }] });
    expect(sameLens(off, lens({ yields: false, yieldCells: null }))).toBe(true);
  });

  it('compares the roundel restriction the same way, and only while they are up', () => {
    const a = lens({ resources: true, resourceCells: [{ col: 4, row: 4 }] });
    expect(sameLens(a, lens({ resources: true, resourceCells: [{ col: 4, row: 4 }] }))).toBe(true);
    expect(sameLens(a, lens({ resources: true, resourceCells: [{ col: 5, row: 4 }] }))).toBe(false);
    expect(sameLens(a, lens({ resources: true, resourceCells: null }))).toBe(false);
    const off = lens({ resources: false, resourceCells: [{ col: 4, row: 4 }] });
    expect(sameLens(off, lens({ resources: false, resourceCells: null }))).toBe(true);
  });

  it('notices the reveal, and only while the roundels are up', () => {
    // The mapgen page's spectator switch (`LensView.revealResources`): it changes
    // which markers are drawn, so it is a rebuild — but with the roundels down
    // there are no markers for it to change.
    const on = lens({ resources: true, revealResources: true });
    expect(sameLens(on, lens({ resources: true, revealResources: false }))).toBe(false);
    expect(sameLens(on, lens({ resources: true, revealResources: true }))).toBe(true);
    // Absent means off, so an omitted flag must not read as a different lens.
    const bare: LensView = { ...NO_LENS, resources: true };
    delete bare.revealResources;
    expect(sameLens(bare, lens({ resources: true, revealResources: false }))).toBe(true);
    const off = lens({ resources: false, revealResources: true });
    expect(sameLens(off, lens({ resources: false, revealResources: false }))).toBe(true);
  });

  it('is symmetric', () => {
    const a = lens({ mode: 'settler', yields: true, yieldCells: [{ col: 1, row: 1 }] });
    const b = lens({ mode: 'settler', yields: true, yieldCells: null });
    expect(sameLens(a, b)).toBe(sameLens(b, a));
    expect(sameLens(a, a)).toBe(true);
  });
});


// --- the explorer lens ------------------------------------------------------

function flatState(width = 10, height = 8): GameState {
  const state = newGame({
    seed: 4,
    sizeName: 'duel',
    players: [{ name: 'A', color: '#a00', isHuman: true }],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  for (const tile of state.map.tiles) delete tile.discovery;
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A fog grid at one level everywhere, with named exceptions. */
function grid(state: GameState, base: number, except: Record<string, number> = {}): number[] {
  const out = new Array<number>(state.map.tiles.length).fill(base);
  for (const [key, level] of Object.entries(except)) {
    const [col, row] = key.split(',').map(Number);
    out[tileIndex(state.map, col!, row!)] = level;
  }
  return out;
}

const fakeIcons = {
  material: new MeshBasicMaterial(),
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;

/**
 * Instances per marked hex: a wash and a ring, each replicated at the three wrap
 * offsets every collector on this board uses. Written as its two factors so the
 * arithmetic in the assertions stays readable as "this many hexes are marked".
 */
const PER_MARK = 2 * 3;

/** Scratch matrix for reading an instance's baked position back out. */
const matrixScratch = new Matrix4();

function countInstances(group: { children: unknown[] }): number {
  let total = 0;
  for (const child of group.children) {
    if (child instanceof InstancedMesh) total += child.count;
  }
  return total;
}

/**
 * The faith lens: the tide, painted on the ground the towns it pulls at own.
 *
 * Its whole risk surface is the one every lens has and this one has most
 * sharply: it must not invent a rule. `pressureTotals` is the simulation's own
 * fold and there is no per-hex pressure reading anywhere in this game — so the
 * three things worth defending are that the wash follows *ownership*, that its
 * ink is the **founder's** and not the tile owner's, and that Terra Incognita
 * gets nothing. The city rings (`describe('the city rings', …)` below) add a
 * fourth: that memory never hands a seat a rival's congregation for free.
 */
describe('the faith lens', () => {
  const geometry = new BoardGeometry();
  const mats = (): MaterialLibrary =>
    new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);

  /** Two seats, flat ground, one town of seat 0 with a claim on some hexes. */
  function faithState(): GameState {
    const state = newGame({
      seed: 4,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    });
    state.map = createMap({ width: 10, height: 8, terrain: 'grassland' });
    resetVisibility(state);
    state.units = [];
    state.cities = [];
    state.camps = [];
    state.religions = [];
    state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
    for (const tile of state.map.tiles) delete tile.discovery;
    computeFreshwater(state.map);
    foundCityAt(state, 0, at(state, 4, 4));
    return state;
  }

  /** A religion founded by one seat, written straight onto the register. */
  function found(state: GameState, founderId: number): number {
    const id = state.religions.length;
    state.religions.push({
      id,
      founderId,
      name: `Faith ${String(id)}`,
      pantheon: ['keeperOfTheHearth'],
      follower: [],
      enhancer: [],
      foundedTurn: 0,
    });
    return id;
  }

  function build(state: GameState, levels: number[] | null): LensLayer {
    const layer = new LensLayer();
    layer.build(state, lens({ mode: 'faith' }), geometry, mats(), fakeIcons, new Quaternion(), levels);
    return layer;
  }

  /** Every ink the wash was painted in, one entry per bucket. */
  function inks(layer: LensLayer): number[] {
    const out: number[] = [];
    for (const child of layer.group.children) {
      if (!(child instanceof InstancedMesh)) continue;
      if (child.geometry !== geometry.territory) continue;
      out.push((child.material as MeshBasicMaterial).color.getHex());
    }
    return out;
  }

  /**
   * Every ring ink standing on exactly this hex — a position test rather than a
   * whole-layer count, because a holy site and a city ring can now legitimately
   * share ground and a raw instance count could no longer tell them apart.
   */
  function ringOn(layer: LensLayer, col: number, row: number): number[] {
    const found: number[] = [];
    const at = new Vector3();
    const centre = cellCenter(col, row);
    for (const child of layer.group.children) {
      if (!(child instanceof InstancedMesh) || child.geometry !== geometry.ring) continue;
      for (let i = 0; i < child.count; i++) {
        child.getMatrixAt(i, matrixScratch);
        at.setFromMatrixPosition(matrixScratch);
        if (Math.abs(at.x - centre.x) < 1e-6 && Math.abs(at.z - centre.z) < 1e-6) {
          found.push((child.material as MeshBasicMaterial).color.getHex());
        }
      }
    }
    return found;
  }

  it('draws nothing in a world with no religion in it', () => {
    // Which is most of a game, and the honest answer for all of it: there is no
    // tide until somebody founds a faith.
    const state = faithState();
    const layer = build(state, grid(state, VISIBLE));
    expect(countInstances(layer.group)).toBe(0);
    layer.dispose();
  });

  it('washes a town’s ground in the ink of the faith pressing hardest on it', () => {
    const state = faithState();
    const id = found(state, 1);
    // A town that already follows the faith is a source pressing on itself
    // through its founder's capital rule — the simplest live tide there is, and
    // it is the sim's own arithmetic either way: the lens asks `pressureTotals`.
    state.cities[0]!.followers = { [id]: state.cities[0]!.population };
    // A neighbouring town of the founder's, so there is something to press.
    foundCityAt(state, 1, at(state, 5, 4));
    state.cities[1]!.followers = { [id]: state.cities[1]!.population };

    const layer = build(state, grid(state, VISIBLE));
    // Seat 1 founded it, so seat 1's ink is what the ground is washed in —
    // including the ground seat 0 owns, which is the whole point.
    expect(inks(layer)).toContain(playerColor(state, 1));
    expect(inks(layer)).not.toContain(playerColor(state, 0));
    layer.dispose();
  });

  it('leaves unclaimed ground alone', () => {
    // The tide is a fact about towns and this lens does not invent a second
    // reading of it. Counted as "fewer washes than there are explored hexes".
    const state = faithState();
    const id = found(state, 0);
    state.cities[0]!.followers = { [id]: state.cities[0]!.population };
    const layer = build(state, grid(state, VISIBLE));
    let washes = 0;
    for (const child of layer.group.children) {
      if (child instanceof InstancedMesh && child.geometry === geometry.territory) {
        washes += child.count;
      }
    }
    const owned = state.tileOwner.filter((owner) => owner !== null).length;
    expect(owned).toBeGreaterThan(0);
    expect(owned).toBeLessThan(state.map.tiles.length);
    // Three wrap copies per owned hex, and not one instance more.
    expect(washes).toBe(owned * 3);
    layer.dispose();
  });

  it('draws nothing on Terra Incognita', () => {
    // The rule every half of this layer keeps: there is no ground there yet.
    const state = faithState();
    const id = found(state, 0);
    state.cities[0]!.followers = { [id]: state.cities[0]!.population };
    const layer = build(state, grid(state, HIDDEN));
    let washes = 0;
    for (const child of layer.group.children) {
      if (child instanceof InstancedMesh && child.geometry === geometry.territory) {
        washes += child.count;
      }
    }
    expect(washes).toBe(0);
    layer.dispose();
  });

  it('rings a holy site on remembered ground', () => {
    // Ground, so the improvement rule: a holy site survives on remembered hexes
    // exactly as a ruin does. Planted a hex off the city centre so this test
    // reads the site's own ring and nothing the new city rings also draw there.
    const state = faithState();
    const id = found(state, 0);
    state.cities[0]!.followers = { [id]: state.cities[0]!.population };
    at(state, 3, 4).improvement = 'holySite';

    const ringAtSite = (levels: number[]): number[] => {
      const layer = build(state, levels);
      const found = ringOn(layer, 3, 4);
      layer.dispose();
      return found;
    };
    expect(ringAtSite(grid(state, VISIBLE))).toEqual([playerColor(state, 0)]);
    expect(ringAtSite(grid(state, EXPLORED))).toEqual([playerColor(state, 0)]);
  });

  /**
   * The city rings (user, 2026-08-28): a town's own vote, ringed on its own
   * hex, in whichever grade the wash alone cannot say — "flying the banner" and
   * "under a tide that has not turned it yet" read as one colour on the ground
   * and must not on the town.
   */
  describe('the city rings', () => {
    it('rings a following town strong, in its founder’s ink', () => {
      const state = faithState();
      const id = found(state, 1);
      // Seat 0's own town follows seat 1's faith outright — the wash test's own
      // setup, one hex over.
      state.cities[0]!.followers = { [id]: state.cities[0]!.population };
      const layer = build(state, grid(state, VISIBLE));
      expect(ringOn(layer, 4, 4)).toEqual([playerColor(state, 1)]);
      layer.dispose();
    });

    it('rings a pressed-but-not-following town faint', () => {
      const state = faithState();
      found(state, 1);
      // Seat 1's own capital presses itself (the founder's capital rule) and
      // carries no followers of its own — pressed, and not a majority.
      foundCityAt(state, 1, at(state, 5, 4));
      expect(state.cities[1]!.followers).toBeUndefined();
      const layer = build(state, grid(state, VISIBLE));
      expect(ringOn(layer, 5, 4)).toEqual([playerColor(state, 1)]);
      // And it is the faint grade, not the strong one.
      let faint = -1;
      for (const child of layer.group.children) {
        if (child instanceof InstancedMesh && child.geometry === geometry.ring) {
          faint = (child.material as MeshBasicMaterial).opacity;
        }
      }
      expect(faint).toBeCloseTo(VIEW3D.lens.faithPressedRingOpacity);
      layer.dispose();
    });

    it('rings nothing for a town no faith has reached', () => {
      const state = faithState();
      found(state, 1);
      // No followers, no capital, no site in range: nothing presses hex (4, 4).
      const layer = build(state, grid(state, VISIBLE));
      expect(ringOn(layer, 4, 4)).toEqual([]);
      layer.dispose();
    });

    it('keeps a remembered foreign town’s congregation out of the ring', () => {
      // The fog rule `faithHoverReading` keeps: memory names only the viewing
      // seat's own faith, never a rival's. Seat 0's own town follows a faith
      // seat 1 founded — real, and unreadable from memory to anybody but seat 1.
      const state = faithState();
      const id = found(state, 1);
      state.cities[0]!.followers = { [id]: state.cities[0]!.population };
      // Watched: the omniscient answer, whoever it names.
      const watched = build(state, grid(state, VISIBLE));
      expect(ringOn(watched, 4, 4)).toEqual([playerColor(state, 1)]);
      watched.dispose();
      // Remembered by seat 0, who founded no faith of its own to confirm it
      // with — nothing is revealed.
      const remembered = build(state, grid(state, EXPLORED));
      expect(ringOn(remembered, 4, 4)).toEqual([]);
      remembered.dispose();
    });

    it('still rings a remembered town when it is the viewer’s own faith', () => {
      // The one case memory may confirm: seat 0's own faith is what is
      // following (or pressing) the town, which is a fact about seat 0's own
      // board and not a leak of anybody else's.
      const state = faithState();
      const id = found(state, 0);
      state.cities[0]!.followers = { [id]: state.cities[0]!.population };
      const layer = build(state, grid(state, EXPLORED));
      expect(ringOn(layer, 4, 4)).toEqual([playerColor(state, 0)]);
      layer.dispose();
    });
  });
});

/**
 * `signReligion` is what tells the faith lens to redraw.
 *
 * The tide moves in a phase nobody calls the renderer from, so the layer has to
 * be *told*, and a hash cannot be forgotten the way a notification can. The
 * failure it exists to prevent is silent: a lens showing last turn's converts.
 */
describe('signReligion', () => {
  function state(): GameState {
    const built = flatState();
    built.religions = [
      {
        id: 0,
        founderId: 0,
        name: 'Faith',
        pantheon: ['keeperOfTheHearth'],
        follower: [],
        enhancer: [],
        foundedTurn: 0,
      },
    ];
    built.cities = [];
    foundCityAt(built, 0, at(built, 4, 4));
    return built;
  }

  it('moves when a citizen turns', () => {
    const world = state();
    const before = signReligion(world);
    world.cities[0]!.followers = { 0: 1 };
    expect(signReligion(world)).not.toBe(before);
  });

  it('moves when a town banks pressure without converting anybody', () => {
    // The wash is a function of *pressure*, not of followers, so a town that
    // banked and turned nobody has still changed what this lens should say.
    const world = state();
    const before = signReligion(world);
    world.cities[0]!.pressureBank = { 0: 3 };
    expect(signReligion(world)).not.toBe(before);
  });

  it('does not move on a turn passing alone', () => {
    // Nothing left in the fold is time-dependent now that a proclamation is an
    // instant lump rather than a decaying pulse — see the module docblock.
    const world = state();
    const quiet = signReligion(world);
    world.turn += 1;
    expect(signReligion(world)).toBe(quiet);
  });

  it('stays put when nothing about the tide moved', () => {
    const world = state();
    const before = signReligion(world);
    world.cities[0]!.population += 2;
    world.cities[0]!.foodBasket = 9;
    expect(signReligion(world)).toBe(before);
  });
});

/**
 * The explorer lens draws the board's *sites*, so its whole risk surface is
 * agreeing with the layer that draws the props: the two must never disagree
 * about whether a hex has something on it, and they answer to two different fog
 * rules to stay that way (see `sites3d.ts`). A ring around a hex the board is
 * drawing nothing on is a promise the game breaks.
 */
describe('the explorer lens', () => {
  const geometry = new BoardGeometry();
  const mats = (): MaterialLibrary =>
    new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);

  function build(state: GameState, levels: number[] | null): LensLayer {
    const layer = new LensLayer();
    layer.build(
      state,
      lens({ mode: 'explorer' }),
      geometry,
      mats(),
      fakeIcons,
      new Quaternion(),
      levels,
    );
    return layer;
  }

  it('marks every unclaimed site and nothing else', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    at(state, 5, 3).discovery = 'village';

    const layer = build(state, grid(state, VISIBLE));
    expect(countInstances(layer.group)).toBe(2 * PER_MARK);
    layer.dispose();
  });

  it('never rings a barrow the seat has no word for, and rings it once the word arrives', () => {
    // The user's bug of 2026-09-02: the site layer gated the marker on the
    // surveyor's technology and this lens did not, so the gold ring sent
    // scouts to hexes where walking over did nothing. One gate, both surfaces.
    const state = flatState();
    at(state, 2, 2).discovery = 'antiquity';
    const blind = build(state, grid(state, VISIBLE));
    expect(countInstances(blind.group)).toBe(0);
    blind.dispose();

    state.players[0]!.techsResearched.push('prospecting');
    const learned = build(state, grid(state, VISIBLE));
    expect(countInstances(learned.group)).toBe(PER_MARK);
    learned.dispose();
  });

  it('draws nothing on a board with nothing left to find', () => {
    const state = flatState();
    const layer = build(state, grid(state, VISIBLE));
    expect(countInstances(layer.group)).toBe(0);
    layer.dispose();
  });

  /**
   * "Unclaimed" needs no test of its own in the lens, because the claim *deletes*
   * the field it reads (`claimDiscoveryAt`). This is that identity pinned: the
   * lens goes quiet on the same edit the prop disappears on.
   */
  it('goes dark on a site the moment it is claimed', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    const lit = build(state, grid(state, VISIBLE));
    expect(countInstances(lit.group)).toBe(PER_MARK);
    lit.dispose();

    delete at(state, 2, 2).discovery;
    const dark = build(state, grid(state, VISIBLE));
    expect(countInstances(dark.group)).toBe(0);
    dark.dispose();
  });

  it('keeps a site marked on remembered ground and unmarked on unexplored ground', () => {
    // The ground rule: a ruin is a coastline, so the chart may go on saying it
    // is there. Terra Incognita gets nothing, which needs no argument.
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';

    const remembered = build(state, grid(state, EXPLORED));
    expect(countInstances(remembered.group)).toBe(PER_MARK);
    remembered.dispose();

    const unknown = build(state, grid(state, HIDDEN));
    expect(countInstances(unknown.group)).toBe(0);
    unknown.dispose();
  });

  it('marks a camp on remembered ground too, following the site layer', () => {
    // The lens's binding constraint is that it must never ring a hex the board
    // is not drawing the thing on. Camps became ground on 2026-08-27 (see the
    // ruling in `sites3d.ts`), so this half moved with them: a palisade standing
    // in plain view on the diorama and unringed under the explorer lens is the
    // failure this pin exists to catch.
    const state = flatState();
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });

    const watched = build(state, grid(state, VISIBLE));
    expect(countInstances(watched.group)).toBe(PER_MARK);
    watched.dispose();

    const remembered = build(state, grid(state, EXPLORED));
    expect(countInstances(remembered.group)).toBe(PER_MARK);
    remembered.dispose();

    const unknown = build(state, grid(state, HIDDEN));
    expect(countInstances(unknown.group)).toBe(0);
    unknown.dispose();
  });

  it('marks a site and a camp in two different inks', () => {
    // Go here, and do not walk into that. Colour is the bucket key, so two inks
    // is two buckets per shape — the observable form of "these are not two
    // grades of one thing".
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });

    const layer = build(state, grid(state, VISIBLE));
    expect(countInstances(layer.group)).toBe(2 * PER_MARK);
    const meshes = layer.group.children.filter(
      (child): child is InstancedMesh => child instanceof InstancedMesh,
    );
    // Four buckets: wash and ring, in each of the two inks.
    expect(meshes).toHaveLength(4);
    expect(VIEW3D.lens.campColor).not.toBe(VIEW3D.lens.discoveryColor);
    layer.dispose();
  });

  it('draws everything when there is no fog at all', () => {
    // The look-dev reading, matching the site layer: no seat, nothing to hide.
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });
    const layer = build(state, null);
    expect(countInstances(layer.group)).toBe(2 * PER_MARK);
    layer.dispose();
  });

  it('is a lens of its own as far as the rebuild guard is concerned', () => {
    expect(sameLens(lens({ mode: 'explorer' }), lens({ mode: 'none' }))).toBe(false);
    expect(sameLens(lens({ mode: 'explorer' }), lens({ mode: 'settler' }))).toBe(false);
    expect(sameLens(lens({ mode: 'explorer' }), lens({ mode: 'explorer' }))).toBe(true);
  });
});

// --- the flat readouts and the ground they are printed on --------------------

/**
 * The bug this block pins is a *pass*, not a lift and not a draw order.
 *
 * Three splits every frame into an opaque pass and a transparent one, draws the
 * whole of the first before any of the second, and sorts by `renderOrder` only
 * *within* each. The yield glyphs were alpha-tested and not flagged transparent,
 * which left them in the opaque pass: they beat the pines (opaque, and collected
 * with a lower order) and lost to every blended decal on the board — the
 * territory tint, the shore band, and, the day the arid features landed, an
 * oasis pool and a floodplain wash printed straight over a tile's figures.
 *
 * So the assertion is written the way the renderer actually decides: which pass,
 * then which order. A test that only compared `renderOrder` would have passed
 * for the whole life of the bug.
 */
function drawsAfter(
  a: { mesh: InstancedMesh; material: MeshBasicMaterial },
  b: { mesh: InstancedMesh; material: MeshBasicMaterial },
): boolean {
  if (a.material.transparent !== b.material.transparent) return a.material.transparent;
  return a.mesh.renderOrder > b.mesh.renderOrder;
}

/** Every instanced mesh in a group with the single material it is drawn with. */
function drawn(group: { children: unknown[] }): {
  mesh: InstancedMesh;
  material: MeshBasicMaterial;
}[] {
  const out: { mesh: InstancedMesh; material: MeshBasicMaterial }[] = [];
  for (const child of group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    if (Array.isArray(child.material)) continue;
    out.push({ mesh: child, material: child.material as MeshBasicMaterial });
  }
  return out;
}

describe('a tile\'s yields are the last thing printed on it', () => {
  const geometry = new BoardGeometry();
  const mats = (): MaterialLibrary =>
    new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);

  /** The real flat-icon material, which is the half of the fix that is a flag. */
  const realIcons = {
    material: new MeshBasicMaterial(tileIconFlags()),
    standingMaterial: new MeshBasicMaterial(),
  } as unknown as TileIcons;

  it('flags the flat atlas transparent, which is the only way an order exists', () => {
    const flags = tileIconFlags();
    // The pass. Without it the number below means nothing at all.
    expect(flags.transparent).toBe(true);
    // Still a cutout, so a stack of coins sorts by collection order and an edge
    // stays crisp; still ignoring depth, because a readout is not scenery.
    expect(flags.alphaTest).toBeGreaterThan(0);
    expect(flags.depthTest).toBe(false);
    expect(flags.depthWrite).toBe(false);
    // Above the interface's own washes, below the tags naming a piece.
    expect(RENDER_ORDER.tileIcon).toBeGreaterThan(RENDER_ORDER.onTop);
    expect(RENDER_ORDER.tileIcon).toBeLessThan(RENDER_ORDER.badge);
  });

  it('draws a glyph over the oasis pool and the floodplain wash under it', () => {
    const map = createMap({ width: 8, height: 6, terrain: 'desert' });
    // The two arid features, side by side: a pool (all but opaque) and a wash.
    getTileAt(map, 3, 3)!.feature = 'oasis';
    getTileAt(map, 4, 3)!.feature = 'floodplain';
    const board = buildBoard(map, geometry, mats(), false);

    const state = flatState();
    state.map = map;
    resetVisibility(state);
    const layer = new LensLayer();
    layer.build(
      state,
      lens({ yields: true }),
      geometry,
      mats(),
      realIcons,
      new Quaternion(),
      null,
    );

    const glyphs = drawn(layer.group);
    expect(glyphs.length).toBeGreaterThan(0);
    const ground = drawn(board.group).filter(
      ({ mesh }) => mesh.geometry === geometry.pool || mesh.geometry === geometry.floodWash,
    );
    // Both features really are on this board, or the comparison below is vacuous.
    expect(ground.map(({ mesh }) => mesh.geometry)).toContain(geometry.pool);
    expect(ground.map(({ mesh }) => mesh.geometry)).toContain(geometry.floodWash);
    for (const glyph of glyphs) {
      for (const decal of ground) expect(drawsAfter(glyph, decal)).toBe(true);
    }
    layer.dispose();
  });

  it('still beats the trees, which is what it never stopped doing', () => {
    const map = createMap({ width: 8, height: 6, terrain: 'grassland' });
    getTileAt(map, 3, 3)!.feature = 'forest';
    const board = buildBoard(map, geometry, mats(), false);

    const state = flatState();
    state.map = map;
    resetVisibility(state);
    const layer = new LensLayer();
    layer.build(
      state,
      lens({ yields: true, yieldCells: [{ col: 3, row: 3 }] }),
      geometry,
      mats(),
      realIcons,
      new Quaternion(),
      null,
    );

    const pines = drawn(board.group).filter(({ mesh }) => mesh.geometry === geometry.pine);
    expect(pines.length).toBeGreaterThan(0);
    for (const glyph of drawn(layer.group)) {
      for (const pine of pines) expect(drawsAfter(glyph, pine)).toBe(true);
    }
    layer.dispose();
  });
});

/**
 * `Renderer3D` cannot be instantiated in this suite — it opens a real
 * `WebGLRenderer` against a canvas, and the suite runs in Vitest's `node`
 * environment with no DOM and (deliberately, see `vite.config.ts`'s pool
 * comment) no mocking anywhere. So the bug this covers — the yields lens going
 * stale after a worker builds, a great person plants, a wood is felled, a
 * border moves or a tech reveals a resource — is asserted the way
 * `test/sim/cities.test.ts` asserts `assignCitizens`' two callers and
 * `test/ui/seatRoster.test.ts` asserts the roster rule: by reading the source,
 * because the property lives in *which branch calls `rebuildLens`*, and that is
 * exactly what a behavioural test cannot reach here.
 *
 * Every assertion below is therefore structural, not behavioural: it finds the
 * one `if` block the frame loop already runs off a given fingerprint (or the
 * reveal pass, or the command seam) and checks that block also rebuilds the
 * lens when `this.lensView.yields` is up — which is at once the "does it
 * rebuild" half and the "only when the lens is up" half, since a guard that
 * exists at all is the guard that skips the call while the lens is down.
 */
describe('the yields lens follows every trigger that can move a tile\'s number', () => {
  const RENDERER_SOURCE = Object.values(
    import.meta.glob('../../src/render3d/renderer3d.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  )[0]!;
  const MAP_VIEW_SOURCE = Object.values(
    import.meta.glob('../../src/ui/mapView.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  )[0]!;

  /** Comments stripped, exactly as `seatRoster.test.ts` strips them — the
   * rule lives in the code, and matching the prose that explains it would
   * make the docblocks unwritable. */
  function code(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  }

  const source = code(RENDERER_SOURCE);

  /**
   * The text of the `if` block that opens on `marker`, up to its own closing
   * brace at the base indent level — a small hand-rolled brace matcher rather
   * than a fixed-width slice, so a block growing another line does not start
   * silently truncating the window this reads.
   */
  function ifBlockAt(marker: string): string {
    const start = source.indexOf(marker);
    expect(`${marker} found`).toBe(start === -1 ? `${marker} missing` : `${marker} found`);
    const open = source.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) return source.slice(start, i + 1);
      }
    }
    throw new Error(`unterminated block at ${marker}`);
  }

  const yieldsRebuild = /this\.lensView\.yields\)\s*this\.rebuildLens\(\)/;

  /** `this.lensView.mode === 'faith'` guarding a rebuild, however it is spelt. */
  const faithRebuild = /mode === 'faith'\)\s*this\.rebuildLens\(\)/;

  it('rebuilds on the clearGround fingerprints — a farm, a mine or a chop', () => {
    // The one block keyed off `signImprovedCells`/`signFeatureCells`/the
    // founding signature together; a farm, a mine and a chop all move one of
    // the three.
    const block = ifBlockAt('signImprovedCells(this.state) !== this.clearedImprovementsSignature');
    expect(block).toContain('signFeatureCells(this.state.map) !== this.clearedFeaturesSignature');
    expect(yieldsRebuild.test(block)).toBe(true);
  });

  it('rebuilds on signImprovements — a great work, a pillage, a non-clutter improvement', () => {
    const block = ifBlockAt('signImprovements(this.state) !== this.improvementsSignature');
    expect(yieldsRebuild.test(block)).toBe(true);
  });

  it('rebuilds on signTerritory — a border move or a bought tile changes whose context a hex reads with', () => {
    const block = ifBlockAt('signTerritory(this.state) !== this.territorySignature');
    expect(yieldsRebuild.test(block)).toBe(true);
  });

  it('rebuilds off the reveal pass\'s own stats, not the per-frame fog flag', () => {
    // `applyReveal` runs on the frame regardless of the lens, so the trigger
    // has to be "did the reveal pass actually flip a prop this pass"
    // (`RevealStats.cells`), never `fogMoved` — a fog move with no gated
    // resource on it must not pay for a lens rebuild.
    const idx = source.indexOf('const revealed = this.applyReveal();');
    expect(idx).toBeGreaterThan(-1);
    const after = source.slice(idx, idx + 400);
    expect(after).toMatch(/revealed\s*&&\s*revealed\.cells\s*>\s*0\s*&&\s*this\.lensView\.yields\)\s*this\.rebuildLens\(\)/);
  });

  /**
   * The faith lens's own triggers, which are a different set from the yields'
   * and had to be, because it is a picture of a different thing.
   *
   * `signReligion` covers the tide's own phase and nothing else does; the other
   * three are the facts that change the tide or the ground it is painted on
   * without touching a single follower — a border moved, a town founded, a holy
   * site raised or pillaged. Each is checked in the block that already exists
   * for it, which is what keeps this from becoming a second frame loop.
   */
  it('rebuilds the faith lens on signReligion — the tide’s own phase', () => {
    const block = ifBlockAt('const religions = signReligion(this.state);');
    expect(faithRebuild.test(block)).toBe(true);
    // And the signature is kept current whether or not the lens is up, or
    // raising it ten turns later would come up stale for exactly one frame.
    expect(block).toContain('this.religionSignature = religions;');
  });

  it('rebuilds the faith lens on signTerritory — the wash follows the ground a town owns', () => {
    expect(faithRebuild.test(ifBlockAt('signTerritory(this.state) !== this.territorySignature'))).toBe(true);
  });

  it('rebuilds the faith lens on signImprovements — a holy site raised or pillaged', () => {
    expect(faithRebuild.test(ifBlockAt('signImprovements(this.state) !== this.improvementsSignature'))).toBe(true);
  });

  it('rebuilds the faith lens on a founding — a new source and new ground at once', () => {
    const block = ifBlockAt('signImprovedCells(this.state) !== this.clearedImprovementsSignature');
    expect(/founded && this\.lensView\.mode === 'faith'/.test(block)).toBe(true);
  });

  it('exposes noteStateChanged for the command seam a board fingerprint cannot see', () => {
    // A card or belief's `tileYield` effect moves no tile, improvement or
    // border, so nothing above catches it; this is the seam `commit`
    // (`src/ui/controls.ts`) calls once per accepted command.
    const block = ifBlockAt('noteStateChanged(): void {');
    expect(yieldsRebuild.test(block)).toBe(true);
    // And the interface declares the optional hook it implements.
    expect(code(MAP_VIEW_SOURCE)).toContain('noteStateChanged?(): void;');
  });
});
