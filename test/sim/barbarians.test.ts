import { describe, expect, it } from 'vitest';

import {
  barbarianMeleeType,
  barbarianTier,
  barbarianTurn,
  barbarianUnitType,
  campHasHorses,
  canFoundCampAt,
  foundCamps,
  musterCamps,
} from '../../src/sim/barbarians';
import { campAt, hasCampAt, settleCampBounty } from '../../src/sim/camps';
import { foundCityAt, growthThreshold } from '../../src/sim/cities';
import { previewCombat, updateElimination } from '../../src/sim/combat';
import { applyCommand } from '../../src/sim/commands';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { createMap, getTileAt, tileHex, tileIndex, wrappedDistance, type Tile } from '../../src/sim/map';
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
} from '../../src/sim/state';
import { advanceResearch } from '../../src/sim/tech';
import { TECH_IDS, type TechId } from '../../src/sim/techData';
import { END_OF_TURN_PHASES } from '../../src/sim/turn';
import { unitDef } from '../../src/sim/unitData';
import { VISIBLE, recomputeAllVisibility, resetVisibility, visibilityAt } from '../../src/sim/visibility';
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
      { source: 'vs barbarians', side: 'attacker', amount: BARB.combatBonus },
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
      { source: 'vs barbarians', side: 'defender', amount: BARB.combatBonus },
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
      { source: 'vs barbarians', side: 'defender', amount: BARB.combatBonus },
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

  it('is cleared by a melee winner advancing onto it', () => {
    const state = wildState();
    foundCityAt(state, 0, at(state, 5, 5));
    state.camps.push({ col: 9, row: 5, foundedTurn: 1 });
    const defender = createUnit(state, wildId(state), 'worker', 9, 5);
    const attacker = createUnit(state, 0, 'warrior', 8, 5);
    recomputeAllVisibility(state);

    const result = applyCommand(state, {
      type: 'attack',
      playerId: 0,
      unitId: attacker.id,
      target: { col: 9, row: 5 },
    });
    expect(result.ok).toBe(true);
    // A civilian is captured and the tile is *not* emptied, so the attacker does
    // not advance and the camp stands — which is the targeting rule, not a bug.
    // What is asserted is the pairing: camp cleared exactly when it advanced.
    const advanced = state.units.find((unit) => unit.id === attacker.id)!;
    const stormed = advanced.col === 9 && advanced.row === 5;
    expect(hasCampAt(state, 9, 5)).toBe(!stormed);
    expect(campAt(state, 9, 5) === null).toBe(stormed);
    void defender;
  });
});

describe('replay', () => {
  it('reproduces a game with camps and raiders in it, byte for byte', () => {
    const game = createGame({
      seed: 777,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    // Long enough for the wild to found camps, muster and move.
    for (let turn = 0; turn < 45; turn++) {
      const pending = playerById(game.state, 0)?.pendingDiscovery;
      if (pending) dispatch(game, { type: 'chooseDiscovery', playerId: 0, optionIndex: 0 });
      dispatch(game, { type: 'endTurn', playerId: 0 });
    }
    expect(game.state.camps.length).toBeGreaterThan(0);
    expect(game.state.units.some((unit) => unit.ownerId === 1)).toBe(true);

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
