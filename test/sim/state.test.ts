import { describe, expect, it } from "vitest";
import { newPlayerStatecraft } from "../../src/sim/statecraft";
import { DECK_IDS } from "../../src/sim/statecraftData";
import { newPlayerPantheon } from "../../src/sim/religionData";
import { type Command, applyCommand } from "../../src/sim/commands";
import { unitProductionCost, unitRosterCost } from "../../src/sim/cities";
import { RULES } from "../../src/sim/rulesData";
import {
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  allTurnsEnded,
  allocateEntityId,
  cityById,
  clearTurnEnded,
  deriveGameplayRng,
  drawCensusInterval,
  emptyRenownFeed,
  hasEndedTurn,
  newGame as buildNewGame,
  normalizeConfig,
  playerById,
  unitById,
} from "../../src/sim/state";
import { researchPlan } from "../../src/sim/tech";
import { END_OF_TURN_PHASES, runEndOfTurn } from "../../src/sim/turn";
import { generateMap } from "../../src/sim/mapgen";
import { nextUint32 } from "../../src/sim/rng";
import { newGame } from './newGameHelpers';

// `buildNewGame` is the real `newGame`, not the test memo. The determinism
// tests below check that building twice gives the same game, and a memo
// would answer that by copying.

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 4242,
    sizeName: "duel",
    players: [
      { name: "Ada", color: "#e8503a", isHuman: true },
      { name: "Bors", color: "#3a7fe8" },
      { name: "Cleo", color: "#4caf50" },
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
  return { type: "endTurn", playerId };
}

