import { describe, expect, it } from 'vitest';
import { draftCost } from '../../src/sim/statecraft';

import { createMap, getTileAt, type Tile } from '../../src/sim/map';
import { arriveOnTile } from '../../src/sim/arrival';
import { cityYields, foundCityAt, growthThreshold } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import {
  claimDiscoveryAt,
  discoveryChoiceError,
  discoveryClaimError,
  drawDiscoveryOffer,
  explainDiscoveryOffer,
  settleDiscovery,
} from '../../src/sim/discoveries';
import {
  DISCOVERY_DATA,
  DISCOVERY_IDS,
  DISCOVERY_KINDS,
  type DiscoveryId,
  discoveryDataProblems,
  discoveryDef,
  discoveryWeight,
} from '../../src/sim/discoveryData';
import { discoveryCells, placeDiscoveries } from '../../src/sim/discoveryPlacement';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { generateMap } from '../../src/sim/mapgen';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { makeRng } from '../../src/sim/rng';
import { RULES } from '../../src/sim/rulesData';
import { chooseStartPositions } from '../../src/sim/startPositions';
import {
  type GameState,
  createUnit,
  newGame,
  playerById,
} from '../../src/sim/state';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { wrappedDistance, tileHex } from '../../src/sim/map';
import { computeFreshwater } from '../../src/sim/water';
import { resetVisibility } from '../../src/sim/visibility';
import { firstBlocker } from '../../src/ui/turnBlockers';

/**
 * Ancient ruins and tribal villages (playable.md item 3, ledger Entry XX).
 *
 * Four separable claims, kept apart because they fail for different reasons:
 *
 *   1. **The scatter is generation.** Deterministic in the seed, off the starts,
 *      spaced, and — the one that would be invisible if it broke — rolled *last*,
 *      so adding discoveries did not move a single wheat field on any map.
 *   2. **The draft doctrine** (Entry XV, first consumer). The offer is a draw
 *      from `state.rng` taken at the moment of the claim, the pick is a command
 *      naming an index, a refusal is byte-identical, and a replay deals the same
 *      three cards.
 *   3. **Every boon is a windfall** (Entry XVIII). Printed number, paid exactly,
 *      settled the instant it lands through the bucket's own routine — including
 *      the case the whole `settleResearch` seam was built for: a boon that covers
 *      the current technology finishes it *now* and hands the choice back.
 *   4. **It cannot be forgotten.** An unanswered offer is the first End Turn
 *      blocker there is.
 */

const PLACEMENT = DISCOVERY_DATA.placement;

/** A two-player game on blank grassland with every technology held. */
function bareState(width = 14, height = 12): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Puts one named discovery in a player's hand, bypassing the draw. */
function offerOf(state: GameState, playerId: number, id: DiscoveryId, col = 5, row = 5): void {
  playerById(state, playerId)!.pendingDiscovery = {
    kind: 'ruins',
    col,
    row,
    options: [id],
  };
}

describe('the discovery pool', () => {
  it('is internally consistent', () => {
    expect(discoveryDataProblems()).toEqual([]);
  });

  it('leans ruins toward knowledge and villages toward people', () => {
    // The flavour split as a *gradient*, which is the shape the data claims: no
    // row is exclusive to one kind, and the two ends of the table pull opposite
    // ways. Asserted as a comparison rather than against literal weights, so
    // retuning the numbers is a data edit and reversing the design is a failure.
    expect(discoveryWeight('starTablets', 'ruins')).toBeGreaterThan(
      discoveryWeight('starTablets', 'village'),
    );
    expect(discoveryWeight('laborersJoinYou', 'village')).toBeGreaterThan(
      discoveryWeight('laborersJoinYou', 'ruins'),
    );
    // No row is exclusive to one kind today: a village that could never yield a
    // mason's hoard is a worse village, and a ruin that could never yield
    // provisions is a worse ruin. The data *may* say zero (the type allows it);
    // the shipped table deliberately does not.
    for (const id of DISCOVERY_IDS) {
      for (const kind of DISCOVERY_KINDS) {
        expect(`${id}/${kind}: ${discoveryWeight(id, kind) > 0}`).toBe(`${id}/${kind}: true`);
      }
    }
  });

  it('carries the eight rows the design asked for, with their printed numbers', () => {
    // The pool as shipped. A ledger entry in test form: if a payoff moves, this
    // is where the design is told about it.
    const printed = Object.fromEntries(
      DISCOVERY_IDS.map((id) => {
        const { effect } = discoveryDef(id);
        return [id, effect.kind === 'unit' ? effect.unitType : effect.amount];
      }),
    );
    expect(printed).toEqual({
      grainCache: 20,
      masonsHoard: 20,
      starTablets: 15,
      // Halved (playtest batch two, 8/27): "early culture from discoveries
      // should be lower". Culture is the one pool a discovery pays that buys a
      // *decision* rather than a number, so fifteen of it out of the first ruin
      // a scout walked into was handing a seat its opening Order for free.
      forgottenHymns: 7,
      relicsOfTheOldFaith: 15,
      aGuideOffersService: 'scout',
      laborersJoinYou: 'worker',
      tradersHoard: 25,
    });
  });
});

