import { describe, expect, it } from 'vitest';
import { newPlayerStatecraft } from '../../src/sim/statecraft';
import { newPlayerPantheon } from '../../src/sim/religionData';
import { type Command, applyCommand } from '../../src/sim/commands';
import { unitProductionCost } from '../../src/sim/cities';
import { unitDef } from '../../src/sim/unitData';
import { RULES } from '../../src/sim/rulesData';
import {
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  allTurnsEnded,
  allocateEntityId,
  cityById,
  clearTurnEnded,
  deriveGameplayRng,
  emptyRenownFeed,
  hasEndedTurn,
  newGame,
  normalizeConfig,
  playerById,
  unitById,
} from '../../src/sim/state';
import { researchPlan } from '../../src/sim/tech';
import { END_OF_TURN_PHASES, runEndOfTurn } from '../../src/sim/turn';
import { generateMap } from '../../src/sim/mapgen';
import { nextUint32 } from '../../src/sim/rng';

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 4242,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#e8503a', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
      { name: 'Cleo', color: '#4caf50' },
    ],
    ...overrides,
  };
}

/** A structural copy, for "the state did not change" assertions. */
function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/** `endTurn` for one seat. Every command names the player who issued it. */
function endTurn(playerId: number): Command {
  return { type: 'endTurn', playerId };
}