describe("newGame", () => {
  it("starts on turn 1 with every seat open and the opening rosters", () => {
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
    expect(state.nextEntityId).toBe(
      RULES.game.firstEntityId + state.units.length,
    );
    expect(state.cities).toEqual([]);
  });

  it("turns player specs into players with index ids and explicit humanity", () => {
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
      // Nobody has met anybody on turn one (schema 64): the opening rosters are
      // seated after the players are built, and the first recompute is what
      // introduces two empires that started in sight of each other.
      metSeats: [],
      // Presence is the state, `unitsBuilt`'s own docblock reason: nobody has
      // built or bought a settler or a worker yet, so the empty object is the
      // opening kit.
      unitsBuilt: {},
      tilesPurchased: 0,
      // The Themes Build's tally (The Last Hunt, sheet 02): `tilesPurchased`'
      // twin one verb over, because a burnt-out camp leaves nothing on the
      // board to count.
      campsCleared: 0,
      // The almoner's ledger, its third (batch GP2, Cosimo): coin that has left
      // the treasury for a thing, which nothing on the board can be asked
      // about. Present from turn one for `campsCleared`'s reason.
      goldSpent: 0,
      // Its twin for faith (Devotion batch DV3, The Book of Life): faith that
      // has left the bank. Present from turn one, at nought.
      faithSpent: 0,
      eliminated: false,
      // Every seat carries the flag and every *real* seat carries it false; the
      // wild is appended separately and only when the config asks for it (see
      // the barbarian suite).
      barbarian: false,
      // The decks rework (D1a, schema 119): a seat under nobody holds all six
      // decks (`leaderDecks`), and nothing is chartered on turn one — three
      // lists that grow on a charter's pick and nowhere else.
      decks: [...DECK_IDS],
      charteredTechs: [],
      charteredBuildings: [],
      charteredRites: [],
      // Always present, like `techsResearched`: every seat has a government and
      // a slot spread from turn one — and, since D1a, an empty bank of reward
      // hands. See `Player.statecraft`.
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
      // The Bead Race's, present from turn one for the same reason: an empty
      // Abacus and six counters at nothing. The dice of the Magister used to
      // sit beside them and went with schema 71 (2026-09-06) — nothing ever
      // spent one, and faith rerolls a draft in their place.
      beads: [],
      citiesFounded: 0,
      citiesCaptured: 0,
      faithOnHolyOrders: 0,
      tithesGold: 0,
      scholarshipScience: 0,
      routeYieldsThisAge: 0,
      greatPeopleThisAge: 0,
      // The wager's, present from turn one for `beads`' reason exactly (batch
      // G2): a lifetime renown total beside the purse that is spent, the
      // exchange ledger a war writes into, an empty bag of running totals, and
      // two empty lists — the marks a missed wager leaves and the malices batch
      // G3's deck will seat. The stake itself (`Player.wager`) is absent until
      // the world deals a table, exactly as `pendingDiscovery` is.
      renownEarned: 0,
      unitsKilled: 0,
      unitsLost: 0,
      wagerTotals: {},
      pendingMalices: [],
      malices: [],
    };
    expect(state.players).toEqual([
      { id: 0, name: "Ada", color: "#e8503a", isHuman: true, ...pools },
      { id: 1, name: "Bors", color: "#3a7fe8", isHuman: false, ...pools },
      { id: 2, name: "Cleo", color: "#4caf50", isHuman: false, ...pools },
    ]);
  });

  it("generates the map from the seed and size", () => {
    const state = newGame(config({ seed: 99, sizeName: "duel" }));
    expect(state.map).toEqual(generateMap(99, "duel"));
    expect(state.map.seed).toBe(99);
    expect(state.map.sizeName).toBe("duel");
  });

  it("is deterministic: the same config produces an identical state", () => {
    expect(buildNewGame(config())).toEqual(buildNewGame(config()));
    // Also identical byte-for-byte, key order included.
    expect(JSON.stringify(buildNewGame(config()))).toBe(
      JSON.stringify(buildNewGame(config())),
    );
  });

  it("does not depend on how many other games were created first", () => {
    const first = buildNewGame(config());
    buildNewGame(config({ seed: 7 }));
    buildNewGame(config({ seed: -13, sizeName: "standard" }));
    expect(buildNewGame(config())).toEqual(first);
  });

  it("gives different seeds different maps and different generator states", () => {
    const a = newGame(config({ seed: 1 }));
    const b = newGame(config({ seed: 2 }));
    expect(a.rng.state).not.toBe(b.rng.state);
    expect(a.map).not.toEqual(b.map);
  });

  it("derives a gameplay stream decorrelated from the map generator", () => {
    const seed = 4242;
    const state = newGame(config({ seed }));
    // The map generator starts at `seed` itself; gameplay must not.
    expect(state.rng.state).not.toBe(seed | 0);
    // **The derived seed, one roll along** (batch Q1, schema 108). From schema 38
    // to 107 `newGame` shuffled the two bead decks off this generator before a
    // piece was placed; the deeds are retired and there are no decks, so the only
    // thing a fresh state has spent is the census's first interval (batch C1) —
    // which is the whole of why a v107 log does not replay. The property that
    // matters is unchanged and is asserted below: the stream is a pure function
    // of the config, and it is not the map's.
    const derived = deriveGameplayRng(seed);
    drawCensusInterval(derived);
    expect(state.rng.state).toBe(derived.state);
    expect(newGame(config({ seed })).rng).toEqual(state.rng);
    // The first gameplay roll is not the first mapgen roll either.
    const gameplay = deriveGameplayRng(seed);
    const mapgen = { state: seed | 0 };
    expect(nextUint32(gameplay)).not.toBe(nextUint32(mapgen));
  });

  it("produces a plain, JSON-serializable state", () => {
    const state = newGame(config());
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("rejects impossible configs", () => {
    expect(() => newGame(config({ players: [] }))).toThrow(/at least/);
    const crowd = new Array(RULES.game.maxPlayers + 1)
      .fill(null)
      .map((_, i) => ({ name: `P${i}`, color: "#fff" }));
    expect(() => newGame(config({ players: crowd }))).toThrow(/at most/);
    expect(() => newGame(config({ sizeName: "gigantic" }))).toThrow(
      /Unknown map size/,
    );
  });
});

describe("normalizeConfig", () => {
  it("coerces the seed to a 32-bit integer and fills in isHuman", () => {
    const normalized = normalizeConfig({
      seed: 12.75,
      sizeName: "duel",
      players: [{ name: "Ada", color: "#fff" }],
    });
    expect(normalized.seed).toBe(12);
    expect(normalized.players[0]).toEqual({
      name: "Ada",
      color: "#fff",
      isHuman: false,
    });
  });

  it("copies the players so later edits to the spec cannot reach the game", () => {
    const source = config();
    const state = newGame(source);
    source.players[0]!.name = "Mallory";
    expect(state.players[0]!.name).toBe("Ada");
  });
});

describe("accessors", () => {
  it("allocates entity ids in a deterministic sequence", () => {
    const state = newGame(config());
    // The starting units have already consumed the first ids.
    const first = state.nextEntityId;
    expect(allocateEntityId(state)).toBe(first);
    expect(allocateEntityId(state)).toBe(first + 1);
    expect(state.nextEntityId).toBe(first + 2);
  });

  it("finds players, units and cities by id", () => {
    const state = newGame(config());
    expect(playerById(state, 0)!.name).toBe("Ada");
    expect(playerById(state, 2)!.name).toBe("Cleo");
    expect(playerById(state, 9)).toBeUndefined();
    expect(unitById(state, state.units[0]!.id)).toBe(state.units[0]);
    expect(unitById(state, 9999)).toBeUndefined();
    // Cities stay empty until milestone 3.
    expect(cityById(state, 1)).toBeUndefined();
  });
});

describe("turn status helpers", () => {
  it("reads and clears the per-player flags", () => {
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

  it("iterates players, not flags, so a stray flag cannot resolve a turn", () => {
    const state = newGame(config());
    state.turnEnded = [true, true, false, true];
    expect(allTurnsEnded(state)).toBe(false);
  });
});

describe("endTurn", () => {
  it("marks one seat finished and leaves the turn alone", () => {
    const state = newGame(config());
    expect(state.turn).toBe(1);

    expect(applyCommand(state, endTurn(1))).toEqual({ ok: true });
    expect(state.turnEnded).toEqual([false, true, false]);
    expect(state.turn).toBe(1);
  });

  it("resolves the turn only when the last of three seats ends", () => {
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

  it("resolves on the second seat in a two-player game", () => {
    const state = newGame(
      config({
        players: [
          { name: "Ada", color: "#a00" },
          { name: "Bors", color: "#00a" },
        ],
      }),
    );
    expect(applyCommand(state, endTurn(1))).toEqual({ ok: true });
    expect(state.turn).toBe(1);
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([false, false]);
  });

  it("keeps rolling over many turns", () => {
    const state = newGame(config());
    for (let turn = 0; turn < 10; turn++) {
      for (const player of state.players)
        applyCommand(state, endTurn(player.id));
    }
    expect(state.turn).toBe(11);
    expect(state.turnEnded).toEqual([false, false, false]);
  });

  it("does not care in which order the seats end", () => {
    const forwards = newGame(config());
    for (const id of [0, 1, 2]) applyCommand(forwards, endTurn(id));
    const backwards = newGame(config());
    for (const id of [2, 1, 0]) applyCommand(backwards, endTurn(id));
    expect(JSON.stringify(backwards)).toBe(JSON.stringify(forwards));
  });

  it("refuses a second endTurn from the same seat, untouched", () => {
    const state = newGame(config());
    applyCommand(state, endTurn(1));
    const before = clone(state);

    const result = applyCommand(state, endTurn(1));
    expect(result).toEqual({
      ok: false,
      error: "Player 1 has already ended turn 1",
    });
    expect(state).toEqual(before);
    // And the seat that has *not* ended is still welcome.
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
  });

  it("lets a seat end the next turn after ending this one", () => {
    const state = newGame(config());
    for (const id of [0, 1, 2]) applyCommand(state, endTurn(id));
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([true, false, false]);
  });

  it("refuses a playerId that is not a player, without touching the state", () => {
    const state = newGame(config());
    const before = clone(state);
    for (const bad of [7, -1, 1.5, undefined, "0"]) {
      const result = applyCommand(state, {
        type: "endTurn",
        playerId: bad,
      } as unknown as Command);
      expect(result.ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it("refuses a corrupt flag array without touching the state", () => {
    const state = newGame(config());
    state.turnEnded = [false, false];
    const before = clone(state);
    const result = applyCommand(state, endTurn(0));
    expect(result).toEqual({
      ok: false,
      error: "Corrupt turnEnded: 2 flag(s) for 3 player(s)",
    });
    expect(state).toEqual(before);
  });
});

describe("applyCommand contract", () => {
  it("rejects an unknown command type and leaves the state untouched", () => {
    const state = newGame(config());
    const before = clone(state);
    // `foundCity` used to stand in for "not a command yet"; it is one now.
    const result = applyCommand(state, {
      type: "gildRoof",
      tile: 3,
    } as unknown as Command);
    expect(result.ok).toBe(false);
    expect(result).toEqual({
      ok: false,
      error: 'Unknown command type "gildRoof"',
    });
    expect(state).toEqual(before);
  });

  it("rejects malformed commands rather than throwing", () => {
    const state = newGame(config());
    const before = clone(state);
    for (const bad of [null, undefined, 42, "endTurn", {}, { type: 7 }, []]) {
      const result = applyCommand(state, bad as unknown as Command);
      expect(result.ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it("never returns a shared result object", () => {
    const state = newGame(config());
    const a = applyCommand(state, endTurn(0));
    const b = applyCommand(state, endTurn(1));
    expect(a).not.toBe(b);
  });
});

describe("end-of-turn pipeline", () => {
  it("runs a fixed, named, ordered set of phases", () => {
    expect(END_OF_TURN_PHASES.map((phase) => phase.name)).toEqual([
      // First, and two brooms in one beat: the spent truces are swept out and
      // every war both sides have signed is closed — so the turn resolves in a
      // world whose relations are settled, and the columns a peace sends home
      // are walked out before any standing order resumes. See `settlePeace`
      // (`src/sim/diplomacy.ts`).
      "settleDiplomacy",
      // Then the other broom: an expired rite is already
      // inert (every reader compares turns), so this only stops dead paper
      // accumulating. See `pruneTimedEffects` (ledger Entry XXVIII).
      "pruneTimedEffects",
      // The tide, before anything is banked: a town whose citizens turn this
      // turn flies its new banner before `collectYields` pays anybody for it.
      // See `spreadReligion` (`docs/religion-v2.md`).
      "spreadReligion",
      // Citizens a levy took come home when their turn comes (The Mit'a,
      // Expansionist batch E1), before `collectYields`, so a returned citizen
      // works this turn's yields. See `returnLeviedCitizens`.
      "levyReturns",
      // A town joined to its capital by road for the first time pays the
      // moment (The Opening of the Roads, Expansionist batch E2), before
      // `collectYields`. See `runRoadJoinings`.
      "roadJoinings",
      "collectYields",
      "growCities",
      // A town's own renown quietly takes a citizen out of the fields and puts
      // them in a trade (ledger Entry XLVIII). After growth, so the conversion
      // is judged against the population the town ended the turn with; before
      // production, so a guildsman formed this turn is seated and paying before
      // the next basket is banked. See `runGuilds`.
      "guilds",
      "advanceProduction",
      "advanceResearch",
      // The figure's own row (batch L2a): directly after the phase where a
      // technology lands, because a seat's age is its highest technology and a
      // sweep above this one would deal the row a turn late.
      // The periodic boons (batch A, 2026-09-06): a slotted Order whose clock has
      // come round pays its burst here — after the baskets this turn's yields
      // filled, before the draft that might spend one, so a boon paid in culture
      // opens the draft it fills on the spot. See `runPeriodicBoons`.
      "periodicBoons",
      // A seated commission whose goal is met pays its reward and leaves its
      // chair (batch C) — after the turn's banks are settled, so a treasury goal
      // reads this turn's gold, and before the draft its culture may fill.
      "commissions",
      // Culture buys a draft, beside the phase that spends the other pool a
      // resolution filled — and before `expandBorders`, whose channel it never
      // touches. See `runStatecraft`.
      "statecraft",
      // The faith ladder's hand of gods, beside the phase it is the same shape
      // as, one currency over.
      "religion",
      // The cadenced *pieces* — The Standing Levy's spear (master-list cut,
      // 2026-08-28). Its own beat rather than a clause inside `statecraft`,
      // because a levy is not a draft: nothing is spent, nothing is chosen, and
      // nothing blocks End Turn. See `musterPeriodicUnits`.
      "muster",
      // The cards' drills (Dominion batch D1): units in towns, garrisoned units
      // and units beside a great general gain experience. After `muster`, so a
      // unit raised this turn in a town is drilled too, and before `renown`, so
      // renown a rank pays is banked before that sweep. See `drillUnits`.
      "drill",
      // Buildings and wonders pay their renown trickle, standing Triumphs are
      // claimed, and a filled ladder deals a great person — the same shape a
      // fifth currency over, and after `advanceProduction` so a wonder finished
      // this turn pays into the sweep that banks the library beside it. See
      // `runRenown`.
      "renown",
      // The world's calendar (batch G1, `docs/wager.md` §1): an age closes when
      // its stamp says so and a countdown opens when the world's *mean* age
      // crosses. Directly after `renown` — the seat the clock held when it was
      // beat one of the old `beads` phase — and directly before everything that
      // reads the age, which is the whole of its position. See `runWorldClock`.
      "worldClock",
      // The age's own bars, directly after the clock (batch G2): every question
      // the wager asks is about the age, and since batch Q1 this is **the**
      // phase that mints a bead. See `runWagers` (`docs/wager.md` §2).
      "wagers",
      // The world, measured (batch C1, `docs/wager.md` §10/§11): every thirteen
      // to seventeen turns every living empire is ranked on one figure and the
      // seat at the head takes a Triumph. Directly after the wagers because both
      // read a board the clock has settled, and directly before the tables
      // because the Triumph pays renown the sweep below reads. See `runCensus`.
      "census",
      // The `beads` phase stood here and is gone (batch Q1): it dealt a card of
      // a deed deck and swept every standing deed, and the deeds are retired.
      // The two revocations that are conditions of a turn rather than events —
      // Hypatia's mob, Boudica's century. A broom's twin: marking a record
      // already marked changes nothing, so the phase is safe anywhere, and it
      // sits after `renown` because that is the phase that can hand out a
      // legacy in the first place. See `reviewLegacies`.
      "reviewLegacies",
      "expandBorders",
      // Expansionist batch E4, every ten turns: The Encroaching Fields takes a
      // hex from a smaller foreign town, then Migration and The Great
      // Migration move citizens on the empires' happiness. After the borders
      // grow, so both read the borders and the worked hexes this turn left. See
      // `runEncroachment` and `runMigrations` (`frontiers.ts`).
      "encroachment",
      "migration",
      "healCities",
      // The wild acts after the towns and before the healing, so a raider that
      // marched or fought is not resting. See `barbarianTurn`.
      "barbarians",
      "healUnits",
      // The caravans keep walking: a route's leg is turned around at each end
      // and a route that has run out is dropped, immediately before the two
      // phases that actually spend the movement it just aimed. See
      // `marchTraders`.
      "marchTraders",
      // The explorers aim themselves at the next unseen hex, or stand down
      // with a report when there is none left within reach — `marchTraders`'
      // seat and argument, one verb over: the phase decides *where* a ranging
      // piece goes, and the spender below walks it. See `marchExplorers`.
      "marchExplorers",
      // **The one phase that walks a standing order** (batch U1, 2026-09-08):
      // every march goes on *this* turn's unspent points — after the phase
      // that asks "has this unit been still all turn?", so a piece's healing
      // never depends on whether a neighbour got out of its way, and
      // immediately before the refill, so the points it spends are the turn's
      // own. See `spendLeftoverMovement`.
      "spendLeftoverMovement",
      // Refills every allowance and clears `hasAttacked` — and resumes nothing.
      "resetMovement",
      // Towns taken by force settle, and an unguarded one may raise a rebel
      // (batch WC1). After every phase that reads unrest and every phase that
      // moves a piece, and before the wake, because a rebel is a stranger at a
      // sleeping worker's door. See `runUnrest`.
      "unrest",
      // As late as it can be: the question "is an enemy standing next to my
      // sleeping worker" is only worth asking of a board that has stopped
      // moving, which is after the wild has raided *and* after
      // `spendLeftoverMovement` has walked everybody's standing orders. See
      // `wakeSleepers`.
      "wakeSleepers",
      // Still last and unconditional: clearing a flag moves no piece.
      "refreshVisibility",
    ]);
  });

  it("changes nothing when no unit has moved or been hurt", () => {
    const state = newGame(config());
    const before = clone(state);
    runEndOfTurn(state);
    // **The table included** since batch Q1: it dealt one card a turn whatever
    // anybody did, because the hand filled over an age rather than all at once
    // (design ledger Entry VI), and there is no hand — so a quiet turn is quiet
    // all the way down.
    expect(state.beads).toEqual(before.beads);
    // **And except the revision** (batch E2), which is the point of it: a
    // resolution moves the world without a command behind it, and every derived
    // reading is keyed on this counter, so a quiet turn moves it exactly once
    // per phase. Written as the phase count rather than as "some larger number",
    // because "once per phase, after that phase has run" is the contract.
    expect(state.revision - before.revision).toBe(END_OF_TURN_PHASES.length);
    state.revision = before.revision;
    // Nothing else moved — which is what the rest of this comparison says.
    expect(state).toEqual(before);
  });
});

// ---------------------------------------------------------------------------

/**
 * `Player.researchQueue`, the schema-22 field, and the two properties the rest
 * of the game leans on: an absent key reads as an empty plan, and a plan is
 * never non-empty behind an empty head.
 */
describe("the research queue field", () => {
  it("is absent until something is queued, and gone again when it empties", () => {
    const state = newGame(config());
    const player = state.players[0]!;
    expect("researchQueue" in player).toBe(false);
    expect(researchPlan(player)).toEqual([]);

    // A node whose prerequisites are met is a plan of one, and still no key —
    // a game that never queues serialises exactly as it did at schema 21.
    expect(
      applyCommand(state, {
        type: "chooseResearch",
        playerId: 0,
        techId: "mining",
      }),
    ).toEqual({
      ok: true,
    });
    expect("researchQueue" in player).toBe(false);
    expect(researchPlan(player)).toEqual(["mining"]);

    // A locked node fills it: the Bronze Panoply wants The Wheel, which wants
    // Bronzeworking *and* Stonecraft, which want Mining and Pottery — tree
    // revision 4 closes Æra I on two gates, so the plan under the Panoply is a
    // lattice flattened by depth and then by roster order.
    expect(
      applyCommand(state, {
        type: "chooseResearch",
        playerId: 0,
        techId: "bronzePanoply",
      }),
    ).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual([
      "mining",
      "earthenware",
      "bronzeWorking",
      "stonecraft",
      "theWheel",
      "bronzePanoply",
    ]);
    expect(player.researchQueue).toEqual([
      "earthenware",
      "bronzeWorking",
      "stonecraft",
      "theWheel",
      "bronzePanoply",
    ]);

    // Dropping a node takes its dependants with it: Mining goes, and
    // Bronzeworking, The Wheel and the Panoply go with it, leaving exactly the
    // two that never needed it.
    expect(
      applyCommand(state, {
        type: "dequeueResearch",
        playerId: 0,
        techId: "mining",
      }),
    ).toEqual({ ok: true });
    expect(researchPlan(player)).toEqual(["earthenware", "stonecraft"]);

    // And dropping the rest empties the plan — the key is deleted rather than
    // left as `[]`.
    for (const techId of ["stonecraft", "earthenware"] as const) {
      expect(
        applyCommand(state, { type: "dequeueResearch", playerId: 0, techId }),
      ).toEqual({
        ok: true,
      });
    }
    expect(researchPlan(player)).toEqual([]);
    expect(player.researching).toBe(null);
    expect("researchQueue" in player).toBe(false);
  });

  it('uses the current save schema version', () => {
    expect(SCHEMA_VERSION).toBe(267);
  });
});

describe("the unitsBuilt field (schema 31)", () => {
  it("reads a v30 player with no unitsBuilt key as nobody having built anything", () => {
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
    // The roster's own price and no ladder — an empty count is what this case is
    // about, not the curve. Both rows are opened at the first column, so what
    // the sized figure says is the whole of the price (batch P1).
    expect(unitProductionCost(state, 0, "settler")).toBe(
      unitRosterCost("settler"),
    );
    expect(unitProductionCost(state, 0, "worker")).toBe(
      unitRosterCost("worker"),
    );
  });

  it("keys the settler and the worker independently, and replays byte for byte", () => {
    const state = newGame(config());
    const player = state.players[0]!;
    player.unitsBuilt.settler = 2;
    expect(player.unitsBuilt).toEqual({ settler: 2 });
    player.unitsBuilt.worker = 1;
    expect(player.unitsBuilt).toEqual({ settler: 2, worker: 1 });
    // Round-trips through JSON exactly, key order and all — the same claim
    // `newGame`'s determinism test makes for the whole state.
    expect(JSON.parse(JSON.stringify(player)).unitsBuilt).toEqual({
      settler: 2,
      worker: 1,
    });
  });
});