describe('placing discoveries', () => {
  it('is deterministic in the seed and stands clear of every possible start', () => {
    const a = generateMap(9182, 'duel');
    const b = generateMap(9182, 'duel');
    expect(discoveryCells(a)).toEqual(discoveryCells(b));
    expect(discoveryCells(a).length).toBeGreaterThan(0);

    // Measured against the *maximum* roster's starts, which is what the pass
    // itself uses — a short roster's starts are a prefix of a full one's.
    const starts = chooseStartPositions(a, RULES.game.maxPlayers).map((tile) => tileHex(tile));
    for (const site of discoveryCells(a)) {
      const hex = tileHex(getTileAt(a, site.col, site.row)!);
      for (const start of starts) {
        expect(`${site.col},${site.row}`).toBe(
          wrappedDistance(a, hex, start) >= PLACEMENT.minDistanceFromStart
            ? `${site.col},${site.row}`
            : 'too close to a start',
        );
      }
    }
  });

  it('rolls last, so a site is the only thing it adds to a tile', () => {
    // THE regression this pass could have caused invisibly. `placeDiscoveries`
    // draws from the generator's own stream, so a pass inserted anywhere earlier
    // would have shifted every later draw — every river, every ore seam — on
    // every map in the game.
    //
    // What can be asserted from outside the generator is the observable half of
    // that claim: on a finished map, deleting the sites leaves a board in which
    // *nothing else* is different from the pass's point of view — the sites are
    // additive, they sit on ordinary generated ground, and no tile was rewritten
    // to make room for one. The ordering itself is asserted by the numbers in
    // `test/mapgen/mapgen.test.ts` and `resources.test.ts`, which are unchanged
    // by this pass and would have moved if the draws had.
    const map = generateMap(2024, 'duel');
    const sites = discoveryCells(map);
    expect(sites.length).toBeGreaterThan(0);

    const control = generateMap(2024, 'duel');
    for (const tile of control.tiles) delete tile.discovery;
    const stripped = generateMap(2024, 'duel').tiles.map((tile) => {
      const copy = { ...tile };
      delete copy.discovery;
      return copy;
    });
    expect(JSON.stringify(control.tiles)).toBe(JSON.stringify(stripped));
  });
});

