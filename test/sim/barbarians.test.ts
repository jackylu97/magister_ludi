import { describe, expect, it } from 'vitest';

import {
  type BarbarianRole,
  barbarianMeleeType,
  barbarianRoles,
  barbarianTier,
  barbarianTurn,
  barbarianUnitType,
  campHasHorses,
  nearestTarget,
  canFoundCampAt,
  foundCamps,
  musterCamps,
  raid,
} from '../../src/sim/barbarians';
import { campAt, hasCampAt, settleCampBounty } from '../../src/sim/camps';
import { assignCitizens, foundCityAt, growthThreshold } from '../../src/sim/cities';
import {
  applyCombat,
  cityAttackPhase,
  cityMaxHp,
  previewCombat,
  updateElimination,
} from '../../src/sim/combat';
import { applyCommand } from '../../src/sim/commands';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import {
  createMap,
  getTileAt,
  mapRange,
  tileHex,
  tileIndex,
  wrappedDistance,
  type Tile,
} from '../../src/sim/map';
import { isPassable } from '../../src/sim/pathfind';
import { RULES } from '../../src/sim/rulesData';
import {
  type GameState,
  allTurnsEnded,
  barbarianPlayer,
  clearTurnEnded,
  createUnit,
  isBarbarian,
  newGame,
  playerById,
  realPlayers,
  type Unit,
} from '../../src/sim/state';
import { advanceResearch } from '../../src/sim/tech';
import { TECH_IDS, type TechId } from '../../src/sim/techData';
import { END_OF_TURN_PHASES, emptyTurnReport, runEndOfTurn } from '../../src/sim/turn';
import { unitDef } from '../../src/sim/unitData';
import { fullMovement, hasStackingRoom } from '../../src/sim/units';
import {
  VISIBLE,
  isVisibleTo,
  recomputeAllVisibility,
  resetVisibility,
  visibilityAt,
} from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { firstBlocker } from '../../src/ui/turnBlockers';

/**
 * The wild (playable.md item 3, ledger Entry XX).
 *
 * Four separable claims, kept apart because they fail for different reasons:
 *
 *   1. **The faction is a seat, and the exclusions are written down.** It plays
 *      by every rule that is about the board — combat, stacking, movement, fog —
 *      and by none that is about being a nation: no turn to wait for, no
 *      research, no elimination, no victory, no blocker, no seat to sit in.
 *   2. **Camps appear where nobody is looking.** Never inside anybody's borders,
 *      never on a hex a real empire can currently see, and never inside the three
 *      distances.
 *   3. **What comes out is the middle of the pack**, mapped through the unit
 *      table by one stated rule — plus the horse exception and its turn gate.
 *   4. **Fighting the wild is +2**, on one line, in the same plan the reducer
 *      resolves through.
 */

const BARB = RULES.barbarians;

/** A world with the wild in it, on blank grassland. */
function wildState(width = 16, height = 14, seats = 2): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ].slice(0, seats),
    barbarians: true,
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  computeFreshwater(state.map);
  recomputeAllVisibility(state);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** The wild's seat id in a world that has one. */
function wildId(state: GameState): number {
  return barbarianPlayer(state)!.id;
}

describe('the faction', () => {
  it('is absent unless the config asks for it', () => {
    const quiet = newGame({
      seed: 1,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
    });
    expect(barbarianPlayer(quiet)).toBeUndefined();
    expect(quiet.players).toHaveLength(1);
    expect(quiet.camps).toEqual([]);
  });

  it('is appended last, so every real seat keeps the id it would have had', () => {
    const config = {
      seed: 1,
      sizeName: 'duel' as const,
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    };
    const quiet = newGame(config);
    const wild = newGame({ ...config, barbarians: true });

    expect(wild.players).toHaveLength(3);
    expect(realPlayers(wild).map((player) => player.id)).toEqual([0, 1]);
    expect(wildId(wild)).toBe(2);
    // The opening rosters are identical — the wild is seated *after* the starts
    // are chosen, so it costs the real seats nothing at all.
    expect(wild.units.map((unit) => ({ ...unit }))).toEqual(
      quiet.units.map((unit) => ({ ...unit })),
    );
    // And every parallel-array-over-players grew with it.
    expect(wild.turnEnded).toHaveLength(3);
    expect(wild.visibility).toHaveLength(3);
    expect(wild.citySightings).toHaveLength(3);
  });

  it('is finished before the turn begins, and every turn after', () => {
    const state = wildState();
    expect(state.turnEnded[wildId(state)]).toBe(true);
    // Nothing ever waits for it: the two real seats ending is the whole turn.
    state.turnEnded[0] = true;
    state.turnEnded[1] = true;
    expect(allTurnsEnded(state)).toBe(true);

    clearTurnEnded(state);
    expect(state.turnEnded[0]).toBe(false);
    expect(state.turnEnded[wildId(state)]).toBe(true);
  });

  it('is never eliminated and never counted for victory', () => {
    // A solo game against the wild. Without the exclusion this declares the
    // human victorious the moment the last raider falls — or, worse, refuses to
    // declare anything while one is still standing in the fog.
    const state = wildState(16, 14, 1);
    createUnit(state, 0, 'warrior', 3, 3);
    updateElimination(state);
    expect(state.winnerId).toBeNull();
    expect(barbarianPlayer(state)!.eliminated).toBe(false);

    // And with a raider on the board the human is still not "the last standing",
    // because there is only one real seat to begin with.
    createUnit(state, wildId(state), 'warrior', 9, 9);
    updateElimination(state);
    expect(state.winnerId).toBeNull();
  });

  it('lets a two-empire game still be won while raiders are alive', () => {
    const state = wildState(16, 14, 2);
    createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, wildId(state), 'warrior', 9, 9);
    updateElimination(state);
    // Player 1 holds nothing, so player 0 has won — the barbarian's warrior is
    // not a surviving empire.
    expect(playerById(state, 1)!.eliminated).toBe(true);
    expect(state.winnerId).toBe(0);
  });

  it('does not learn', () => {
    const state = wildState();
    const wild = barbarianPlayer(state)!;
    expect(wild.techsResearched).toEqual([]);
    // Even handed an aim and a full pool, the research phase walks past it.
    wild.researching = 'mining';
    wild.sciencePool = 10_000;
    advanceResearch(state);
    expect(wild.techsResearched).toEqual([]);
    expect(wild.researching).toBe('mining');
  });

  it('is never asked for a decision by the blocker', () => {
    const state = wildState();
    createUnit(state, wildId(state), 'warrior', 5, 5);
    expect(firstBlocker(state, wildId(state))).toBeNull();
  });

  it('answers `isBarbarian` and nothing else does', () => {
    const state = wildState();
    expect(isBarbarian(state, wildId(state))).toBe(true);
    expect(isBarbarian(state, 0)).toBe(false);
    expect(isBarbarian(state, 99)).toBe(false);
  });
});

describe('the phase', () => {
  it('sits after the towns and before the healing', () => {
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    // The position is a rules decision (see `barbarianTurn`): after the cities'
    // phases so a raid meets the world this turn produced, before `healUnits` so
    // a raider that marched or fought is not resting.
    expect(names.indexOf('barbarians')).toBeGreaterThan(names.indexOf('healCities'));
    expect(names.indexOf('barbarians')).toBeLessThan(names.indexOf('healUnits'));
    expect(names.indexOf('barbarians')).toBeLessThan(names.indexOf('resetMovement'));
    expect(names.indexOf('barbarians')).toBeLessThan(names.indexOf('refreshVisibility'));
  });

  it('does nothing at all in a world with no wild in it', () => {
    const quiet = newGame({
      seed: 4,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
    });
    const before = snapshotState(quiet);
    quiet.turn = 40;
    barbarianTurn(quiet);
    quiet.turn = 1;
    expect(snapshotState(quiet)).toBe(before);
  });
});