describe('newGame', () => {
  it('starts on turn 1 with every seat open and the opening rosters', () => {
    const state = newGame(config());
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.turn).toBe(RULES.game.startingTurn);
    expect(state.turn).toBe(1);
    // One flag per player, all clear: nobody has ended the first turn.
    expect(state.turnEnded).toEqual([false, false, false]);
    expect(allTurnsEnded(state)).toBe(false);
    // Milestone 2 step 2: `newGame` now seats each player's starting units, so
    // the entity counter has already handed out their ids.
    const perPlayer = RULES.startingUnits.length;
    expect(state.units).toHaveLength(state.players.length * perPlayer);
    expect(state.nextEntityId).toBe(RULES.game.firstEntityId + state.units.length);
    expect(state.cities).toEqual([]);
  });

  it('turns player specs into players with index ids and explicit humanity', () => {
    const state = newGame(config());
    // Milestone 3 adds the three empty yield pools every player starts with;
    // Milestone 4 adds the research fields — nothing chosen, and the opening
    // kit of technologies from `rules.research.startingTechs`. Milestone 5 adds
    // `eliminated`, which nobody is on turn one, and escalating settlers add
    // `unitsBuilt` (schema 31: one ladder per escalating type, generalised from
    // the old settler-only `settlersBuilt`) — empty though every player is
    // holding a settler, because the one they start with was never paid for.
    // Territory & gold adds `tilesPurchased`, the same shape of lifetime
    // counter for bought ground.
    const pools = {
      gold: 0,
      sciencePool: 0,
      culturePool: 0,
      faithPool: 0,
      researching: null,
      // No `researchQueue` key: presence is the state, exactly as it is for
      // `Unit.path`, so an empire that never queued anything serialises as one
      // from before the field existed. See the suite at the bottom of this file.
      techsResearched: RULES.research.startingTechs,
      // Presence is the state, `unitsBuilt`'s own docblock reason: nobody has
      // built or bought a settler or a worker yet, so the empty object is the
      // opening kit.
      unitsBuilt: {},
      tilesPurchased: 0,
      // The Themes Build's tally (The Last Hunt, sheet 02): `tilesPurchased`'
      // twin one verb over, because a burnt-out camp leaves nothing on the
      // board to count.
      campsCleared: 0,
      eliminated: false,
      // Every seat carries the flag and every *real* seat carries it false; the
      // wild is appended separately and only when the config asks for it (see
      // the barbarian suite).
      barbarian: false,
      // Always present, like `techsResearched`: every seat has a government and
      // a slot spread from turn one. See `Player.statecraft`.
      statecraft: newPlayerStatecraft(),
      // The same claim one system over (ledger Entry XXVIII): every seat has a
      // pantheon from turn one, empty though it is, and a lifetime counter for
      // the augurs it has bought — `unitsBuilt`'s twin in a different bank.
      pantheon: newPlayerPantheon(),
      augursPurchased: 0,
      prophetsPurchased: 0,
      // The fifth Entry XVIII bucket and its history (`docs/great-people.md`):
      // an empty pool, a feed record with all five families at nothing, no
      // legacies, no Triumphs and nobody recruited. All present from turn one
      // for `statecraft`'s reason — they are facts about a player rather than
      // states some of them are in — and the transient `greatPersonOffer` is
      // absent, exactly as `pendingDiscovery` is.
      renownPool: 0,
      renownByFamily: emptyRenownFeed(),
      legacies: [],
      triumphs: [],
      greatPeopleRecruited: 0,
      // The Bead Race's eight, present from turn one for the same reason: an
      // empty Abacus, no dice, and six counters at nothing. `dice` is uncapped
      // (user ruling, 2026-08-30) and nothing spends it yet.
      beads: [],
      // Two at the start of every real seat's game (user, 2026-08-30).
      dice: 2,
      citiesFounded: 0,
      citiesCaptured: 0,
      faithOnHolyOrders: 0,
      tithesGold: 0,
      scholarshipScience: 0,
      routeYieldsThisAge: 0,
      greatPeopleThisAge: 0,
    };
    expect(state.players).toEqual([
      { id: 0, name: 'Ada', color: '#e8503a', isHuman: true, ...pools },
      { id: 1, name: 'Bors', color: '#3a7fe8', isHuman: false, ...pools },
      { id: 2, name: 'Cleo', color: '#4caf50', isHuman: false, ...pools },
    ]);
  });

  it('generates the map from the seed and size', () => {
    const state = newGame(config({ seed: 99, sizeName: 'duel' }));
    expect(state.map).toEqual(generateMap(99, 'duel'));
    expect(state.map.seed).toBe(99);
    expect(state.map.sizeName).toBe('duel');
  });

  it('is deterministic: the same config produces an identical state', () => {
    expect(newGame(config())).toEqual(newGame(config()));
    // Also identical byte-for-byte, key order included.
    expect(JSON.stringify(newGame(config()))).toBe(JSON.stringify(newGame(config())));
  });

  it('does not depend on how many other games were created first', () => {
    const first = newGame(config());
    newGame(config({ seed: 7 }));
    newGame(config({ seed: -13, sizeName: 'standard' }));
    expect(newGame(config())).toEqual(first);
  });

  it('gives different seeds different maps and different generator states', () => {
    const a = newGame(config({ seed: 1 }));
    const b = newGame(config({ seed: 2 }));
    expect(a.rng.state).not.toBe(b.rng.state);
    expect(a.map).not.toEqual(b.map);
  });

  it('derives a gameplay stream decorrelated from the map generator', () => {
    const seed = 4242;
    const state = newGame(config({ seed }));
    // The map generator starts at `seed` itself; gameplay must not.
    expect(state.rng.state).not.toBe(seed | 0);
    // **Not the derived seed itself any more**: `newGame` shuffles the two bead
    // decks off this generator before a piece is placed (schema 38), so what a
    // fresh state carries is the derived stream *already advanced*. The property
    // that matters is unchanged and is asserted below — the stream is a pure
    // function of the config, and it is not the map's.
    expect(state.rng.state).not.toBe(deriveGameplayRng(seed).state);
    expect(newGame(config({ seed })).rng).toEqual(state.rng);
    // The first gameplay roll is not the first mapgen roll either.
    const gameplay = deriveGameplayRng(seed);
    const mapgen = { state: seed | 0 };
    expect(nextUint32(gameplay)).not.toBe(nextUint32(mapgen));
  });

  it('produces a plain, JSON-serializable state', () => {
    const state = newGame(config());
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('rejects impossible configs', () => {
    expect(() => newGame(config({ players: [] }))).toThrow(/at least/);
    const crowd = new Array(RULES.game.maxPlayers + 1)
      .fill(null)
      .map((_, i) => ({ name: `P${i}`, color: '#fff' }));
    expect(() => newGame(config({ players: crowd }))).toThrow(/at most/);
    expect(() => newGame(config({ sizeName: 'gigantic' }))).toThrow(/Unknown map size/);
  });
});

describe('normalizeConfig', () => {
  it('coerces the seed to a 32-bit integer and fills in isHuman', () => {
    const normalized = normalizeConfig({
      seed: 12.75,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#fff' }],
    });
    expect(normalized.seed).toBe(12);
    expect(normalized.players[0]).toEqual({ name: 'Ada', color: '#fff', isHuman: false });
  });

  it('copies the players so later edits to the spec cannot reach the game', () => {
    const source = config();
    const state = newGame(source);
    source.players[0]!.name = 'Mallory';
    expect(state.players[0]!.name).toBe('Ada');
  });
});

describe('accessors', () => {
  it('allocates entity ids in a deterministic sequence', () => {
    const state = newGame(config());
    // The starting units have already consumed the first ids.
    const first = state.nextEntityId;
    expect(allocateEntityId(state)).toBe(first);
    expect(allocateEntityId(state)).toBe(first + 1);
    expect(state.nextEntityId).toBe(first + 2);
  });

  it('finds players, units and cities by id', () => {
    const state = newGame(config());
    expect(playerById(state, 0)!.name).toBe('Ada');
    expect(playerById(state, 2)!.name).toBe('Cleo');
    expect(playerById(state, 9)).toBeUndefined();
    expect(unitById(state, state.units[0]!.id)).toBe(state.units[0]);
    expect(unitById(state, 9999)).toBeUndefined();
    // Cities stay empty until milestone 3.
    expect(cityById(state, 1)).toBeUndefined();
  });
});

describe('turn status helpers', () => {
  it('reads and clears the per-player flags', () => {
    const state = newGame(config());
    expect(hasEndedTurn(state, 1)).toBe(false);

    applyCommand(state, endTurn(1));
    expect(hasEndedTurn(state, 1)).toBe(true);
    expect(hasEndedTurn(state, 0)).toBe(false);
    // An id that is nobody's is simply not finished; existence is a different
    // question, asked with `playerById`.
    expect(hasEndedTurn(state, 99)).toBe(false);
    expect(allTurnsEnded(state)).toBe(false);

    clearTurnEnded(state);
    expect(state.turnEnded).toEqual([false, false, false]);
  });

  it('never calls a game with no players "all ended"', () => {
    const state = newGame(config());
    state.players = [];
    state.turnEnded = [];
    expect(allTurnsEnded(state)).toBe(false);
  });

  it('iterates players, not flags, so a stray flag cannot resolve a turn', () => {
    const state = newGame(config());
    state.turnEnded = [true, true, false, true];
    expect(allTurnsEnded(state)).toBe(false);
  });
});

describe('endTurn', () => {
  it('marks one seat finished and leaves the turn alone', () => {
    const state = newGame(config());
    expect(state.turn).toBe(1);

    expect(applyCommand(state, endTurn(1))).toEqual({ ok: true });
    expect(state.turnEnded).toEqual([false, true, false]);
    expect(state.turn).toBe(1);
  });

  it('resolves the turn only when the last of three seats ends', () => {
    const state = newGame(config());

    expect(applyCommand(state, endTurn(2))).toEqual({ ok: true });
    expect(state.turn).toBe(1);
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
    expect(state.turn).toBe(1);
    expect(state.turnEnded).toEqual([true, false, true]);

    expect(applyCommand(state, endTurn(1))).toEqual({ ok: true });
    // The turn rolled over and every seat reopened.
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([false, false, false]);
  });

  it('resolves on the second seat in a two-player game', () => {
    const state = newGame(
      config({
        players: [
          { name: 'Ada', color: '#a00' },
          { name: 'Bors', color: '#00a' },
        ],
      }),
    );
    expect(applyCommand(state, endTurn(1))).toEqual({ ok: true });
    expect(state.turn).toBe(1);
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([false, false]);
  });

  it('advances every turn in a single-player game', () => {
    const state = newGame(config({ players: [{ name: 'Solo', color: '#fff' }] }));
    applyCommand(state, endTurn(0));
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([false]);
  });

  it('keeps rolling over many turns', () => {
    const state = newGame(config());
    for (let turn = 0; turn < 10; turn++) {
      for (const player of state.players) applyCommand(state, endTurn(player.id));
    }
    expect(state.turn).toBe(11);
    expect(state.turnEnded).toEqual([false, false, false]);
  });

  it('does not care in which order the seats end', () => {
    const forwards = newGame(config());
    for (const id of [0, 1, 2]) applyCommand(forwards, endTurn(id));
    const backwards = newGame(config());
    for (const id of [2, 1, 0]) applyCommand(backwards, endTurn(id));
    expect(JSON.stringify(backwards)).toBe(JSON.stringify(forwards));
  });

  it('refuses a second endTurn from the same seat, untouched', () => {
    const state = newGame(config());
    applyCommand(state, endTurn(1));
    const before = clone(state);

    const result = applyCommand(state, endTurn(1));
    expect(result).toEqual({ ok: false, error: 'Player 1 has already ended turn 1' });
    expect(state).toEqual(before);
    // And the seat that has *not* ended is still welcome.
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
  });

  it('lets a seat end the next turn after ending this one', () => {
    const state = newGame(config());
    for (const id of [0, 1, 2]) applyCommand(state, endTurn(id));
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([true, false, false]);
  });

  it('refuses a playerId that is not a player, without touching the state', () => {
    const state = newGame(config());
    const before = clone(state);
    for (const bad of [7, -1, 1.5, undefined, '0']) {
      const result = applyCommand(state, { type: 'endTurn', playerId: bad } as unknown as Command);
      expect(result.ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('refuses a corrupt flag array without touching the state', () => {
    const state = newGame(config());
    state.turnEnded = [false, false];
    const before = clone(state);
    const result = applyCommand(state, endTurn(0));
    expect(result).toEqual({
      ok: false,
      error: 'Corrupt turnEnded: 2 flag(s) for 3 player(s)',
    });
    expect(state).toEqual(before);
  });
});

describe('applyCommand contract', () => {
  it('rejects an unknown command type and leaves the state untouched', () => {
    const state = newGame(config());
    const before = clone(state);
    // `foundCity` used to stand in for "not a command yet"; it is one now.
    const result = applyCommand(state, { type: 'gildRoof', tile: 3 } as unknown as Command);
    expect(result.ok).toBe(false);
    expect(result).toEqual({ ok: false, error: 'Unknown command type "gildRoof"' });
    expect(state).toEqual(before);
  });

  it('rejects malformed commands rather than throwing', () => {
    const state = newGame(config());
    const before = clone(state);
    for (const bad of [null, undefined, 42, 'endTurn', {}, { type: 7 }, []]) {
      const result = applyCommand(state, bad as unknown as Command);
      expect(result.ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('never returns a shared result object', () => {
    const state = newGame(config());
    const a = applyCommand(state, endTurn(0));
    const b = applyCommand(state, endTurn(1));
    expect(a).not.toBe(b);
  });
});

describe('end-of-turn pipeline', () => {
  it('runs a fixed, named, ordered set of phases', () => {
    expect(END_OF_TURN_PHASES.map((phase) => phase.name)).toEqual([
      // First, and two brooms in one beat: the spent truces are swept out and
      // every war both sides have signed is closed — so the turn resolves in a
      // world whose relations are settled, and the columns a peace sends home
      // are walked out before any standing order resumes. See `settlePeace`
      // (`src/sim/diplomacy.ts`).
      'settleDiplomacy',
      // Then the other broom: an expired rite is already
      // inert (every reader compares turns), so this only stops dead paper
      // accumulating. See `pruneTimedEffects` (ledger Entry XXVIII).
      'pruneTimedEffects',
      // The tide, before anything is banked: a town whose citizens turn this
      // turn flies its new banner before `collectYields` pays anybody for it.
      // See `spreadReligion` (`docs/religion-v2.md`).
      'spreadReligion',
      'collectYields',
      'growCities',
      // A town's own renown quietly takes a citizen out of the fields and puts
      // them in a trade (ledger Entry XLVIII). After growth, so the conversion
      // is judged against the population the town ended the turn with; before
      // production, so a guildsman formed this turn is seated and paying before
      // the next basket is banked. See `runGuilds`.
      'guilds',
      'advanceProduction',
      'advanceResearch',
      // Culture buys a draft, beside the phase that spends the other pool a
      // resolution filled — and before `expandBorders`, whose channel it never
      // touches. See `runStatecraft`.
      'statecraft',
      // The cadenced drafts — Keeper of the Calendar's almanac — beside the
      // phase they are the same shape as, one currency over.
      'religion',
      // The cadenced *pieces* — The Standing Levy's spear (master-list cut,
      // 2026-08-28). Its own beat rather than a clause inside `statecraft`,
      // because a levy is not a draft: nothing is spent, nothing is chosen, and
      // nothing blocks End Turn. See `musterPeriodicUnits`.
      'muster',
      // Buildings and wonders pay their renown trickle, standing Triumphs are
      // claimed, and a filled ladder deals a great person — the same shape a
      // fifth currency over, and after `advanceProduction` so a wonder finished
      // this turn pays into the sweep that banks the library beside it. See
      // `runRenown`.
      'renown',
      // The Bead Race's own beat, directly after `renown` so the turn's standing
      // Triumphs and this turn's recruitments are already on the register before
      // a deed is swept. See `runBeads` (design ledger Entry VI).
      'beads',
      // The two revocations that are conditions of a turn rather than events —
      // Hypatia's mob, Boudica's century. A broom's twin: marking a record
      // already marked changes nothing, so the phase is safe anywhere, and it
      // sits after `renown` because that is the phase that can hand out a
      // legacy in the first place. See `reviewLegacies`.
      'reviewLegacies',
      'expandBorders',
      'healCities',
      // The wild acts after the towns and before the healing, so a raider that
      // marched or fought is not resting. See `barbarianTurn`.
      'barbarians',
      'healUnits',
      'advanceFortify',
      // The caravans keep walking: a route's leg is turned around at each end
      // and a route that has run out is dropped, immediately before the two
      // phases that actually spend the movement it just aimed. See
      // `marchTraders`.
      'marchTraders',
      // The explorers aim themselves at the next unseen hex, or stand down
      // with a report when there is none left within reach — `marchTraders`'
      // seat and argument, one verb over: the phase decides *where* a ranging
      // piece goes, and the spender below walks it. See `marchExplorers`.
      'marchExplorers',
      // A standing order that was jammed marches once more on *this* turn's
      // unspent points — after the two phases that ask "has this unit been
      // still all turn?", so a piece's healing never depends on whether a
      // neighbour got out of its way, and immediately before the refill, so the
      // points it spends are the turn's own. See `spendLeftoverMovement`.
      'spendLeftoverMovement',
      'resetMovement',
      // As late as it can be: the question "is an enemy standing next to my
      // sleeping worker" is only worth asking of a board that has stopped
      // moving, which is after the wild has raided *and* after `resetMovement`
      // has walked everybody's standing orders. See `wakeSleepers`.
      'wakeSleepers',
      // Still last and unconditional: clearing a flag moves no piece.
      'refreshVisibility',
    ]);
  });

  it('changes nothing when no unit has moved or been hurt', () => {
    const state = newGame(config());
    const before = clone(state);
    runEndOfTurn(state);
    // **Except the table**, which deals one card a turn whatever anybody does:
    // the hand fills over an age rather than all at once (design ledger Entry
    // VI), so a quiet turn still turns a card face down onto the table. Nothing
    // else moved — which is what the rest of this comparison says.
    expect(state.beads).not.toEqual(before.beads);
    state.beads = before.beads;
    expect(state).toEqual(before);
  });
});

// ---------------------------------------------------------------------------

/**
 * `Player.researchQueue`, the schema-22 field, and the two properties the rest
 * of the game leans on: an absent key reads as an empty plan, and a plan is
 * never non-empty behind an empty head.
 */
describe('the research queue field', () => {
  it('is absent until something is queued, and gone again when it empties', () => {
    const state = newGame(config());
    const player = state.players[0]!;
    expect('researchQueue' in player).toBe(false);
    expect(researchPlan(player)).toEqual([]);

    // A node whose prerequisites are met is a plan of one, and still no key —
    // a game that never queues serialises exactly as it did at schema 21.
    expect(applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: 'mining' })).toEqual({
      ok: true,
    });
    expect('researchQueue' in player).toBe(false);
    expect(researchPlan(player)).toEqual(['mining']);

    // A locked node fills it: the Bronze Panoply wants The Wheel, which wants
    // Bronzeworking *and* Stonecraft, which want Mining and Pottery — tree
    // revision 4 closes Æra I on two gates, so the plan under the Panoply is a
    // lattice flattened by depth and then by roster order.
    expect(
      applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: 'bronzePanoply' }),
    ).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual([
      'mining',
      'earthenware',
      'bronzeWorking',
      'stonecraft',
      'theWheel',
      'bronzePanoply',
    ]);
    expect(player.researchQueue).toEqual([
      'earthenware',
      'bronzeWorking',
      'stonecraft',
      'theWheel',
      'bronzePanoply',
    ]);

    // Dropping a node takes its dependants with it: Mining goes, and
    // Bronzeworking, The Wheel and the Panoply go with it, leaving exactly the
    // two that never needed it.
    expect(
      applyCommand(state, { type: 'dequeueResearch', playerId: 0, techId: 'mining' }),
    ).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual(['earthenware', 'stonecraft']);

    // And dropping the rest empties the plan — the key is deleted rather than
    // left as `[]`.
    for (const techId of ['stonecraft', 'earthenware'] as const) {
      expect(applyCommand(state, { type: 'dequeueResearch', playerId: 0, techId })).toEqual({
        ok: true,
      });
    }
    expect(researchPlan(player)).toEqual([]);
    expect(player.researching).toBe(null);
    expect('researchQueue' in player).toBe(false);
  });

  it('reads a state that has never heard of it as an empty plan', () => {
    // The migration, such as it is: a save is `{config, log}` and is refused
    // across a schema bump, so the only way a key-less player reaches this build
    // is a snapshot or a hand-edited state. It reads as "nothing queued" rather
    // than as a crash, through the one place the `?? []` lives.
    const state = newGame(config());
    const player = state.players[0]!;
    player.researching = 'mining';
    delete player.researchQueue;
    expect(researchPlan(player)).toEqual(['mining']);
  });

  it('carries the schema version that says the queue and the leftover march exist', () => {
    // A v21 log is not merely older: a `moveUnit` given with no movement left
    // used to be refused and is now a standing order, and the resolution has
    // grown a phase no v21 state has been through.
    // v40: the Cathedral (Entry LV) — cost 340 and a consecration draw at completion
    // moved every replay that raised one.
        // v42: the faith rework of Entry LVIII — one-charge agents, the founding's
    // double draft and The Holy Office's tenants move every replay with a
    // prophet or an augur in it.
    // v43: the map's layers of Entry LVIII — the vein pass, the second discovery
    // wave and the sea finds all draw off the same generator, so the board a
    // v42 seed produced is not the board this build produces from it.
    // v44: the age-1 restoration and the deepened chains — Calendar is a node
    // again, Currency and Irrigation trade places, and Æra III/IV are re-chained,
    // so a v43 log aims research at a tree this build does not have.
    // v45: the endgame of Entry LVIII — the Magnum Opus the world opens at the
    // first Alchemy and whose completion closes the age, the three bead-paying
    // great works, the Long Count's die and Alchemy's closing bead. A v44 log
    // reaches a winner it never reached, and spends rolls it never spent.
    // v46: the card pools of Entry LVIII — nineteen new Orders, a Doctrine, two
    // beliefs and a sixth consecration join the bags a draft draws from, and The
    // Laureate's once-per-game great person becomes a renown trickle. A v45 log
    // names indices of hands this build does not deal.
    // v47: the timeline reshape and the column-formula costs — seventeen
    // prerequisite edges moved so every column earns its width, and every cost
    // is rewritten off the node's own column. A v46 log aims research at a tree
    // this build does not have, and pays prices it never paid.
    // v48: the user's balance pass — the authored Order deepening ladder, the
    // Order and Doctrine retunes, and the reworked luxury signatures. A v47 log
    // drafts from a deck this build does not deal, and deepens by numbers it
    // does not carry.
    // v49: the cost ladder re-anchored at the first *paid* tier — the root is
    // not a tier. Column 0 holds Agriculture alone and Agriculture is granted,
    // so every column now takes the price the column to its left used to carry
    // (Fletching 13 where it was 30) and a v48 log pays the wrong beakers from
    // the first technology anybody researches.
    // v50: tree revision 4 — the user's hand-drawn tree transcribed (fourteen
    // renames with the ids kept, three ids cut and three added, almost every
    // prerequisite re-hung, twelve columns and a truncated cost ladder), plus
    // the one-unit-a-turn rule widened to one per class, which replaces
    // `City.purchasedUnitTurn` with `City.purchasedUnitTurns`.
    // v55 (2026-09-03, the playtest notes): two table deletions — the Standing
    // Stones improvement and the Terraces — so a v54 log that built either has
    // no row to replay into.
    // v56 (war & diplomacy, phase one): the one bump that refuses an old log
    // for a *legality reversal* rather than a table that moved — combat,
    // pillage and border-crossing between two empires are illegal at peace, so
    // a v55 log may contain an attack or a march this reducer refuses.
    // v57 (war & diplomacy, phase two): deals exist. Two registers, four
    // verbs and a widened `proposePeace`, a luxury that may be lent across a
    // table, and one technology that hands over a verb it did not — so a v56
    // log knows no deal commands and replays into a different world.
    // v58 (war & diplomacy, phase three): **puppets buy nothing** — one clause
    // in `purchaseError` and one in `tilePurchaseError`. A second legality
    // reversal rather than a table that moved: a v57 log's puppet purchase is
    // refused here, so it is a different game rather than an older one.
    expect(SCHEMA_VERSION).toBe(58);
  });
});

describe('the unitsBuilt field (schema 31)', () => {
  it('starts empty: presence is the state, exactly as researchQueue', () => {
    const state = newGame(config());
    const player = state.players[0]!;
    expect(player.unitsBuilt).toEqual({});
    expect(JSON.parse(JSON.stringify(player)).unitsBuilt).toEqual({});
  });

  it('reads a v30 player with no unitsBuilt key as nobody having built anything', () => {
    // The migration note on `SCHEMA_VERSION` (31): a v30 save's
    // `settlersBuilt: n` has no home here, and a replay of the log re-derives
    // the count from scratch — the bump refuses the snapshot rather than
    // attempting the rewrite. What this pins is that a hand-edited or
    // otherwise key-less player still prices correctly rather than throwing,
    // through the one place the `?.[type] ?? 0` reading lives
    // (`explainUnitCost`).
    const state = newGame(config());
    const player = state.players[0]!;
    delete (player as { unitsBuilt?: unknown }).unitsBuilt;
    expect(unitProductionCost(state, 0, 'settler')).toBe(unitDef('settler').cost);
    expect(unitProductionCost(state, 0, 'worker')).toBe(unitDef('worker').cost);
  });

  it('keys the settler and the worker independently, and replays byte for byte', () => {
    const state = newGame(config());
    const player = state.players[0]!;
    player.unitsBuilt.settler = 2;
    expect(player.unitsBuilt).toEqual({ settler: 2 });
    player.unitsBuilt.worker = 1;
    expect(player.unitsBuilt).toEqual({ settler: 2, worker: 1 });
    // Round-trips through JSON exactly, key order and all — the same claim
    // `newGame`'s determinism test makes for the whole state.
    expect(JSON.parse(JSON.stringify(player)).unitsBuilt).toEqual({ settler: 2, worker: 1 });
  });
});