describe('claiming', () => {
  it('is any unit, consumes the site, and deals an offer of three', () => {
    const state = bareState();
    const tile = at(state, 4, 4);
    tile.discovery = 'ruins';
    // A warrior, not a scout: stumbling into a ruin finds it as surely as
    // being sent to look does.
    const warrior = createUnit(state, 0, 'warrior', 4, 4);

    const offer = claimDiscoveryAt(state, warrior, tile);
    expect(offer).not.toBeNull();
    expect(tile.discovery).toBeUndefined();
    expect(offer!.options).toHaveLength(RULES.offers.discovery);
    expect(new Set(offer!.options).size).toBe(RULES.offers.discovery);
    expect(playerById(state, 0)!.pendingDiscovery).toEqual(offer);
    // The site is carried on the offer, because a free unit stands *there* and
    // the nearest city is nearest *to there* — neither may be read off a unit
    // that has since moved on.
    expect({ col: offer!.col, row: offer!.row }).toEqual({ col: 4, row: 4 });
  });

  it('refuses the wild, and leaves the site standing', () => {
    const state = newGame({
      seed: 3,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
      barbarians: true,
    });
    const wild = state.players.find((player) => player.barbarian)!;
    const tile = state.map.tiles.find((candidate) => candidate.terrain === 'grassland')!;
    tile.discovery = 'village';
    const raider = createUnit(state, wild.id, 'warrior', tile.col, tile.row);

    expect(discoveryClaimError(state, raider, tile)).toBe(
      'The wild has no use for what it never lost',
    );
    expect(claimDiscoveryAt(state, raider, tile)).toBeNull();
    // Left standing, for whoever finds it: the ruins were never lost to them.
    expect(tile.discovery).toBe('village');
    expect(wild.pendingDiscovery).toBeUndefined();
  });

  it('claims one at a time and leaves the second site where it is', () => {
    const state = bareState();
    const first = at(state, 4, 4);
    const second = at(state, 6, 4);
    first.discovery = 'ruins';
    second.discovery = 'village';
    const scout = createUnit(state, 0, 'scout', 4, 4);

    expect(claimDiscoveryAt(state, scout, first)).not.toBeNull();
    scout.col = 6;
    expect(discoveryClaimError(state, scout, second)).toBe(
      'A has a discovery still awaiting judgment',
    );
    expect(claimDiscoveryAt(state, scout, second)).toBeNull();
    // Not consumed — an offer overwritten would be a boon silently destroyed.
    expect(second.discovery).toBe('village');
  });

  it('happens on the way past, not only where the march ends', () => {
    const state = bareState();
    at(state, 5, 4).discovery = 'ruins';
    const scout = createUnit(state, 0, 'scout', 4, 4);
    const result = applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: scout.id,
      target: { col: 6, row: 4 },
    });

    expect(result.ok).toBe(true);
    expect(at(state, 5, 4).discovery).toBeUndefined();
    expect(playerById(state, 0)!.pendingDiscovery).toBeDefined();
    // And the reducer says so, so the interface never has to re-derive it.
    expect(result.ok && result.arrivals?.[0]?.discovery).toBeDefined();
  });
});

describe('the draw', () => {
  it('deals the same hand from the same generator state', () => {
    const a = bareState();
    const b = bareState();
    expect(drawDiscoveryOffer(a, 'ruins', 3)).toEqual(drawDiscoveryOffer(b, 'ruins', 3));
    // And a *different* hand once the stream has moved, or the draw would not
    // be a draw at all.
    const first = drawDiscoveryOffer(a, 'ruins', 3);
    const second = drawDiscoveryOffer(a, 'ruins', 3);
    expect(first.length).toBe(second.length);
  });

  it('never offers the same row twice', () => {
    const state = bareState();
    for (let i = 0; i < 200; i++) {
      for (const kind of DISCOVERY_KINDS) {
        const drawn = drawDiscoveryOffer(state, kind, 3);
        expect(new Set(drawn).size).toBe(drawn.length);
        for (const id of drawn) expect(discoveryWeight(id, kind)).toBeGreaterThan(0);
      }
    }
  });

  it('reaches every row in the pool eventually', () => {
    // A weighted draw that could never deal a row would be a row that ships and
    // never appears — the failure a data file cannot show you.
    const state = bareState();
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      for (const kind of DISCOVERY_KINDS) {
        for (const id of drawDiscoveryOffer(state, kind, 3)) seen.add(id);
      }
    }
    expect([...seen].sort()).toEqual([...DISCOVERY_IDS].sort());
  });
});

describe('the pick', () => {
  it('names an index and refuses anything else, byte-identically', () => {
    const state = bareState();
    offerOf(state, 0, 'tradersHoard');
    const before = snapshotState(state);

    expect(discoveryChoiceError(state, 0, 1)).toBe('Option 1 is not one of the 1 offered');
    expect(discoveryChoiceError(state, 0, -1)).toBe('Option -1 is not one of the 1 offered');
    expect(discoveryChoiceError(state, 0, 'first')).toContain('integer optionIndex');
    expect(applyCommand(state, { type: 'chooseDiscovery', playerId: 0, optionIndex: 4 }).ok).toBe(
      false,
    );
    expect(snapshotState(state)).toBe(before);
  });

  it('refuses a seat with nothing outstanding, and one that has ended its turn', () => {
    const state = bareState();
    expect(discoveryChoiceError(state, 0, 0)).toBe('A has no discovery awaiting judgment');

    offerOf(state, 0, 'tradersHoard');
    state.turnEnded[0] = true;
    const refused = applyCommand(state, {
      type: 'chooseDiscovery',
      playerId: 0,
      optionIndex: 0,
    });
    expect(refused).toEqual({
      ok: false,
      error: `Player 0 has ended turn ${state.turn} and cannot choose a discovery`,
    });
    expect(playerById(state, 0)!.pendingDiscovery).toBeDefined();
  });

  it('clears the offer, and the key is deleted rather than emptied', () => {
    const state = bareState();
    offerOf(state, 0, 'tradersHoard');
    expect(
      applyCommand(state, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 }),
    ).toEqual({ ok: true });
    const player = playerById(state, 0)!;
    expect(player.pendingDiscovery).toBeUndefined();
    // A player who has answered a ruin serialises identically to one who never
    // found one — the `Unit.path` convention, kept.
    expect(Object.prototype.hasOwnProperty.call(player, 'pendingDiscovery')).toBe(false);
  });
});