describe('where a camp may stand', () => {
  it('refuses ground a real empire can currently see', () => {
    const state = wildState();
    const scout = createUnit(state, 0, 'scout', 8, 7);
    recomputeAllVisibility(state);
    const watched = at(state, 8, 7);
    expect(visibilityAt(state, 0, watched.col, watched.row)).toBe(VISIBLE);
    expect(canFoundCampAt(state, watched, [])).toBe(false);

    // Remembered ground is fair game — that is the whole feeling: the country
    // you stopped patrolling is the country that turns.
    scout.col = 1;
    scout.row = 1;
    recomputeAllVisibility(state);
    expect(visibilityAt(state, 0, watched.col, watched.row)).not.toBe(VISIBLE);
    expect(canFoundCampAt(state, watched, [])).toBe(true);
  });

  it('refuses ground inside anybody’s borders', () => {
    const state = wildState();
    foundCityAt(state, 0, at(state, 4, 4));
    // Owned, watched, and inside the city distance — three reasons at once, and
    // the ownership one is asserted directly on a hex far enough away.
    const owned = state.map.tiles.find(
      (tile) => state.tileOwner[tileIndex(state.map, tile.col, tile.row)] !== null,
    )!;
    expect(canFoundCampAt(state, owned, [])).toBe(false);
  });

  it('keeps its distance from cities, starts and other camps', () => {
    const state = wildState(24, 20);
    foundCityAt(state, 0, at(state, 4, 4));
    // Nothing watching the far side of the board.
    state.units.length = 0;
    recomputeAllVisibility(state);

    const start = at(state, 18, 16);
    const city = at(state, 4, 4);
    for (const tile of state.map.tiles) {
      if (!canFoundCampAt(state, tile, [start])) continue;
      expect(
        wrappedDistance(state.map, tileHex(tile), tileHex(city)),
      ).toBeGreaterThanOrEqual(BARB.minCampDistanceFromCity);
      expect(
        wrappedDistance(state.map, tileHex(tile), tileHex(start)),
      ).toBeGreaterThanOrEqual(BARB.minCampDistanceFromStart);
    }

    state.camps.push({ col: 12, row: 12, foundedTurn: 1 });
    const neighbour = at(state, 13, 12);
    expect(canFoundCampAt(state, neighbour, [])).toBe(false);
  });

  it('refuses a hex with a unit, a city, a camp or a ruin on it', () => {
    const state = wildState();
    // Nobody watching: units light their own hex, so the wild's own raider is
    // used as the occupant rather than a real seat's.
    const occupied = at(state, 10, 10);
    createUnit(state, wildId(state), 'warrior', 10, 10);
    expect(canFoundCampAt(state, occupied, [])).toBe(false);

    const site = at(state, 12, 10);
    site.discovery = 'ruins';
    expect(canFoundCampAt(state, site, [])).toBe(false);
    delete site.discovery;
    expect(canFoundCampAt(state, site, [])).toBe(true);

    state.camps.push({ col: 12, row: 10, foundedTurn: 1 });
    expect(canFoundCampAt(state, site, [])).toBe(false);
  });

  it('founds on the cadence, up to the cap, and every camp is legal', () => {
    const state = wildState(24, 20);
    // No eyes anywhere.
    state.units = [];
    recomputeAllVisibility(state);

    const founded: number[] = [];
    for (let turn = 1; turn <= 60; turn++) {
      state.turn = turn;
      const before = state.camps.length;
      foundCamps(state);
      if (state.camps.length > before) founded.push(turn);
    }
    // Nothing before the opening is meant to be quiet until.
    expect(Math.min(...founded)).toBe(BARB.firstCampTurn);
    // On the cadence, and never above the cap.
    for (const turn of founded) {
      expect((turn - BARB.firstCampTurn) % BARB.campEveryTurns).toBe(0);
    }
    expect(state.camps.length).toBeLessThanOrEqual(BARB.maxCamps);
    expect(state.camps.length).toBeGreaterThan(0);

    // Every camp respects the spacing rule against every other.
    for (let i = 0; i < state.camps.length; i++) {
      for (let j = i + 1; j < state.camps.length; j++) {
        const a = at(state, state.camps[i]!.col, state.camps[i]!.row);
        const b = at(state, state.camps[j]!.col, state.camps[j]!.row);
        expect(
          wrappedDistance(state.map, tileHex(a), tileHex(b)),
        ).toBeGreaterThanOrEqual(BARB.minCampDistanceApart);
      }
    }
  });
});

describe('the median-tier rule', () => {
  /** Gives each real seat a tech count, in seat order. */
  function tiers(state: GameState, counts: number[]): void {
    realPlayers(state).forEach((player, index) => {
      player.techsResearched = TECH_IDS.slice(0, counts[index] ?? 0) as TechId[];
    });
  }

  it('takes the lower of the two middles on an even roster', () => {
    const state = wildState(16, 14, 2);
    tiers(state, [2, 8]);
    // The wild follows the pack, it does not lead it: two seats, and the tier is
    // the *weaker* one's tree.
    expect(barbarianTier(state)).toHaveLength(2);
  });

  it('reads the median seat’s own technologies, not a count', () => {
    const state = wildState(16, 14, 2);
    const [a, b] = realPlayers(state);
    a!.techsResearched = ['agriculture'];
    b!.techsResearched = ['agriculture', 'mining', 'earthenware', 'bronzeWorking'];
    // The lower median is A, so the wild fields what A can field.
    expect(barbarianTier(state)).toEqual(['agriculture']);
    expect(barbarianMeleeType(state)).toBe('warrior');

    // Level the pack up and the wild follows it, one rung at a time.
    a!.techsResearched = ['agriculture', 'mining', 'earthenware', 'bronzeWorking'];
    expect(barbarianMeleeType(state)).toBe('spearman');
  });

  it('walks the whole footmen ladder and stops at the strongest unlocked', () => {
    const state = wildState(16, 14, 1);
    const seat = realPlayers(state)[0]!;
    const rung = (techs: TechId[]): string | null => {
      seat.techsResearched = techs;
      return barbarianMeleeType(state);
    };
    expect(rung(['agriculture'])).toBe('warrior');
    expect(rung(['agriculture', 'bronzeWorking'])).toBe('spearman');
    // Iron Working unlocks the swordsman, and the wild fields it **without the
    // iron** — it is not an empire and has no supply. That asymmetry is the one
    // place it does not play by the rules, and it is deliberate.
    expect(rung(['agriculture', 'bronzeWorking', 'ironWorking'])).toBe('swordsman');
    expect(unitDef('swordsman').requiresResource).toBe('iron');
    expect(rung([...TECH_IDS])).toBe('longswordsman');
  });

  it('ignores the eliminated, and still answers with nobody left', () => {
    const state = wildState(16, 14, 2);
    const [a, b] = realPlayers(state);
    a!.techsResearched = [...TECH_IDS];
    b!.techsResearched = ['agriculture'];
    b!.eliminated = true;
    // A dead empire does not get a vote on how hard the world is.
    expect(barbarianTier(state)).toEqual([...TECH_IDS]);

    a!.eliminated = true;
    // Everybody gone: still an answer, and still a unit the wild can field.
    expect(barbarianMeleeType(state)).not.toBeNull();
  });
});

describe('the horse rule', () => {
  it('musters horsemen beside a herd, but only after the turn gate', () => {
    const state = wildState();
    at(state, 9, 9).resource = 'horses';
    const camp = { col: 9, row: 10, foundedTurn: 1 };
    expect(campHasHorses(state, camp)).toBe(true);

    state.turn = BARB.horsemanFromTurn - 1;
    expect(barbarianUnitType(state, camp)).toBe(barbarianMeleeType(state));
    state.turn = BARB.horsemanFromTurn;
    expect(barbarianUnitType(state, camp)).toBe('horseman');
    // And the turn gate *is* the tier check for that one type: the wild never
    // researched Husbandry, and a herd on the steppe is not waiting for anybody.
    expect(realPlayers(state)[0]!.techsResearched).not.toContain('husbandry');
  });

  it('leaves a camp out of horse country on foot, however late it is', () => {
    const state = wildState();
    at(state, 2, 2).resource = 'horses';
    const camp = { col: 14, row: 12, foundedTurn: 1 };
    state.turn = 200;
    expect(campHasHorses(state, camp)).toBe(false);
    expect(barbarianUnitType(state, camp)).toBe(barbarianMeleeType(state));
  });
});

describe('mustering', () => {
  it('waits a turn, then musters on the cadence, up to the band cap', () => {
    const state = wildState();
    state.camps.push({ col: 8, row: 8, foundedTurn: 4 });
    const wild = wildId(state);
    const band = (): number => state.units.filter((unit) => unit.ownerId === wild).length;

    // Not on the turn it was founded.
    state.turn = 4;
    musterCamps(state);
    expect(band()).toBe(0);

    state.turn = 4 + BARB.unitEveryTurns;
    musterCamps(state);
    expect(band()).toBe(1);

    // The cap is counted over the band still *near* the camp.
    for (let n = 2; n <= BARB.maxUnitsPerCamp + 2; n++) {
      state.turn += BARB.unitEveryTurns;
      musterCamps(state);
    }
    expect(band()).toBe(BARB.maxUnitsPerCamp);

    // March the garrison away and the camp musters again — which is what makes
    // a camp left standing a faucet rather than a one-off.
    for (const unit of state.units) {
      unit.col = 1;
      unit.row = 1;
    }
    state.turn += BARB.unitEveryTurns;
    musterCamps(state);
    expect(band()).toBe(BARB.maxUnitsPerCamp + 1);
  });
});

describe('raiding', () => {
  it('marches on what it can see and attacks when it arrives', () => {
    const state = wildState();
    const wild = wildId(state);
    const prey = createUnit(state, 0, 'worker', 8, 8);
    const raider = createUnit(state, wild, 'warrior', 10, 8);
    recomputeAllVisibility(state);

    state.turn = 20;
    barbarianTurn(state);
    // Either it closed the distance or it took the worker; both are the rule
    // working. A captured civilian changes hands rather than dying.
    const stillWorker = state.units.find((unit) => unit.id === prey.id);
    const moved = state.units.find((unit) => unit.id === raider.id);
    expect(
      stillWorker === undefined ||
        stillWorker.ownerId === wild ||
        wrappedDistance(
          state.map,
          tileHex(at(state, moved!.col, moved!.row)),
          tileHex(at(state, 8, 8)),
        ) < 2,
    ).toBe(true);
  });

  it('does not march the band it mustered this turn', () => {
    const state = wildState();
    state.camps.push({ col: 8, row: 8, foundedTurn: 1 });
    state.turn = 1 + BARB.unitEveryTurns;
    barbarianTurn(state);
    const born = state.units.filter((unit) => unit.ownerId === wildId(state));
    expect(born).toHaveLength(1);
    // Full allowance, unspent: it is born as any other unit is and acts on the
    // turn its owner next moves.
    expect(born[0]!.movesLeft).toBe(unitDef(born[0]!.type).movement);
  });

  it('wanders near its camp with nothing in reach, and stays on the board', () => {
    const state = wildState();
    state.camps.push({ col: 8, row: 8, foundedTurn: 1 });
    const raider = createUnit(state, wildId(state), 'warrior', 8, 8);
    state.turn = 30;
    for (let i = 0; i < 12; i++) barbarianTurn(state);

    const alive = state.units.find((unit) => unit.id === raider.id)!;
    expect(
      wrappedDistance(state.map, tileHex(at(state, alive.col, alive.row)), tileHex(at(state, 8, 8))),
    ).toBeLessThanOrEqual(BARB.wanderRadius);
  });
});