describe('settlement: every boon pays its printed number', () => {
  /** A game with one city, and the claimant standing three hexes from it. */
  function withCity(): GameState {
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    return state;
  }

  it('banks a grain cache in the nearest owned city, and grows it on the spot', () => {
    const state = withCity();
    const city = state.cities[0]!;
    // Poised one point short of the threshold, so the 20🌾 must settle rather
    // than merely bank: this is the growth bucket's windfall routine.
    city.foodBasket = growthThreshold(city.population) - 1;
    const before = city.population;

    offerOf(state, 0, 'grainCache', 6, 5);
    const done = settleDiscovery(state, playerById(state, 0)!, 0);
    expect(done?.cityName).toBe(city.name);
    expect(city.population).toBe(before + 1);
    expect(done?.completed).toBe(`size ${before + 1}`);
    // Overflow is kept, exactly as a very good harvest's would be.
    expect(city.foodBasket).toBeGreaterThan(0);
  });

  it("banks a masons' hoard as hammers and completes the front of the queue", () => {
    const state = withCity();
    const city = state.cities[0]!;
    city.queue = [{ kind: 'building', id: 'monument' }];
    city.hammerBasket = 0;

    offerOf(state, 0, 'masonsHoard', 5, 6);
    const done = settleDiscovery(state, playerById(state, 0)!, 0);
    expect(done?.cityName).toBe(city.name);
    expect(city.buildings).toContain('monument');
    expect(done?.completed).toBe('Monument');
  });

  it('pays the three empire pools and the treasury exactly', () => {
    for (const [id, read] of [
      ['tradersHoard', (state: GameState): number => playerById(state, 0)!.gold],
      ['relicsOfTheOldFaith', (state: GameState): number => playerById(state, 0)!.faithPool],
    ] as const) {
      const state = withCity();
      const before = read(state);
      const { effect } = discoveryDef(id);
      offerOf(state, 0, id);
      settleDiscovery(state, playerById(state, 0)!, 0);
      expect(`${id}: ${read(state) - before}`).toBe(
        `${id}: ${effect.kind === 'unit' ? 0 : effect.amount}`,
      );
    }
  });

  it('forgotten hymns fill the culture meter and settle a draft on the spot', () => {
    // The paragraph `discoveries.ts` used to carry — "culture is banked and
    // nothing settles it, because nothing spends it yet" — closed. Culture is
    // the fourth Entry XVIII bucket now, and its settlement is a draft.
    const state = withCity();
    const player = playerById(state, 0)!;
    const { effect } = discoveryDef('forgottenHymns');
    const grant = effect.kind === 'unit' ? 0 : effect.amount;
    // The hymns are worth more than the opening draft costs, which is the
    // interesting case and the reason this is its own test.
    expect(grant).toBeGreaterThanOrEqual(draftCost(0));

    offerOf(state, 0, 'forgottenHymns');
    const done = settleDiscovery(state, player, 0);
    expect(player.statecraft.drafts).toBe(1);
    // The overflow is kept, exactly as a chop's or a good harvest's would be.
    expect(player.culturePool).toBe(grant - draftCost(0));
    // And the settlement says so, so the announce line can.
    expect(done?.completed).toBe('tier 1');
    expect(player.statecraft.pendingOrder).toBeDefined();
  });

  it('leaves the meter alone when the hymns do not fill it', () => {
    const state = withCity();
    const player = playerById(state, 0)!;
    // A pool that has already been spent down below the threshold minus the
    // grant: the boon banks and nothing completes, which is the ordinary case
    // once the ladder has climbed a little.
    player.statecraft.drafts = 6;
    const before = player.culturePool;
    offerOf(state, 0, 'forgottenHymns');
    const done = settleDiscovery(state, player, 0);
    expect(player.statecraft.drafts).toBe(6);
    expect(player.culturePool).toBeGreaterThan(before);
    expect(done?.completed).toBeNull();
  });

  it('star tablets complete the researched technology instantly, and hand the choice back', () => {
    // The case the whole `settleResearch` seam was built for (Entry XVIII's
    // deliberately-unbuilt bucket, closed by Entry XX).
    const state = withCity();
    const player = playerById(state, 0)!;
    // The city is given work, so the *research* blocker is the one left standing
    // once the boon lands — this test is about what completing a technology
    // hands back, not about the blocker order (which has its own test).
    state.cities[0]!.queue = [{ kind: 'building', id: 'monument' }];
    player.researching = 'mining';
    const cost = techDef('mining').cost;
    player.sciencePool = cost - 15;

    offerOf(state, 0, 'starTablets');
    const done = settleDiscovery(state, player, 0);
    expect(player.techsResearched).toContain('mining');
    expect(done?.completed).toBe('Mining');
    // The aim is cleared, so the End Turn research blocker asks what is next —
    // "announce + choose-next via the existing blocker", with no new prompt.
    expect(player.researching).toBeNull();
    expect(firstBlocker(state, 0)?.kind).toBe('research');
    // Overflow is kept, exactly as the phase keeps it.
    expect(player.sciencePool).toBe(0);
  });

  it('banks the beakers when they do not cover the technology', () => {
    const state = withCity();
    const player = playerById(state, 0)!;
    player.researching = 'ironWorking';
    player.sciencePool = 0;

    offerOf(state, 0, 'starTablets');
    const done = settleDiscovery(state, player, 0);
    expect(player.sciencePool).toBe(15);
    expect(player.researching).toBe('ironWorking');
    expect(done?.completed).toBeNull();
  });

  it('hands over a free unit, on the site, able to act at once', () => {
    const state = withCity();
    // The claimant is standing on the site, so a granted scout has to find its
    // own hex: the stacking fallback is not decoration.
    createUnit(state, 0, 'warrior', 7, 7);
    offerOf(state, 0, 'aGuideOffersService', 7, 7);
    const done = settleDiscovery(state, playerById(state, 0)!, 0);

    const scout = state.units.find((unit) => unit.type === 'scout');
    expect(scout).toBeDefined();
    expect(done?.unitName).toBe('Scout');
    // Full movement: born through `createUnit` like every other unit, so the
    // moment of the gift is the moment of the payoff (Entry XVIII.2).
    expect(scout!.movesLeft).toBe(3);
    expect(scout!.hasAttacked).toBe(false);
  });

  it('says so when there is no city to receive a lump', () => {
    // An empire with no towns. The boon is not silently paid into nothing.
    const state = bareState();
    offerOf(state, 0, 'grainCache');
    const done = settleDiscovery(state, playerById(state, 0)!, 0);
    expect(done?.cityName).toBeNull();
    expect(done?.warning).toBe('no city to receive it');
  });

  it('is modifier-immune: the printed number, in every empire', () => {
    // Entry XVIII.5, extended to the ruins. Two empires, one of them running a
    // large happiness bonus and a production modifier, both get exactly 20.
    const plain = bareState();
    foundCityAt(plain, 0, at(plain, 5, 5));
    const boosted = bareState();
    foundCityAt(boosted, 0, at(boosted, 5, 5));
    const rich = boosted.cities[0]!;
    rich.buildings.push('barracks');
    rich.queue = [{ kind: 'unit', id: 'warrior' }];
    playerById(boosted, 0)!.techsResearched = [...TECH_IDS];

    for (const state of [plain, boosted]) {
      const city = state.cities[0]!;
      city.hammerBasket = 0;
      // An empty queue, so nothing is *spent* and the basket shows the grant
      // itself: what is being measured is the size of the lump, not what it
      // happened to finish.
      city.queue = [];
      offerOf(state, 0, 'masonsHoard', 5, 5);
      settleDiscovery(state, playerById(state, 0)!, 0);
      expect(city.hammerBasket).toBe(20);
    }
    // And the modifier is real, so the test is not vacuous: the boosted city
    // does make more hammers per turn than the plain one.
    expect(cityYields(boosted, rich, [], rich.queue[0]).production).toBeGreaterThanOrEqual(
      cityYields(plain, plain.cities[0]!, [], plain.cities[0]!.queue[0]).production,
    );
  });
});