describe('the +2 against the wild', () => {
  it('is a labelled line on the attacker, and on the defender', () => {
    const state = wildState();
    const wild = wildId(state);
    const mine = createUnit(state, 0, 'warrior', 5, 5);
    const theirs = createUnit(state, wild, 'warrior', 6, 5);
    recomputeAllVisibility(state);

    const attacking = previewCombat(state, mine.id, { col: 6, row: 5 });
    expect(attacking.ok).toBe(true);
    if (!attacking.ok) return;
    expect(attacking.bonuses).toEqual([
      { source: 'Against barbarians', side: 'attacker', amount: BARB.combatBonus },
    ]);
    expect(attacking.attackerStrength).toBe(
      unitDef('warrior').combatStrength + BARB.combatBonus,
    );

    // And from the other side of the same fight: the empire is steadier
    // defending too, so the bonus rides on the defender's line.
    const raiding = previewCombat(state, theirs.id, { col: 5, row: 5 });
    expect(raiding.ok).toBe(true);
    if (!raiding.ok) return;
    expect(raiding.bonuses).toEqual([
      { source: 'Against barbarians', side: 'defender', amount: BARB.combatBonus },
    ]);
    expect(raiding.defenderStrength).toBeGreaterThan(unitDef('warrior').combatStrength);
  });

  it('is not given to the wild, and not given between two empires', () => {
    const state = wildState();
    const a = createUnit(state, 0, 'warrior', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const between = previewCombat(state, a.id, { col: 6, row: 5 });
    expect(between.ok && between.bonuses).toEqual([]);
  });

  it('rides on a city under raid too', () => {
    const state = wildState();
    foundCityAt(state, 0, at(state, 5, 5));
    const raider = createUnit(state, wildId(state), 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const view = previewCombat(state, raider.id, { col: 5, row: 5 });
    expect(view.ok).toBe(true);
    if (!view.ok) return;
    expect(view.bonuses).toEqual([
      { source: 'Against barbarians', side: 'defender', amount: BARB.combatBonus },
    ]);
  });

  it('is flat, so it is worth the same in every era', () => {
    // The reason it is points and not a percentage: the damage curve is
    // exponential in the *difference* of two strengths, so a flat +2 is the same
    // multiplier against a warrior as against a longswordsman.
    const state = wildState();
    const early = createUnit(state, 0, 'warrior', 5, 5);
    createUnit(state, wildId(state), 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const view = previewCombat(state, early.id, { col: 6, row: 5 });
    expect(view.ok && view.attackerStrength - view.defenderStrength).toBe(BARB.combatBonus);
  });
});

describe('clearing a camp', () => {
  it('pays gold to the treasury and food to the nearest owned city', () => {
    const state = wildState();
    foundCityAt(state, 0, at(state, 5, 5));
    const city = state.cities[0]!;
    state.camps.push({ col: 9, row: 5, foundedTurn: 1 });
    const goldBefore = playerById(state, 0)!.gold;
    const foodBefore = city.foodBasket;
    const popBefore = city.population;
    const threshold = growthThreshold(popBefore);

    const warrior = createUnit(state, 0, 'warrior', 8, 5);
    const result = applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: warrior.id,
      target: { col: 9, row: 5 },
    });

    expect(result.ok).toBe(true);
    expect(hasCampAt(state, 9, 5)).toBe(false);
    expect(playerById(state, 0)!.gold).toBe(goldBefore + BARB.campClearGold);
    // The provisions land in the basket **and settle it**: 25🌾 covers a size-1
    // city's threshold, so the town grows on the spot and keeps the overflow.
    // Asserting the raw basket would be asserting that the windfall did *not*
    // settle, which is the opposite of Entry XVIII.
    expect(city.population).toBe(popBefore + 1);
    expect(city.foodBasket).toBe(foodBefore + BARB.campClearFood - threshold);
    // And the reducer reports both halves, so the interface never re-derives
    // which town received the provisions.
    const bounty = result.ok ? result.arrivals?.[0]?.camp : null;
    expect(bounty?.gold).toBe(BARB.campClearGold);
    expect(bounty?.food).toBe(BARB.campClearFood);
    expect(bounty?.cityName).toBe(city.name);
    expect(bounty?.warning).toBeNull();
  });

  it('grows the city on the spot when the provisions fill the basket', () => {
    // The food half is a windfall like any other: it settles the growth bucket
    // the instant it lands rather than waiting for the next resolution.
    const state = wildState();
    foundCityAt(state, 0, at(state, 5, 5));
    const city = state.cities[0]!;
    city.foodBasket = growthThreshold(city.population) - BARB.campClearFood;
    const before = city.population;

    const bounty = settleCampBounty(state, 0, { col: 9, row: 5 });
    expect(city.population).toBe(before + 1);
    expect(bounty.grownTo).toBe(before + 1);
  });

  it('forfeits the food, and says so, for an empire with no cities', () => {
    // The edge the spec asked for: gold still lands, provisions have nowhere to
    // go, and the interface is told rather than left to wonder.
    const state = wildState();
    const bounty = settleCampBounty(state, 0, { col: 9, row: 5 });
    expect(bounty.gold).toBe(BARB.campClearGold);
    expect(bounty.food).toBe(0);
    expect(bounty.cityName).toBeNull();
    expect(bounty.grownTo).toBeNull();
    expect(bounty.warning).toBe('no city to receive the provisions');
    expect(playerById(state, 0)!.gold).toBe(BARB.campClearGold);
  });

  it('pays the wild nothing for walking over its own camp', () => {
    const state = wildState();
    state.camps.push({ col: 9, row: 5, foundedTurn: 1 });
    const raider = createUnit(state, wildId(state), 'warrior', 8, 5);
    applyCommand(state, {
      type: 'moveUnit',
      playerId: wildId(state),
      unitId: raider.id,
      target: { col: 9, row: 5 },
    });
    // Still standing: the wild does not clear the wild.
    expect(hasCampAt(state, 9, 5)).toBe(true);
    expect(barbarianPlayer(state)!.gold).toBe(0);
  });

  it('is cleared by a melee winner advancing onto it — a civilian on it included', () => {
    /**
     * The whole of the user's ruling of 2026-08-28 in one command: "ensure that
     * when this happens on a barbarian camp, the camp is also properly cleared".
     *
     * A lone worker parked on a camp used to be the case that fell between two
     * rules — the blow captured it in place, so nobody ever arrived on the hex
     * and the camp stood with a laborer of yours sitting on it. Now the blow *is*
     * the arrival, and one `arriveOnTile` does all four things: the camp goes,
     * the bounty is paid, the prisoner changes hands, and the news comes back on
     * the same `CommandResult`.
     */
    const state = wildState();
    foundCityAt(state, 0, at(state, 5, 5));
    state.camps.push({ col: 9, row: 5, foundedTurn: 1 });
    const defender = createUnit(state, wildId(state), 'worker', 9, 5);
    const attacker = createUnit(state, 0, 'warrior', 8, 5);
    recomputeAllVisibility(state);
    const goldBefore = playerById(state, 0)!.gold;

    const result = applyCommand(state, {
      type: 'attack',
      playerId: 0,
      unitId: attacker.id,
      target: { col: 9, row: 5 },
    });
    expect(result.ok).toBe(true);

    const advanced = state.units.find((unit) => unit.id === attacker.id)!;
    expect({ col: advanced.col, row: advanced.row }).toEqual({ col: 9, row: 5 });
    expect(hasCampAt(state, 9, 5)).toBe(false);
    expect(campAt(state, 9, 5)).toBeNull();
    expect(playerById(state, 0)!.gold).toBe(goldBefore + BARB.campClearGold);
    expect(state.units.find((unit) => unit.id === defender.id)!.ownerId).toBe(0);

    // One result, four facts. The bounty and the prisoner ride the same arrival.
    const arrival = result.ok ? result.arrivals?.[0] : undefined;
    expect(arrival?.camp?.gold).toBe(BARB.campClearGold);
    expect(arrival?.captured).toEqual([
      { id: defender.id, type: 'worker', fromOwnerId: wildId(state), fromWild: true },
    ]);
  });
});

/**
 * The three roles (ledger Entry XX.H).
 *
 * Every claim here is about *derived* intent: nothing in `GameState` says what a
 * barbarian is doing, so each test builds a board and asks what that board
 * implies. A regression in this block looks like a raider that forgot its
 * prisoner or a camp that kept one it should have handed back.
 */

/**
 * A quiet turn number: no camp founding sweep, and no muster from a camp
 * founded on turn 1.
 *
 * **Derived, never written down.** It was a literal 20 until the wild's
 * cadences were retuned on 2026-08-26 (`campEveryTurns` 3→2, `unitEveryTurns`
 * 4→3), at which point 20 quietly became a *founding* turn — and the fixture
 * about a cargo with nowhere to go started walking it home to a camp that had
 * just appeared under it. Read off `rules.json` the way every other number in
 * this file is, so the next retune moves it instead of breaking it.
 */
const QUIET_TURN = ((): number => {
  for (let turn = 12; turn < 500; turn++) {
    if ((turn - BARB.firstCampTurn) % Math.max(1, BARB.campEveryTurns) === 0) continue;
    if ((turn - 1) % Math.max(1, BARB.unitEveryTurns) === 0) continue;
    return turn;
  }
  throw new Error('rules.json leaves no quiet turn for these fixtures');
})();

/**
 * What `resetMovement` does, for a test that drives `barbarianTurn` directly:
 * without it every unit on the board spends its allowance once and stands still
 * for the rest of the loop.
 */
function refill(state: GameState): void {
  for (const unit of state.units) {
    unit.movesLeft = fullMovement(unit);
    unit.hasAttacked = false;
  }
}

/** The wild's roles on this board, over every unit it holds right now. */
function rolesOf(state: GameState): Map<number, BarbarianRole> {
  const wild = barbarianPlayer(state)!;
  return barbarianRoles(
    state,
    wild,
    state.units.filter((unit) => unit.ownerId === wild.id).map((unit) => unit.id),
  );
}

function distance(state: GameState, a: { col: number; row: number }, b: { col: number; row: number }): number {
  return wrappedDistance(state.map, tileHex(at(state, a.col, a.row)), tileHex(at(state, b.col, b.row)));
}

describe('role derivation', () => {
  it('prefers theft to raiding when an unguarded civilian is in reach', () => {
    const state = wildState();
    const wild = wildId(state);
    // Something to raid *and* something to steal, the raider between them.
    foundCityAt(state, 0, at(state, 5, 8));
    const prey = createUnit(state, 0, 'worker', 9, 8);
    const raider = createUnit(state, wild, 'warrior', 10, 8);
    recomputeAllVisibility(state);

    expect(rolesOf(state).get(raider.id)).toEqual({ kind: 'thief', preyId: prey.id });
  });

  it("Wolf-Mother's Pact takes the pact-holder's civilians off the menu too", () => {
    const state = wildState();
    const wild = wildId(state);
    foundCityAt(state, 0, at(state, 5, 8));
    const prey = createUnit(state, 0, 'worker', 9, 8);
    const raider = createUnit(state, wild, 'warrior', 10, 8);
    recomputeAllVisibility(state);
    // Without the pact this is a theft, which is the case above said again so
    // that the clause below is measured against something.
    expect(rolesOf(state).get(raider.id)).toEqual({ kind: 'thief', preyId: prey.id });

    // The master-list cut of 2026-08-28 reversed the card: "barbarians never
    // attack you (no civilian unit thefts)". A raider already skipped this seat
    // in `nearestTarget`; a *thief* picks its prey in `barbarianRoles`, so
    // without a clause there the wolves left the spears alone and still walked
    // off with every worker.
    state.players[0]!.statecraft.doctrines.push('wolfMothersPact' as never);
    expect(rolesOf(state).get(raider.id)).toEqual({ kind: 'raider' });
    // And the raider it becomes has nothing to march on either — the pact is one
    // rule read at two seams, and neither of them names this seat.
    expect(nearestTarget(state, barbarianPlayer(state)!, raider)).toBeNull();
  });

  it('leaves a guarded civilian alone: the stacking rule decides, not a clause', () => {
    const state = wildState();
    const wild = wildId(state);
    createUnit(state, 0, 'worker', 9, 8);
    createUnit(state, 0, 'warrior', 9, 8);
    const raider = createUnit(state, wild, 'warrior', 10, 8);
    recomputeAllVisibility(state);

    // Not prey at all — so the raider is a raider, and what it walks up to is a
    // fight with the guard rather than a theft.
    expect(rolesOf(state).get(raider.id)).toEqual({ kind: 'raider' });
  });

  it('does not see a civilian its own fog has never lifted', () => {
    const state = wildState();
    const wild = wildId(state);
    const raider = createUnit(state, wild, 'warrior', 4, 8);
    // Well outside the raider's sight (2) but inside `theftRadius` (5).
    const prey = createUnit(state, 0, 'worker', 9, 8);
    recomputeAllVisibility(state);

    expect(isVisibleTo(state, wild, prey.col, prey.row)).toBe(false);
    expect(rolesOf(state).get(raider.id)).toEqual({ kind: 'raider' });
    // And it stays where it is rather than drifting toward a hex it cannot see.
    state.turn = QUIET_TURN;
    barbarianTurn(state);
    expect(state.units.find((unit) => unit.id === prey.id)!.ownerId).toBe(0);
  });

  it('sends exactly one raider after one worker', () => {
    const state = wildState();
    const wild = wildId(state);
    createUnit(state, 0, 'worker', 9, 8);
    const near = createUnit(state, wild, 'warrior', 10, 8);
    const far = createUnit(state, wild, 'warrior', 11, 8);
    recomputeAllVisibility(state);

    const roles = rolesOf(state);
    expect(roles.get(near.id)!.kind).toBe('thief');
    expect(roles.get(far.id)).toEqual({ kind: 'raider' });
  });

  it('outranks theft with escort duty, and the cargo knows its camp', () => {
    const state = wildState();
    const wild = wildId(state);
    state.camps.push({ col: 8, row: 8, foundedTurn: 1 });
    const cargo = createUnit(state, wild, 'worker', 12, 8);
    const captor = createUnit(state, wild, 'warrior', 12, 9);
    // A fresh worker to steal, right beside the escort. It is ignored.
    createUnit(state, 0, 'worker', 13, 9);
    recomputeAllVisibility(state);

    const roles = rolesOf(state);
    expect(roles.get(captor.id)).toEqual({ kind: 'escort', cargoId: cargo.id });
    expect(roles.get(cargo.id)).toEqual({ kind: 'cargo', home: { col: 8, row: 8 } });
  });

  it('releases the escort once the cargo is sitting on the camp', () => {
    const state = wildState();
    const wild = wildId(state);
    state.camps.push({ col: 8, row: 8, foundedTurn: 1 });
    createUnit(state, wild, 'worker', 8, 8);
    const captor = createUnit(state, wild, 'warrior', 8, 9);

    expect(rolesOf(state).get(captor.id)).toEqual({ kind: 'raider' });
  });

  it('walks a cargo nowhere at all in a world with no camps left', () => {
    const state = wildState();
    const wild = wildId(state);
    const cargo = createUnit(state, wild, 'worker', 8, 8);
    expect(rolesOf(state).get(cargo.id)).toEqual({ kind: 'cargo', home: null });

    state.turn = QUIET_TURN;
    barbarianTurn(state);
    expect({ col: cargo.col, row: cargo.row }).toEqual({ col: 8, row: 8 });
  });
});

describe('stealing', () => {
  it('takes an unguarded worker by the rule a player captures with', () => {
    const state = wildState();
    const wild = wildId(state);
    const prey = createUnit(state, 0, 'worker', 9, 8);
    createUnit(state, wild, 'warrior', 10, 8);
    recomputeAllVisibility(state);

    state.turn = QUIET_TURN;
    barbarianTurn(state);

    const taken = state.units.find((unit) => unit.id === prey.id)!;
    // Melee onto a lone civilian is a change of hands, whoever swings: the
    // worker is the wild's, unhurt, standing where it stood, and spent.
    expect(taken.ownerId).toBe(wild);
    expect(taken.hp).toBe(unitDef('worker').maxHp);
    expect({ col: taken.col, row: taken.row }).toEqual({ col: 9, row: 8 });
    expect(taken.movesLeft).toBe(0);
    // And the thief is *standing on it* (user, 2026-08-28): theft is still not a
    // mechanism of its own, so it inherited the advance the moment a capture
    // became one. The escort role reads geometry, and this is the strongest
    // station geometry allows.
    const thief = state.units.find(
      (unit) => unit.ownerId === wild && unitDef(unit.type).category === 'military',
    )!;
    expect({ col: thief.col, row: thief.row }).toEqual({ col: 9, row: 8 });
    // And it keeps what it is: a captured worker is still a worker with its
    // charges (M7), not a fresh one.
    expect(taken.chargesLeft).toBe(unitDef('worker').charges);
  });

  it('gets a fight instead when a soldier is standing over the worker', () => {
    const state = wildState();
    const wild = wildId(state);
    const prey = createUnit(state, 0, 'worker', 9, 8);
    const guard = createUnit(state, 0, 'warrior', 9, 8);
    createUnit(state, wild, 'warrior', 10, 8);
    recomputeAllVisibility(state);

    state.turn = QUIET_TURN;
    barbarianTurn(state);

    // The blow landed on the guard — `attackTargetAt` hits the military unit
    // first — so the worker is untouched and still its owner's.
    expect(state.units.find((unit) => unit.id === prey.id)!.ownerId).toBe(0);
    const stillGuarding = state.units.find((unit) => unit.id === guard.id);
    expect(stillGuarding === undefined || stillGuarding.hp < unitDef('warrior').maxHp).toBe(true);
  });
});

describe('escorting', () => {
  it('walks the cargo home while the raider keeps station beside it', () => {
    const state = wildState();
    const wild = wildId(state);
    state.camps.push({ col: 8, row: 8, foundedTurn: 1 });
    const cargo = createUnit(state, wild, 'worker', 13, 8);
    const escort = createUnit(state, wild, 'warrior', 14, 8);
    state.turn = QUIET_TURN;

    let closest = distance(state, cargo, { col: 8, row: 8 });
    for (let step = 0; step < 6; step++) {
      refill(state);
      barbarianTurn(state);
      const now = distance(state, cargo, { col: 8, row: 8 });
      expect(now).toBeLessThanOrEqual(closest);
      closest = now;
      // The guard shadows every step of the walk, never more than a hex behind
      // — until the walk is over, at which point it is released and drifts (the
      // release is pinned in `role derivation` above).
      if (now > 0) expect(distance(state, escort, cargo)).toBeLessThanOrEqual(1);
    }
    expect({ col: cargo.col, row: cargo.row }).toEqual({ col: 8, row: 8 });
  });

  it('ignores a fresh target while it is walking a prisoner home', () => {
    const state = wildState();
    const wild = wildId(state);
    state.camps.push({ col: 8, row: 8, foundedTurn: 1 });
    const cargo = createUnit(state, wild, 'worker', 12, 8);
    createUnit(state, wild, 'warrior', 12, 9);
    // A scout walks right past the escort. Escort duty outranks the fight.
    const scout = createUnit(state, 0, 'scout', 13, 9);
    recomputeAllVisibility(state);

    state.turn = QUIET_TURN;
    barbarianTurn(state);

    const untouched = state.units.find((unit) => unit.id === scout.id)!;
    expect(untouched.hp).toBe(unitDef('scout').maxHp);
    expect(distance(state, cargo, { col: 8, row: 8 })).toBeLessThan(4);
  });

  it('sits on the camp once it arrives, and never founds anything', () => {
    const state = wildState();
    const wild = wildId(state);
    state.camps.push({ col: 8, row: 8, foundedTurn: 1 });
    const cargo = createUnit(state, wild, 'settler', 8, 8);
    state.turn = QUIET_TURN;

    for (let step = 0; step < 5; step++) {
      refill(state);
      barbarianTurn(state);
    }

    expect({ col: cargo.col, row: cargo.row }).toEqual({ col: 8, row: 8 });
    // A stolen settler is cargo: the wild founds nothing, ever.
    expect(state.cities).toHaveLength(0);
    expect(hasCampAt(state, 8, 8)).toBe(true);
  });

  it('does not count as the camp’s garrison', () => {
    const state = wildState();
    const wild = wildId(state);
    state.camps.push({ col: 8, row: 8, foundedTurn: 1 });
    // A full band of prisoners parked on the camp must not suppress its musters:
    // cargo is loot, not soldiers.
    createUnit(state, wild, 'worker', 8, 8);
    createUnit(state, wild, 'settler', 8, 7);
    state.turn = 1 + BARB.unitEveryTurns;

    musterCamps(state);
    const soldiers = state.units.filter(
      (unit) => unit.ownerId === wild && unitDef(unit.type).category === 'military',
    );
    expect(soldiers).toHaveLength(1);
  });

  it('leaves no standing orders behind for `resetMovement` to walk', () => {
    const state = wildState();
    const wild = wildId(state);
    state.camps.push({ col: 8, row: 8, foundedTurn: 1 });
    createUnit(state, wild, 'worker', 13, 8);
    createUnit(state, wild, 'warrior', 14, 8);
    state.turn = QUIET_TURN;
    barbarianTurn(state);

    for (const unit of state.units) {
      if (unit.ownerId !== wild) continue;
      expect(Object.prototype.hasOwnProperty.call(unit, 'path')).toBe(false);
    }
  });
});

describe('rescue', () => {
  it('takes the prisoner back by the same capture rule', () => {
    const state = wildState();
    const wild = wildId(state);
    state.camps.push({ col: 9, row: 5, foundedTurn: 1 });
    const cargo = createUnit(state, wild, 'worker', 9, 5);
    const rescuer = createUnit(state, 0, 'warrior', 8, 5);
    recomputeAllVisibility(state);

    const result = applyCommand(state, {
      type: 'attack',
      playerId: 0,
      unitId: rescuer.id,
      target: { col: 9, row: 5 },
    });
    expect(result.ok).toBe(true);
    expect(state.units.find((unit) => unit.id === cargo.id)!.ownerId).toBe(0);
    // The rescue *is* an advance (user, 2026-08-28), so the rescuer is standing
    // on the camp and the camp is gone with it. Two acts that used to be
    // separable are one arrival, which is the point of the ruling.
    expect({ col: rescuer.col, row: rescuer.row }).toEqual({ col: 9, row: 5 });
    expect(hasCampAt(state, 9, 5)).toBe(false);
  });

  it('frees the laborers on a camp that is stormed, and says so', () => {
    const state = wildState();
    const wild = wildId(state);
    foundCityAt(state, 0, at(state, 5, 5));
    state.camps.push({ col: 9, row: 5, foundedTurn: 1 });
    const cargo = createUnit(state, wild, 'worker', 9, 5);
    const guard = createUnit(state, wild, 'warrior', 9, 5);
    guard.hp = 1;
    const rescuer = createUnit(state, 0, 'swordsman', 8, 5);
    recomputeAllVisibility(state);
    const goldBefore = playerById(state, 0)!.gold;

    const result = applyCommand(state, {
      type: 'attack',
      playerId: 0,
      unitId: rescuer.id,
      target: { col: 9, row: 5 },
    });
    expect(result.ok).toBe(true);
    // The guard died, so the ground was takeable even with a civilian on it —
    // and taking the ground took the prisoner with it.
    expect(state.units.find((unit) => unit.id === guard.id)).toBeUndefined();
    expect({ col: rescuer.col, row: rescuer.row }).toEqual({ col: 9, row: 5 });
    expect(hasCampAt(state, 9, 5)).toBe(false);
    expect(playerById(state, 0)!.gold).toBe(goldBefore + BARB.campClearGold);

    const arrival = result.ok ? result.arrivals?.[0] : undefined;
    expect(arrival?.camp?.gold).toBe(BARB.campClearGold);
    expect(arrival?.captured).toEqual([
      { id: cargo.id, type: 'worker', fromOwnerId: wild, fromWild: true },
    ]);
    expect(state.units.find((unit) => unit.id === cargo.id)!.ownerId).toBe(0);
  });
});

describe('determinism', () => {
  it('resolves a theft, an escort and a rescue the same way twice', () => {
    const build = (): GameState => {
      const state = wildState();
      const wild = wildId(state);
      state.camps.push({ col: 6, row: 8, foundedTurn: 1 });
      createUnit(state, wild, 'warrior', 10, 8);
      createUnit(state, wild, 'warrior', 10, 9);
      createUnit(state, 0, 'worker', 9, 8);
      createUnit(state, 0, 'worker', 11, 9);
      createUnit(state, 0, 'warrior', 12, 8);
      recomputeAllVisibility(state);
      state.turn = QUIET_TURN;
      return state;
    };

    const a = build();
    const b = build();
    for (let step = 0; step < 8; step++) {
      refill(a);
      refill(b);
      barbarianTurn(a);
      barbarianTurn(b);
    }
    // A theft happened at all — otherwise this asserts that two empty sweeps
    // agree, which is not the claim.
    expect(a.units.some((unit) => unit.ownerId === wildId(a) && unitDef(unit.type).category === 'civilian')).toBe(true);
    expect(snapshotState(b)).toBe(snapshotState(a));
  });
});

describe('replay', () => {
  it('reproduces a theft, an escort and a rescue byte for byte', () => {
    const game = createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    const wild = wildId(game.state);
    const play = (turns: number): void => {
      for (let turn = 0; turn < turns; turn++) {
        if (playerById(game.state, 0)?.pendingDiscovery) {
          dispatch(game, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 });
        }
        dispatch(game, { type: 'endTurn', playerId: 0 });
      }
    };
    /** A hex beside `cell` this category could stand on, on real generated ground. */
    const beside = (cell: { col: number; row: number }, category: 'military' | 'civilian') => {
      for (const tile of mapRange(game.state.map, tileHex(at(game.state, cell.col, cell.row)), 1)) {
        if (tile.col === cell.col && tile.row === cell.row) continue;
        if (!isPassable(tile)) continue;
        if (!hasStackingRoom(game.state, tile.col, tile.row, category)) continue;
        return { col: tile.col, row: tile.row };
      }
      throw new Error('nowhere to stand');
    };

    // Far enough in that camps exist, then a worker and a raider set beside each
    // other on real ground: the theft happens inside the resolution, in the log.
    play(12);
    const home = game.state.units.find((unit) => unit.ownerId === 0)!;
    const worker = beside({ col: home.col, row: home.row }, 'civilian');
    dispatch(game, { type: 'spawnUnit', playerId: 0, ownerId: 0, unitType: 'worker', at: worker });
    dispatch(game, {
      type: 'spawnUnit',
      playerId: 0,
      ownerId: wild,
      unitType: 'warrior',
      at: beside(worker, 'military'),
    });
    play(1);

    const cargo = game.state.units.find(
      (unit) => unit.ownerId === wild && unitDef(unit.type).category === 'civilian',
    );
    expect(cargo).toBeDefined();

    // Two more turns of the walk home, then a rescuer set down beside whatever
    // hex the cargo has reached, and the recapture — all three in the log.
    play(2);
    const rescuer = beside({ col: cargo!.col, row: cargo!.row }, 'military');
    dispatch(game, {
      type: 'spawnUnit',
      playerId: 0,
      ownerId: 0,
      unitType: 'swordsman',
      at: rescuer,
    });
    const blade = game.state.units.find(
      (unit) => unit.ownerId === 0 && unit.col === rescuer.col && unit.row === rescuer.row,
    )!;
    dispatch(game, {
      type: 'attack',
      playerId: 0,
      unitId: blade.id,
      target: { col: cargo!.col, row: cargo!.row },
    });
    play(2);

    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
  });

  it('carries the wild in the config, so a quiet world stays quiet', () => {
    const loud = createGame({
      seed: 777,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    const quiet = createGame({
      seed: 777,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    for (let turn = 0; turn < 30; turn++) {
      for (const game of [loud, quiet]) {
        const pending = playerById(game.state, 0)?.pendingDiscovery;
        if (pending) dispatch(game, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 });
        dispatch(game, { type: 'endTurn', playerId: 0 });
      }
    }
    expect(quiet.state.camps).toEqual([]);
    expect(loud.state.camps.length).toBeGreaterThan(0);
    // And the flag round-trips: a config that never asked has no key at all.
    expect(Object.prototype.hasOwnProperty.call(quiet.config, 'barbarians')).toBe(false);
    expect(loud.config.barbarians).toBe(true);
  });
});

/**
 * **The resolution reports its blows** (user, 2026-08-26: "should be a
 * notification when units are attacked/die").
 *
 * The wild raids inside the end-of-turn pipeline, so by the time `endTurn`
 * returns the raider has already been paid and the board says nothing about who
 * hit whom — a diff of two boards cannot name an attacker at all. So the
 * pipeline reports, on `CommandResult.combats`, which is `arrivals`' sibling and
 * joined it for the identical argument (see `TurnReport`).
 *
 * What is asserted here is the *channel* and the facts a per-seat notice needs,
 * never the wording: the sentence belongs to `reportRaids` in `controls.ts`, and
 * a test that pinned it here would fail on a copy edit.
 */
describe('the turn report', () => {
  it('carries every blow the wild landed, with both owners and the hex', () => {
    const state = wildState();
    const wild = wildId(state);
    const mine = createUnit(state, 0, 'warrior', 9, 8);
    createUnit(state, wild, 'warrior', 10, 8);
    recomputeAllVisibility(state);

    state.turn = QUIET_TURN;
    const report = runEndOfTurn(state);
    const struck = report.combats.filter((combat) => combat.defenderUnitId === mine.id);
    expect(struck).toHaveLength(1);
    const blow = struck[0]!;
    expect(blow.attackerOwnerId).toBe(wild);
    expect(blow.defenderOwnerId).toBe(0);
    expect(blow.at).toEqual({ col: 9, row: 8 });
    expect(blow.damageToDefender).toBeGreaterThan(0);
  });

  it('reports a stolen worker as a capture, owned by the empire that lost it', () => {
    const state = wildState();
    const wild = wildId(state);
    const prey = createUnit(state, 0, 'worker', 9, 8);
    createUnit(state, wild, 'warrior', 10, 8);
    recomputeAllVisibility(state);

    state.turn = QUIET_TURN;
    const report = runEndOfTurn(state);
    const taken = report.combats.find((combat) => combat.capturedUnitId === prey.id);
    expect(taken).toBeDefined();
    // Read *before* the change of hands: the news belongs to the empire that
    // lost the worker, not to the one now holding it.
    expect(taken!.defenderOwnerId).toBe(0);
    expect(taken!.attackerOwnerId).toBe(wild);
    expect(state.units.find((unit) => unit.id === prey.id)!.ownerId).toBe(wild);
  });

  it('says nothing at all on a quiet resolution, and stays out of the save', () => {
    const state = wildState();
    state.turn = QUIET_TURN;
    expect(runEndOfTurn(state).combats).toEqual([]);

    // The channel is a *transition* report and never state: a game with a raid
    // in it still replays byte-identically from `{config, log}`.
    const game = createGame({
      seed: 7,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
      barbarians: true,
    });
    for (let turn = 0; turn < 24; turn++) {
      dispatch(game, { type: 'endTurn', playerId: 0 });
    }
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('says nothing about a blow the player ordered themselves', () => {
    const state = wildState();
    const wild = wildId(state);
    const mine = createUnit(state, 0, 'warrior', 9, 8);
    createUnit(state, wild, 'warrior', 10, 8);
    recomputeAllVisibility(state);

    // `combats` is for news the actor could not otherwise have. An attacker
    // knows it attacked — the interface narrates its own blow off the forecast
    // it just showed — so an ordinary attack returns the bare `{ ok: true }` it
    // always has. That is `CommandResult`'s standing promise: a caller that has
    // never heard of either optional field is unaffected by both.
    expect(
      applyCommand(state, {
        type: 'attack',
        playerId: 0,
        unitId: mine.id,
        target: { col: 10, row: 8 },
      }),
    ).toEqual({ ok: true });
  });
});

/**
 * **The wild burns what it walks over** (2026-08-28, the user's ruling).
 *
 * Three claims, and they fail for different reasons:
 *
 *   1. **It is the player's verb.** A raider tears out a farm through `pillageAt`
 *      — the same function a swordsman's `pillage` command reaches — so the road
 *      goes with it and the *victim's* panel is refreshed on the spot. There is
 *      no second razing rule with the wild's name on it, exactly as there is no
 *      second combat evaluator.
 *   2. **Strike, then burn, then march**, in that order and only for a raider.
 *      A blow already in reach outranks a torch; a torch outranks walking on.
 *   3. **The wild keeps the bandage and forfeits the salvage**, and says why —
 *      `settleCampBounty`'s warning read from the other side.
 */
describe('the raider’s torch', () => {
  /**
   * A raider standing on somebody's farm, two hexes from the town that owns it.
   *
   * Two rather than one on purpose: adjacent, the raider would be *in reach of
   * the city* and the first beat would take it, which is the precedence this
   * fixture is trying to leave room for rather than assert.
   */
  function torchState(): { state: GameState; raider: Unit; cityId: number } {
    const state = wildState();
    const city = foundCityAt(state, 0, at(state, 5, 8));
    const farm = at(state, 7, 8);
    farm.improvement = 'farm';
    farm.road = 0;
    state.tileOwner[tileIndex(state.map, 7, 8)] = city.id;
    const raider = createUnit(state, wildId(state), 'warrior', 7, 8);
    raider.hp = 40;
    recomputeAllVisibility(state);
    refill(state);
    return { state, raider, cityId: city.id };
  }

  it('burns the works underfoot, keeps the heal and forfeits the salvage', () => {
    const { state, raider } = torchState();
    const report = emptyTurnReport();
    raid(state, [raider.id], report);

    expect(at(state, 7, 8).improvement).toBeUndefined();
    // The road went with the farm: one verb takes what has been *built* on a hex.
    expect(at(state, 7, 8).road).toBeUndefined();
    expect(raider.hp).toBe(40 + RULES.improvements.pillageHeal);
    // Nothing spends the wild's treasury, so nothing is banked into it and the
    // reason is said out loud rather than left as a silent zero.
    expect(barbarianPlayer(state)!.gold).toBe(0);
    expect(report.pillages).toHaveLength(1);
    expect(report.pillages[0]).toMatchObject({
      ownerId: wildId(state),
      fromOwnerId: 0,
      col: 7,
      row: 8,
      improvement: 'farm',
      road: true,
      gold: 0,
      heal: RULES.improvements.pillageHeal,
      warning: 'the wild has no treasury to carry the salvage to',
    });
  });

  it('refreshes the victim, so the panel never quotes a farm that is ash', () => {
    // Register entry 5, reached from the wild's side: `pillageAt` asks the ground
    // who to tell, so the raid needs no rule of its own to owe the refresh.
    const { state, raider, cityId } = torchState();
    const victim = state.cities.find((city) => city.id === cityId)!;
    victim.population = 1;
    victim.workedTiles = [{ col: 7, row: 8 }];

    raid(state, [raider.id], emptyTurnReport());

    const seated = JSON.stringify(victim.workedTiles);
    assignCitizens(state, victim);
    expect(JSON.stringify(victim.workedTiles)).toBe(seated);
  });

  it('strikes what is already in reach instead, and the farm survives it', () => {
    // Beat one. A blow is worth more than a torch, and a raider that stopped to
    // burn a field while a warrior stood beside it would be reading the board
    // wrong. The farm is still there afterwards; that is the whole assertion.
    const { state, raider } = torchState();
    createUnit(state, 0, 'warrior', 8, 8);
    recomputeAllVisibility(state);
    refill(state);

    const report = emptyTurnReport();
    raid(state, [raider.id], report);

    expect(report.pillages).toEqual([]);
    expect(at(state, 7, 8).improvement).toBe('farm');
    expect(report.combats.length).toBe(1);
  });

  it('marches on with nothing underfoot to burn', () => {
    // Beat three, and the proof that beat two is a *branch* rather than a stop:
    // bare ground under the same raider, and it walks at the town as v1 did.
    const { state, raider } = torchState();
    delete at(state, 7, 8).improvement;
    delete at(state, 7, 8).road;

    const report = emptyTurnReport();
    raid(state, [raider.id], report);

    expect(report.pillages).toEqual([]);
    expect(raider.col === 7 && raider.row === 8).toBe(false);
  });

  it('leaves nobody’s ground alone, however improved it is', () => {
    // `pillageError` reads "somebody else's" as *not yours*, which is right for an
    // empire; the wild is held to the stricter reading — a real empire's ground —
    // because a raider is a thing that comes *for* somebody.
    const state = wildState();
    at(state, 7, 8).improvement = 'farm';
    const raider = createUnit(state, wildId(state), 'warrior', 7, 8);
    recomputeAllVisibility(state);
    refill(state);

    const report = emptyTurnReport();
    raid(state, [raider.id], report);
    expect(report.pillages).toEqual([]);
    expect(at(state, 7, 8).improvement).toBe('farm');
  });

  it('is a raider’s job alone: an escort walks its cargo past the farm', () => {
    // The priority `barbarianRoles` publishes, read one beat further out. An
    // escort does nothing but escort — including nothing about a field it is
    // standing on.
    const state = wildState();
    const wild = wildId(state);
    const city = foundCityAt(state, 0, at(state, 5, 8));
    state.camps.push({ col: 12, row: 8, foundedTurn: 1 });
    const farm = at(state, 7, 8);
    farm.improvement = 'farm';
    state.tileOwner[tileIndex(state.map, 7, 8)] = city.id;
    const cargo = createUnit(state, wild, 'worker', 8, 8);
    const escort = createUnit(state, wild, 'warrior', 7, 8);
    recomputeAllVisibility(state);
    refill(state);

    expect(rolesOf(state).get(escort.id)).toEqual({ kind: 'escort', cargoId: cargo.id });
    const report = emptyTurnReport();
    raid(state, [escort.id, cargo.id], report);
    expect(report.pillages).toEqual([]);
    expect(at(state, 7, 8).improvement).toBe('farm');
  });

  it('carries the news out of `endTurn`, for the seat that lost the farm', () => {
    // The wild's half of the verb is news to a player who issued no command, so
    // it rides the resolution's report and out through `CommandResult.pillages`
    // — `routesEnded`' shape, one system over.
    const { state, raider } = torchState();
    state.turn = QUIET_TURN;
    void raider;
    // Both real seats: the resolution runs when everybody has ended, and the
    // wild is not a seat that ends anything (`realPlayers`).
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    const result = applyCommand(state, { type: 'endTurn', playerId: 1 });
    expect(result.ok).toBe(true);
    expect(result.ok && result.pillages?.[0]).toMatchObject({
      fromOwnerId: 0,
      improvement: 'farm',
      gold: 0,
    });
  });
});

/**
 * The camp faucet, as a *fraction* rather than as a cadence (2026-08-28).
 *
 * What a designer sets is `campsPerSpawn / campEveryTurns` camps per turn, and
 * the ruling that asked for half again as many camps moved both integers — the
 * cadence alone cannot express it, since ⌈2 × ⅔⌉ is still 2. Asserted as the
 * fraction and the ceiling rather than as either number, so a future retune that
 * keeps the pressure is free to write it either way.
 */
describe('the camp faucet', () => {
  it('founds three quarters of a camp a turn, up to a ceiling above it', () => {
    expect(BARB.campsPerSpawn / BARB.campEveryTurns).toBeCloseTo(0.75);
    expect(BARB.maxCamps).toBeGreaterThanOrEqual(24);
  });

  it('founds a sweep’s worth at once, every one of them legal', () => {
    const state = wildState();
    state.turn = BARB.firstCampTurn;
    foundCamps(state);
    expect(state.camps.length).toBe(BARB.campsPerSpawn);
    // Rebuilt between camps within one sweep, so a pair cannot land inside its
    // own spacing rule.
    for (const a of state.camps) {
      for (const b of state.camps) {
        if (a === b) continue;
        expect(distance(state, a, b)).toBeGreaterThanOrEqual(BARB.minCampDistanceApart);
      }
    }
  });
});

/**
 * The wild at the gate (2026-08-28 ruling, inherited rather than implemented).
 *
 * A raider strikes through `applyCombat` exactly as a player's warrior does, so
 * the three-beat siege — the walls, then the garrison, then the taking — arrives
 * in the wild's hands with no rule of its own. That is the claim under test, and
 * it is the same claim theft makes one scale down: "barbarians steal workers" is
 * `attackTargetAt`'s priority, and "barbarians besiege towns" is now its other
 * half — except the last beat, which the wild reaches like anybody else and
 * cannot finish: `capturesCity` refuses whenever the attacker `isBarbarian`
 * (2026-08-28, the docblock made true), so a raider's blow at the `capture` beat
 * still lands — the town is already on the floor, so it costs nothing and heals
 * nothing — and the town stays exactly whose it was.
 */
describe('the wild at the gate', () => {
  /** A town of player 0 with a raider standing at its gate. */
  function gateState(): { state: GameState; raider: Unit; city: ReturnType<typeof foundCityAt> } {
    const state = wildState();
    const city = foundCityAt(state, 0, at(state, 5, 8));
    const raider = createUnit(state, wildId(state), 'warrior', 6, 8);
    recomputeAllVisibility(state);
    refill(state);
    return { state, raider, city };
  }

  it('beats the walls first, whoever is sheltering behind them', () => {
    const { state, raider, city } = gateState();
    const garrison = createUnit(state, 0, 'spearman', 5, 8);
    recomputeAllVisibility(state);
    const whole = garrison.hp;

    expect(cityAttackPhase(state, 5, 8, wildId(state))).toBe('walls');
    const view = previewCombat(state, raider.id, { col: 5, row: 8 });
    expect(view.ok && view.cityPhase).toBe('walls');

    const struck = applyCombat(state, raider.id, { col: 5, row: 8 });
    expect(struck.ok).toBe(true);
    expect(city.hp).toBeLessThan(cityMaxHp(city));
    // Untouched: the wall was in the way, exactly as it is for an empire.
    expect(garrison.hp).toBe(whole);
  });

  it('turns on the garrison once the walls are down', () => {
    const { state, raider, city } = gateState();
    const garrison = createUnit(state, 0, 'spearman', 5, 8);
    recomputeAllVisibility(state);
    city.hp = 1;

    expect(cityAttackPhase(state, 5, 8, wildId(state))).toBe('garrison');
    const struck = applyCombat(state, raider.id, { col: 5, row: 8 });
    expect(struck.ok).toBe(true);
    expect(garrison.hp).toBeLessThan(unitDef('spearman').maxHp);
    // And the town is where it was: on the floor, and its owner's.
    expect(city.hp).toBe(1);
    expect(city.ownerId).toBe(0);
  });

  it('inherits the order through its own sweep, with no rule of its own', () => {
    // Not `applyCombat` this time but `raid`, the wild's whole turn: the raider
    // is adjacent, the beat is a blow, and the blow lands where the published
    // priority puts it.
    const { state, raider, city } = gateState();
    const garrison = createUnit(state, 0, 'spearman', 5, 8);
    recomputeAllVisibility(state);
    refill(state);
    const whole = garrison.hp;

    const report = emptyTurnReport();
    raid(state, [raider.id], report);

    expect(report.combats).toHaveLength(1);
    expect(report.combats[0]!.defenderCityId).toBe(city.id);
    expect(report.combats[0]!.cityPhase).toBe('walls');
    expect(garrison.hp).toBe(whole);
  });

  it('cannot take an empty town it has beaten down — the wild never captures', () => {
    // The pin from the module docblock, made true: a barbarian at a beaten,
    // undefended town leaves it exactly as it stands. `cityPhase` still says
    // `'capture'` — that is a fact about the board, not the attacker — but
    // `capturesCity` is what actually gates the taking, and it reads the
    // attacker's seat.
    const { state, raider, city } = gateState();
    city.hp = 1;

    expect(cityAttackPhase(state, 5, 8, wildId(state))).toBe('capture');
    const view = previewCombat(state, raider.id, { col: 5, row: 8 });
    expect(view.ok && view.cityPhase).toBe('capture');
    expect(view.ok && view.capturesCity).toBe(false);

    const struck = applyCombat(state, raider.id, { col: 5, row: 8 });
    expect(struck.ok).toBe(true);
    if (!struck.ok) return;
    expect(struck.outcome.capturedCityId).toBeNull();
    expect(city.ownerId).toBe(0);

    // And it did nothing to the town either way: the walls were already down
    // and the floor refuses every blow of every kind.
    expect(struck.outcome.damageToAttacker).toBe(0);
    expect(struck.outcome.damageToDefender).toBe(0);
    expect(city.hp).toBe(1);
  });

  it("a nation's warrior takes the same beaten town the wild could not", () => {
    // The other half of the pin: the same board, the same beat, a real empire's
    // soldier instead of a raider — and this one walks in.
    const { state, city } = gateState();
    city.hp = 1;
    // Player 1, a real seat — the wild is seated last (id 2 in this two-nation
    // world), so this is a nation's warrior and not the camp's own raider.
    const soldier = createUnit(state, 1, 'warrior', 6, 8);
    recomputeAllVisibility(state);

    expect(cityAttackPhase(state, 5, 8, soldier.ownerId)).toBe('capture');
    const view = previewCombat(state, soldier.id, { col: 5, row: 8 });
    expect(view.ok && view.capturesCity).toBe(true);

    const struck = applyCombat(state, soldier.id, { col: 5, row: 8 });
    expect(struck.ok).toBe(true);
    if (!struck.ok) return;
    expect(struck.outcome.capturedCityId).toBe(city.id);
    expect(city.ownerId).toBe(1);
  });

  it('cannot take one that is still held, however beaten', () => {
    const { state, raider, city } = gateState();
    const garrison = createUnit(state, 0, 'spearman', 5, 8);
    recomputeAllVisibility(state);
    city.hp = 1;

    const view = previewCombat(state, raider.id, { col: 5, row: 8 });
    expect(view.ok && view.capturesCity).toBe(false);
    expect(applyCombat(state, raider.id, { col: 5, row: 8 }).ok).toBe(true);
    expect(city.ownerId).toBe(0);
    void garrison;
  });
});