describe('the preview', () => {
  it('promises exactly what the settlement will do', () => {
    // Rule 5 for a decision: the card's figures come from the same `plan…`
    // functions that settle it, so a promise and a payoff cannot drift.
    const state = bareState();
    foundCityAt(state, 0, at(state, 5, 5));
    const city = state.cities[0]!;
    city.queue = [{ kind: 'building', id: 'monument' }];
    city.hammerBasket = 0;

    const player = playerById(state, 0)!;
    player.pendingDiscovery = { kind: 'ruins', col: 6, row: 5, options: ['masonsHoard'] };
    const [payoff] = explainDiscoveryOffer(state, 0, player.pendingDiscovery);
    expect(payoff!.yield).toBe('production');
    expect(payoff!.amount).toBe(20);
    expect(payoff!.cityName).toBe(city.name);
    expect(payoff!.completes).toBe('Monument');

    const done = settleDiscovery(state, player, 0);
    expect(done?.completed).toBe(payoff!.completes);
    expect(done?.cityName).toBe(payoff!.cityName);
  });

  it('warns when a lump would have nowhere to land', () => {
    const state = bareState();
    const player = playerById(state, 0)!;
    player.pendingDiscovery = { kind: 'village', col: 5, row: 5, options: ['grainCache'] };
    const [payoff] = explainDiscoveryOffer(state, 0, player.pendingDiscovery);
    expect(payoff!.warning).toBe('no city near enough to receive it');
  });
});

describe('the blocker', () => {
  it('outranks every other piece of unfinished business', () => {
    const state = bareState();
    // An idle unit *and* a city with an empty queue *and* no research: three
    // other blockers, all outranked.
    createUnit(state, 0, 'warrior', 3, 3);
    foundCityAt(state, 0, at(state, 5, 5));
    playerById(state, 0)!.researching = null;
    expect(firstBlocker(state, 0)?.kind).toBe('idleUnit');

    offerOf(state, 0, 'tradersHoard');
    expect(firstBlocker(state, 0)).toEqual({ kind: 'discovery' });

    applyCommand(state, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 });
    expect(firstBlocker(state, 0)?.kind).toBe('idleUnit');
  });
});

describe('replay', () => {
  it('reproduces a claim and a pick byte for byte', () => {
    // The doctrine's third claim: both halves are in the log, so a replay deals
    // the same three cards and takes the same one.
    const game = createGame({
      seed: 20260824,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    // Walk the whole roster around for a while; on this map somebody finds
    // something, and if they do not the pick below is simply never sent.
    for (let turn = 0; turn < 25; turn++) {
      for (const unit of [...game.state.units]) {
        const target = { col: unit.col + 2, row: unit.row + (turn % 3) - 1 };
        dispatch(game, { type: 'moveUnit', playerId: 0, unitId: unit.id, target });
      }
      const pending = playerById(game.state, 0)?.pendingDiscovery;
      if (pending) {
        dispatch(game, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 });
      }
      dispatch(game, { type: 'endTurn', playerId: 0 });
    }

    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
  });

  it('deals the same three options for the same seed and log', () => {
    const config = {
      seed: 5150,
      sizeName: 'duel' as const,
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    };
    const state = newGame(config);
    const twin = newGame(config);
    const tile = state.map.tiles.find((candidate) => candidate.terrain === 'grassland')!;
    const twinTile = twin.map.tiles[state.map.tiles.indexOf(tile)]!;
    tile.discovery = 'ruins';
    twinTile.discovery = 'ruins';

    const one = createUnit(state, 0, 'scout', tile.col, tile.row);
    const two = createUnit(twin, 0, 'scout', twinTile.col, twinTile.row);
    expect(claimDiscoveryAt(state, one, tile)!.options).toEqual(
      claimDiscoveryAt(twin, two, twinTile)!.options,
    );
  });
});

describe('arrival', () => {
  it('is the one place standing on a hex means something', () => {
    // `arriveOnTile` is called from both the march and the advance-after-a-kill;
    // an ordinary step reports nothing at all, which is what makes it free to
    // call on every hex of every move.
    const state = bareState();
    const scout = createUnit(state, 0, 'scout', 4, 4);
    expect(arriveOnTile(state, scout, at(state, 4, 4))).toEqual({
      discovery: null,
      camp: null,
      captured: [],
    });
  });
});

describe('a blank world', () => {
  it('scatters nothing on a map with no land', () => {
    const map = createMap({ width: 6, height: 6, terrain: 'ocean' });
    placeDiscoveries(map, makeRng(1), MAPGEN_CONFIG.resources);
    expect(discoveryCells(map)).toEqual([]);
  });
});
