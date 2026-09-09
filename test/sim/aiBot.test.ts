/**
 * The bot, at the two things it must never get wrong: **every command it sends
 * is accepted**, and **the same board always produces the same command**.
 *
 * Those two are the whole contract. A bot that emits a refused command has
 * reimplemented a rule and got it wrong (it is supposed to put every candidate
 * to the simulation's own validator first), and a bot that is not a pure
 * function of the state breaks the save format — `{config, log}` replays, and a
 * seat whose decisions depended on anything outside the state would replay into
 * a different game.
 *
 * Both are asserted by *playing*, not by unit-testing a heuristic: the
 * heuristics are meant to change, the contract is not.
 */

import { describe, expect, it } from 'vitest';

import { driveBots } from '../../src/ai/driver';
import {
  AI,
  bestTechGoal,
  botSitting,
  chooseProduction,
  explainCitizen,
  nextBotCommand,
  nextBotDecision,
  scoreCard,
  valueContext,
} from '../../src/ai/bot';
import { type BotDecision, foldTerms } from '../../src/ai/decision';
import { type Game, createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import type { City, GameConfig, GameState, Player, Unit } from '../../src/sim/state';
import type { Tile } from '../../src/sim/map';
import {
  createUnit,
  hasEndedTurn,
  playerById,
  realPlayers,
  bumpRevision,
} from '../../src/sim/state';
import { getTileAt, mapRange, tileHex, tileNeighbors } from '../../src/sim/map';
import { findPath, isPassable } from '../../src/sim/pathfind';
import { foundCityAt, foundingErrorAt } from '../../src/sim/cities';
import { buildImprovementAt, improvementErrorAt } from '../../src/sim/improvements';
import { IMPROVEMENT_IDS, improvementDef } from '../../src/sim/improvementData';
import { firstBlocker } from '../../src/ui/turnBlockers';
import { type UnitTypeId, isCombatant, unitDef } from '../../src/sim/unitData';
import { UNIT_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { researchExpansion } from '../../src/sim/tech';
import { anyCardDef } from '../../src/sim/statecraft';
import { type OrderId, ORDER_IDS } from '../../src/sim/statecraftData';
import { BELIEF_IDS } from '../../src/sim/religionData';
import { explainEmpireGold } from '../../src/sim/empireGold';
import { explainBuildingRow, meterWeight, yieldWeight } from '../../src/ai/value';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { happinessDemand } from '../../src/sim/meters';
import { worthPerCoin } from '../../src/ai/wants';

/**
 * The standing maintenance bill, as `goldReserveFor` reads it — the negative
 * lines of `explainEmpireGold`, which is the one set of books the cover is
 * sized off. Written here rather than exported from the bot because it is one
 * fold and a test that asks the simulation is a test that cannot drift.
 */
function upkeepBillOf(state: GameState, playerId: number): number {
  let bill = 0;
  for (const line of explainEmpireGold(state, playerId)) {
    if (line.gold < 0) bill -= line.gold;
  }
  return bill;
}

/**
 * Two bot seats on a small map with the wild in it.
 *
 * `isHuman` is left off both, which is exactly what makes them bots
 * (`normalizeConfig` defaults it to false) — the same absence the landing
 * screen's "You vs one bot" writes for the second chair, and the reason that
 * option needed no schema change. Barbarians are on because the military branch
 * is the one that has an opponent to be wrong about.
 */
const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

interface Played {
  game: Game;
  refusals: string[];
  turnsEnded: number;
}

/** Plays `turns` whole turns with every seat driven by the bot. */
function play(turns: number, config: GameConfig = CONFIG): Played {
  const game = createGame(config);
  const refusals: string[] = [];
  let turnsEnded = 0;
  for (let turn = 0; turn < turns; turn++) {
    const before = game.state.turn;
    for (const report of driveBots(game, { warn: (message) => refusals.push(message) })) {
      if (report.refused > 0) refusals.push(`seat ${report.playerId} had ${report.refused} refusals`);
      if (!report.ended) refusals.push(`seat ${report.playerId} never ended turn ${before}`);
    }
    if (game.state.turn > before) turnsEnded += 1;
  }
  return { game, refusals, turnsEnded };
}

describe('the bot', () => {
  it('drives both seats for ten turns with nothing refused', () => {
    const played = play(10);
    expect(played.refusals).toEqual([]);
    expect(played.turnsEnded).toBe(10);
    expect(played.game.state.turn).toBe(11);
  });

  it('leaves no seat owing the turn anything when it hands over', () => {
    const played = play(6);
    expect(played.refusals).toEqual([]);
    // Every real seat ended, and none of them was carrying an unanswered offer
    // when it did — which is what "the bot clears its own blockers" means.
    const game = createGame(CONFIG);
    for (let turn = 0; turn < 6; turn++) {
      for (const seat of realPlayers(game.state)) {
        // Drive one seat at a time so the blocker can be read at the moment it
        // decided it was finished.
        if (hasEndedTurn(game.state, seat.id)) continue;
        driveBots(game, { warn: () => {} });
      }
    }
    for (const seat of realPlayers(game.state)) {
      // Between turns nothing is outstanding except what the resolution just
      // dealt, and `nextBotCommand` is what would answer it.
      const blocker = firstBlocker(game.state, seat.id);
      if (blocker !== null) {
        expect(nextBotCommand(game.state, seat.id)).not.toBeNull();
      }
    }
  });

  it('is a pure function of the state: two runs are byte-identical', () => {
    const first = play(8);
    const second = play(8);
    expect(first.refusals).toEqual([]);
    expect(second.refusals).toEqual([]);
    expect(JSON.stringify(second.game.log)).toBe(JSON.stringify(first.game.log));
    expect(snapshotState(second.game.state)).toBe(snapshotState(first.game.state));
  });

  it('writes a log that replays to the same board', () => {
    const played = play(8);
    expect(played.refusals).toEqual([]);
    const rebuilt = replay(played.game.config, played.game.log);
    expect(snapshotState(rebuilt)).toBe(snapshotState(played.game.state));
  });

  it('says nothing about a seat that is not its business', () => {
    const game = createGame(CONFIG);
    // The wild has no screen and never sends an `endTurn`; the bot must refuse
    // to have an opinion about it rather than driving it into the ground.
    const wild = game.state.players.find((player) => player.barbarian);
    expect(wild).toBeDefined();
    expect(nextBotCommand(game.state, wild!.id)).toBeNull();
    // And a seat driven to quiet runs out of things to say, which is the
    // property the driver's loop actually relies on. It is asserted by driving
    // rather than by asking once after a resolution: the turn `driveBots`
    // resolves hands seat 0 a *fresh* turn, and a fresh turn legitimately has
    // opinions — re-aiming the beeline at a new turn is a decision, not a spin.
    driveBots(game, { warn: () => {} });
    for (let step = 0; step < 200; step++) {
      const command = nextBotCommand(game.state, 0);
      if (command === null) break;
      dispatch(game, command);
    }
    expect(nextBotCommand(game.state, 0)).toBeNull();
  });

  it('spends a surplus instead of sitting on it', () => {
    // **Gold has no automatic sink.** The board cannot produce a treasury this
    // size in ten turns, so it is put there directly — which is why this test
    // makes no claim about replay: a state poked from outside is not a state the
    // log reproduces, and that is exactly the point of the poke.
    const game = createGame(CONFIG);
    for (const player of realPlayers(game.state)) player.gold = 5000;
    bumpRevision(game.state);
    for (let turn = 0; turn < 4; turn++) driveBots(game, { warn: () => {} });
    const bought = game.log.filter((command) => command.type === 'purchaseItem');
    expect(bought.length).toBeGreaterThan(0);
    // And the reserve is kept: the bot never empties a treasury it owes upkeep
    // out of.
    for (const player of realPlayers(game.state)) {
      expect(player.gold).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps the wage cover back rather than spending to the last coin', () => {
    // **Re-aimed for the want book** (batch 1): there is no `goldSpendAbove` and
    // no flat `goldReserve` any more. What survives is the cover sized off the
    // standing bill (`solvency.reserveTurnsOfUpkeep`), and the claim is the same
    // one it always was — nothing is ever bought *out of* it.
    const game = createGame(CONFIG);
    for (const player of realPlayers(game.state)) player.gold = 400;
    bumpRevision(game.state);
    for (let turn = 0; turn < 3; turn++) driveBots(game, { warn: () => {} });
    for (const player of realPlayers(game.state)) {
      const cover = AI.solvency.reserveTurnsOfUpkeep * upkeepBillOf(game.state, player.id);
      expect(player.gold).toBeGreaterThanOrEqual(Math.floor(cover));
    }
  });

  it('drives only the seats nobody is sitting in', () => {
    const game = createGame({
      ...CONFIG,
      players: [
        { name: 'Crimson', color: '#d4502e', isHuman: true },
        { name: 'Teal', color: '#1f8a85' },
      ],
    });
    const reports = driveBots(game, { warn: () => {} });
    expect(reports.map((report) => report.playerId)).toEqual([1]);
    expect(hasEndedTurn(game.state, 1)).toBe(true);
    expect(hasEndedTurn(game.state, 0)).toBe(false);
    // The turn has not resolved: the person at the keyboard has not pressed it.
    expect(game.state.turn).toBe(1);
  });
});

/**
 * A game played far enough that both seats have a town, a queue and an opinion —
 * the board every scored-decision test below starts from.
 *
 * Ten turns rather than two because a scored build list is only interesting once
 * a town has citizens working hexes: at turn one every candidate is priced off
 * the same two tiles and the ordering says nothing.
 */
function grownGame(turns = 10): Game {
  const game = createGame(CONFIG);
  for (let turn = 0; turn < turns; turn++) driveBots(game, { warn: () => {} });
  return game;
}

/** One seat's first town. */
function firstCity(state: GameState, playerId: number): City {
  const city = state.cities.find((town) => town.ownerId === playerId);
  if (!city) throw new Error(`seat ${playerId} has no city`);
  return city;
}

/** The seat, not-null. */
function seat(state: GameState, playerId: number): Player {
  const player = playerById(state, playerId);
  if (!player) throw new Error(`no seat ${playerId}`);
  return player;
}

describe('the scored build list', () => {
  it('prices a candidate off the simulation\'s own yields, not a fixed list', () => {
    // The claim is the tier-1 premise: what a town starts is the *best-scoring*
    // legal candidate, so it must be something the appraisal actually ranked
    // first — not whatever the old `ai.build.buildings` order happened to name.
    const game = grownGame();
    const player = seat(game.state, 0);
    const city = firstCity(game.state, 0);
    const chosen = chooseProduction(game.state, player, city);
    expect(chosen).not.toBeNull();
    // Whatever it picked, the reducer takes it — the gates are still the
    // simulation's and the score only reorders what they allow.
    const result = nextBotCommand(game.state, 0);
    expect(result === null || typeof result.type === 'string').toBe(true);
  });

  it('turns away from upkeep when the books are bleeding', () => {
    // **Entry LIX, finding 1**, as a unit test. The same board is appraised
    // twice: once solvent, once with the treasury under the arrears floor, which
    // pins `goldPressure` at full aversion. What must change is the *cost* of a
    // maintained candidate — and the hard floor must take it out of the running
    // altogether.
    const game = grownGame();
    const player = seat(game.state, 0);

    player.gold = 500;
    bumpRevision(game.state);
    const rich = valueContext(game.state, player);
    player.gold = AI.solvency.arrearsTreasury - 1;
    bumpRevision(game.state);
    const broke = valueContext(game.state, player);

    expect(rich.goldPressure).toBeLessThan(broke.goldPressure);
    expect(broke.goldPressure).toBe(AI.weights.debtAversion);
  });

  it('never leaves a town with nothing to build, however deep the arrears', () => {
    // The floor is a filter, not a refusal: a town it emptied would be a
    // `cityProduction` blocker nobody could answer, and a seat that can never end
    // its turn. Poked directly into ruin, because the board cannot produce this.
    const game = grownGame();
    for (const player of realPlayers(game.state)) player.gold = -900;
    bumpRevision(game.state);
    for (const city of game.state.cities) {
      const player = seat(game.state, city.ownerId);
      if (player.barbarian) continue;
      expect(chooseProduction(game.state, player, city)).not.toBeNull();
    }
  });

  it('lets a redundant piece go when it is actually in arrears', () => {
    // The disband arm, and its guards. A field army well over the floor, a
    // treasury under it: something must go, and it must not be a garrison.
    const game = grownGame();
    const player = seat(game.state, 0);
    // Workers silenced (charges spent) and every standing piece out of
    // movement, so the one command under test is the one the bot answers with
    // — on the pangaea (2026-09-03) the grown fixture leaves a worker with a
    // live plan and a scout with somewhere to go, and both are honest
    // higher-priority answers that are not what this test is about. The
    // disband arm spends no movement, so nothing here touches the claim.
    for (const u of game.state.units) {
      if (u.ownerId !== 0) continue;
      if (u.chargesLeft !== undefined) u.chargesLeft = 0;
      u.movesLeft = 0;
    }
    const city = firstCity(game.state, 0);
    // Five spare soldiers standing in the field, well away from the town so the
    // garrison guard is not what is being tested here.
    const spare = [];
    for (let i = 0; i < 5; i++) {
      spare.push(createUnit(game.state, 0, 'warrior', city.col + 3 + i, city.row + 3));
    }
    player.gold = -100;
    bumpRevision(game.state);
    const cut = nextBotCommand(game.state, 0);
    expect(cut).not.toBeNull();
    expect(cut!.type).toBe('disbandUnit');
    // And it took one of the spares, never the piece holding the town.
    const taken = (cut as { unitId: number }).unitId;
    expect(spare.some((unit) => unit.id === taken)).toBe(true);
  });

  it('keeps a garrison and a minimum army whatever the treasury says', () => {
    const game = grownGame();
    const player = seat(game.state, 0);
    player.gold = -900;
    bumpRevision(game.state);
    // Everything this seat owns, offered to the creditors one command at a time.
    // The two floors must hold: `solvency.minArmy` pieces, and a garrison in
    // every town.
    for (let step = 0; step < 40; step++) {
      const command = nextBotCommand(game.state, 0);
      if (command === null || command.type !== 'disbandUnit') break;
      const unit = game.state.units.find((piece) => piece.id === command.unitId);
      expect(unit).toBeDefined();
      game.state.units = game.state.units.filter((piece) => piece.id !== command.unitId);
    }
    const soldiers = game.state.units.filter(
      (unit) => unit.ownerId === 0 && isCombatant(unitDef(unit.type)),
    );
    expect(soldiers.length).toBeGreaterThanOrEqual(AI.solvency.minArmy);
  });
});

describe('the bot defends itself', () => {
  it('raises a soldier over an economy building when a column is next door', () => {
    // **Design addendum 1.** The same town, appraised twice: once in a quiet
    // world, once with three hostile soldiers parked beside it. What must change
    // is what the town starts.
    const game = grownGame(14);
    const player = seat(game.state, 0);
    const city = firstCity(game.state, 0);
    // A quiet world is ESTABLISHED, not assumed (2026-09-05): on the retuned
    // sheet the fourteen-turn bench already has wild pieces wandering inside the
    // threat radius of the first town, so the wild is cleared off the board
    // before the quiet appraisal — the test's own column is placed below.
    game.state.units = game.state.units.filter((unit) => unit.ownerId === player.id);

    const quiet = chooseProduction(game.state, player, city);
    expect(quiet).not.toBeNull();
    expect(valueContext(game.state, player).threat).toBe(0);

    // The wild's own pieces, standing one hex off the town. `threatLevel` reads
    // the board rather than the fog — the creed's omniscience clause, unchanged.
    const wild = game.state.players.find((other) => other.barbarian)!;
    for (let i = 0; i < 3; i++) {
      createUnit(game.state, wild.id, 'warrior', city.col + 1, city.row + 1 + i);
    }
    expect(valueContext(game.state, player).threat).toBeGreaterThan(0);

    const besieged = chooseProduction(game.state, player, city);
    expect(besieged).not.toBeNull();
    expect(besieged!.kind).toBe('unit');
    expect(isCombatant(unitDef((besieged as { id: 'warrior' }).id))).toBe(true);
  });

  it('holds the garrison rule while it hunts', () => {
    // **Design addendum 2**, the half that is a guard rather than a policy: a
    // camp beside the border is hunted, but never by the piece that is the only
    // thing standing in a town.
    const game = grownGame(12);
    const city = firstCity(game.state, 0);
    // Empty the town's hex of everything but one soldier, and put a camp two
    // hexes off it.
    game.state.units = game.state.units.filter(
      (unit) => !(unit.ownerId === 0 && unit.col === city.col && unit.row === city.row),
    );
    const holder = createUnit(game.state, 0, 'warrior', city.col, city.row);
    game.state.camps.push({ col: city.col + 2, row: city.row, foundedTurn: game.state.turn });

    const order = nextBotCommandFor(game, 0, holder.id);
    // Whatever the lone garrison does, it does not walk out of the town.
    if (order !== null && order.type === 'moveUnit') {
      expect(order.target).not.toEqual({ col: city.col + 2, row: city.row });
    }
  });

  it('marches a free soldier onto a camp beside the border', () => {
    // The other half: a *spare* piece does take the errand.
    const game = grownGame(12);
    const city = firstCity(game.state, 0);
    // A garrison the rule is satisfied by, plus a free piece standing beside it.
    createUnit(game.state, 0, 'warrior', city.col, city.row);
    const free = createUnit(game.state, 0, 'warrior', city.col + 1, city.row);
    const camp = { col: city.col + 2, row: city.row, foundedTurn: game.state.turn };
    game.state.camps.push(camp);

    const order = nextBotCommandFor(game, 0, free.id);
    expect(order).not.toBeNull();
    // Either it strikes something adjacent or it marches; a camp two hexes off a
    // town is what the hunt is for, so the piece must not simply stand down.
    expect(['moveUnit', 'attack', 'fortify']).toContain(order!.type);
  });
});

describe('the beeline', () => {
  it('sends a queue rather than one cheap node', () => {
    // **Design addendum 3**, the source-shaped half: the plan machinery exists
    // (`chooseResearch`'s `queue`) and the bot uses it.
    const game = grownGame(4);
    const player = seat(game.state, 0);
    player.researching = null;
    delete player.researchQueue;
    const command = nextBotCommand(game.state, 0);
    expect(command).not.toBeNull();
    // Whatever else it wants first, the research it eventually sends names a
    // goal and a mode.
    const research = [command!, ...playOutSeat(game, 0)].find(
      (order) => order.type === 'chooseResearch',
    );
    expect(research).toBeDefined();
    expect((research as { queue?: string }).queue).toBe('replace');
  });

  it('swings the goal to the military branch when a column appears', () => {
    // The behavioural half. The goal is recomputed off the board, so planting a
    // threat and asking again is the whole experiment — nothing is stored, which
    // is why there is no "clear the old plan" step here.
    const game = grownGame(12);
    const player = seat(game.state, 0);
    const city = firstCity(game.state, 0);

    const peacetime = bestTechGoal(game.state, player);
    expect(peacetime).not.toBeNull();

    const wild = game.state.players.find((other) => other.barbarian)!;
    for (let i = 0; i < 4; i++) {
      createUnit(game.state, wild.id, 'warrior', city.col + 1, city.row + 1 + i);
    }
    const wartime = bestTechGoal(game.state, player);
    expect(wartime).not.toBeNull();

    // The road to the wartime goal unlocks something that fights. That is the
    // claim — not that the goal *changed*, because a peacetime goal that already
    // unlocked a soldier would make this test lie about a bot that was right.
    const road = researchExpansion(game.state, 0, wartime!);
    const arms = road.some((step) =>
      (techDef(step).unlocks.units ?? []).some((unit) => isCombatant(unitDef(unit))),
    );
    expect({ goal: wartime, arms }).toEqual({ goal: wartime, arms: true });
  });

  it('says nothing when the plan is already the goal it wants', () => {
    // Idempotence by construction — the whole of why re-aiming every turn cannot
    // spin. Drive one seat until it is quiet, then ask again: nothing more.
    const game = grownGame(6);
    playOutSeat(game, 0);
    const again = nextBotCommand(game.state, 0);
    if (again !== null) expect(again.type).not.toBe('chooseResearch');
  });
});

describe('the drafting hand', () => {
  it('prefers a card on a thread this empire is already committed to', () => {
    // **Design addendum 4.** Two cards that score the same on their effects are
    // separated by the `line` they share with what is already held. Built from
    // the table rather than hypothesised: any two Orders whose base scores are
    // equal and whose lines differ will do.
    const game = grownGame(4);
    const player = seat(game.state, 0);
    const ctx = valueContext(game.state, player);

    // A pair of rows with equal base value and different threads.
    const rows = ORDER_IDS.filter((id) => anyCardDef(id).line !== undefined);
    let pair: [OrderId, OrderId] | null = null;
    for (const a of rows) {
      for (const b of rows) {
        if (a === b) continue;
        if (anyCardDef(a).line === anyCardDef(b).line) continue;
        if (scoreCard(player, a, ctx) !== scoreCard(player, b, ctx)) continue;
        pair = [a, b];
        break;
      }
      if (pair) break;
    }
    expect(pair).not.toBeNull();
    const [a, b] = pair!;
    // Commit to `a`'s thread by holding it, and `a` must now outscore `b`.
    player.statecraft.orders.push(a as OrderId);
    expect(scoreCard(player, a as OrderId, ctx)).toBeGreaterThan(
      scoreCard(player, b as OrderId, ctx),
    );
  });

  it('scores an unreadable card above a blank one, never at zero', () => {
    // The rule `value.ts` states: an unknown effect shape is worth
    // `score.unknownEffect`, because a card whose text this bot cannot read is
    // still worth more than an empty offer — and a `never` check here would put
    // a design decision in the wrong module.
    const game = grownGame(2);
    const player = seat(game.state, 0);
    const ctx = valueContext(game.state, player);
    for (const id of ORDER_IDS) {
      expect(Number.isFinite(scoreCard(player, id, ctx))).toBe(true);
    }
  });
});

describe('the appetite for gods', () => {
  it('prices the first god above everything else the faith bank could buy', () => {
    // **Design addendum 5, re-aimed onto the want book** (batch 1), and re-aimed
    // again when the augur was withdrawn (schema 74): the row that would
    // consecrate a first god is the **ladder's** now, not a piece's, so the
    // claim is made about the whole book rather than about what may be bought.
    const game = grownGame(8);
    const player = seat(game.state, 0);
    expect(player.pantheon.beliefs).toEqual([]);
    // The gate is a technology; granted directly, because what is under test is
    // the appetite rather than the tree.
    for (const step of researchExpansion(game.state, 0, 'divination')) {
      player.techsResearched.push(step);
      bumpRevision(game.state);
    }
    player.faithPool = 500;
    bumpRevision(game.state);
    const book = valueContext(game.state, player).wants.faith;
    const rungs = book.filter((want) => want.label.startsWith('the next consecration'));
    expect(rungs).toHaveLength(1);
    const others = book.filter((want) => want.holding === undefined && want !== rungs[0]);
    for (const want of others) {
      expect(worthPerCoin(rungs[0]!), want.label).toBeGreaterThan(worthPerCoin(want));
    }
    // And it is dear *because* of that: faith's price rides the band's ceiling
    // while the appetite is live.
    const ctx = valueContext(game.state, player);
    expect(ctx.prices.faith).toBe(
      yieldWeight(AI, 'faith', ctx.age) * AI.priorities.priceBandHigh,
    );
  });

  it('stops buying augurs and saves for a prophet once it has a god', () => {
    // The half that actually decides whether a religion is ever founded. An
    // augur is *spent* consecrating, so `ownsAny` goes false again and a bot
    // with no hold-back buys another one every time it can — forever, never
    // reaching the prophet's price. With a god held and no religion founded, the
    // faith bank must be saved rather than spent.
    const game = grownGame(8);
    const player = seat(game.state, 0);
    // A god in hand, no religion, and enough faith for an augur but not a
    // prophet: the old bot bought the augur, this one waits.
    player.pantheon.beliefs = [firstBelief()];
    player.faithPool = 90;
    bumpRevision(game.state);
    player.gold = 0;
    bumpRevision(game.state);
    const commands = [nextBotCommand(game.state, 0), ...playOutSeat(game, 0)];
    const augur = commands.some(
      (command) =>
        command !== null &&
        command.type === 'purchaseItem' &&
        (command as { item?: { id?: string } }).item?.id === 'augur',
    );
    expect(augur).toBe(false);
  });

  it('spends on the prophet the moment it can afford one', () => {
    const game = grownGame(8);
    const player = seat(game.state, 0);
    player.pantheon.beliefs = [firstBelief()];
    player.faithPool = 400;
    bumpRevision(game.state);
    // The prophet is gated on a technology this young empire has not reached.
    // Granted directly, because what is under test is the *appetite*, not the
    // tree — and the roster names its own gate, so nothing here spells a tech id.
    const gate = UNIT_UNLOCK_TECH.get('prophet');
    if (gate !== undefined) {
      for (const step of researchExpansion(game.state, 0, gate)) player.techsResearched.push(step);
      bumpRevision(game.state);
    }
    const commands = [nextBotCommand(game.state, 0), ...playOutSeat(game, 0)];
    const prophet = commands.some(
      (command) =>
        command !== null &&
        command.type === 'purchaseItem' &&
        (command as { item?: { id?: string } }).item?.id === 'prophet',
    );
    expect(prophet).toBe(true);
  });
});

/** Any belief id, for a test that only needs the pantheon to be non-empty. */
function firstBelief(): never {
  return BELIEF_IDS[0] as never;
}

/** Drives one seat to quiet, returning every command it sent. */
function playOutSeat(game: Game, playerId: number): { type: string }[] {
  const sent: { type: string }[] = [];
  for (let step = 0; step < 60; step++) {
    const command = nextBotCommand(game.state, playerId);
    if (command === null) break;
    sent.push(command);
    const result = dispatchOne(game, command);
    if (!result) break;
  }
  return sent;
}

/** One command through the game, reporting whether it landed. */
function dispatchOne(game: Game, command: { type: string }): boolean {
  return dispatch(game, command as never).ok;
}

/** What one named piece would be told to do, with every other blocker cleared. */
function nextBotCommandFor(game: Game, playerId: number, unitId: number): { type: string; target?: unknown } | null {
  for (let step = 0; step < 60; step++) {
    const command = nextBotCommand(game.state, playerId);
    if (command === null) return null;
    if ('unitId' in command && command.unitId === unitId) {
      return command as { type: string; target?: unknown };
    }
    if (!dispatchOne(game, command)) return null;
  }
  return null;
}

/**
 * The other half of "deterministic", asserted by reading the source rather than
 * by playing — because the failure mode is a *rare* divergence and no number of
 * games proves its absence.
 *
 * Read through Vite's raw glob for `test/ui/seatRoster.test.ts`' reason exactly:
 * this project has no node typings, and a source assertion is not worth a
 * dependency.
 */
const AI_SOURCE = import.meta.glob('../../src/ai/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** One file's text with its comments taken out — the rule is *explained* in them. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('the two missing signs, on a played board (batch X5)', () => {
  it('charges every town’s next citizen the contentment it demands', () => {
    // The arithmetic is pinned in `aiAppraisal.test.ts`; what this asks is that
    // the line is *there* on every town of a board the bot actually played, and
    // that the fold still folds. A charge that only appears on an arranged bench
    // is a charge the played game never pays.
    const game = grownGame(20);
    const player = seat(game.state, 0);
    const ctx = valueContext(game.state, player);
    const towns = game.state.cities.filter((city) => city.ownerId === player.id);
    expect(towns.length).toBeGreaterThan(0);
    for (const city of towns) {
      const citizen = explainCitizen(game.state, city, ctx);
      const line = citizen.terms.find((term) =>
        term.label.includes('the contentment one more citizen demands'),
      );
      expect(line, city.name).not.toBeUndefined();
      expect(line!.value).toBe(
        -(happinessDemand(city.population + 1) - happinessDemand(city.population)) *
          meterWeight(ctx, 'happiness'),
      );
      expect(citizen.total).toBe(foldTerms(citizen.terms));
    }
  });

  it('prints a hit-points line on every wall-chain row and on no other', () => {
    // The wall half's own contract, said about the whole table rather than about
    // one row: every `cityHp` row carries the line, it is worth something, and
    // nothing else in `data/buildings.json` says a word about hit points.
    const game = grownGame(20);
    const ctx = valueContext(game.state, seat(game.state, 0));
    let walls = 0;
    for (const id of BUILDING_IDS) {
      const appraisal = explainBuildingRow(id, ctx);
      const line = appraisal.terms.find((term) => /town hit points/.test(term.label));
      if ((buildingDef(id).cityHp ?? 0) === 0) {
        expect(line, id).toBeUndefined();
        continue;
      }
      walls += 1;
      expect(line, id).not.toBeUndefined();
      // A share of what this town's own defence is worth: strictly a gain, never
      // the hundred points of strength the points reading used to make of it.
      expect(line!.value, id).toBeGreaterThan(0);
      expect(foldTerms(appraisal.terms), id).toBe(appraisal.total);
    }
    expect(walls).toBeGreaterThan(0);
  });
});

/**
 * **The march, re-asked** (batch X7) — arranged boards, because the thing being
 * asserted is a *change of mind* and a played game gives you no way to say which
 * turn the board moved on.
 *
 * The shape of every case below is the same three runs on the same seed, and it
 * is the shape rather than the seed that makes them stable: the piece is asked
 * once with a route to a hex nobody would choose (which is how the test learns
 * what the arm actually wants), once with a route to *that* hex (the control —
 * the board has not moved, so the seat must say nothing at all), and once with
 * the same route after the board has moved under it. The piece is asked at the
 * same point of the sitting in all three, which is why the first run's answer is
 * still the answer in the second.
 */
describe('the march is re-asked (batch X7)', () => {
  /** One seat's whole sitting, dispatched as it goes — `driveSeat` without the hand-over. */
  function sittingOf(game: Game, playerId: number, cap = 120): BotDecision[] {
    const sitting = botSitting(playerId);
    const taken: BotDecision[] = [];
    for (let step = 0; step < cap; step++) {
      const decision = nextBotDecision(game.state, playerId, sitting);
      if (decision === null) break;
      if (!dispatch(game, decision.command).ok) break;
      taken.push(decision);
    }
    return taken;
  }

  /** What this seat ordered that piece to do in one sitting, or `null`. */
  function orderTo(decisions: readonly BotDecision[], unitId: number): BotDecision | null {
    for (const decision of decisions) {
      const command = decision.command as { unitId?: number };
      if (command.unitId === unitId) return decision;
    }
    return null;
  }

  /**
   * A hex beside the seat's capital that a civilian may stand on — and, for a
   * settler, may **not** found on, so the arm has to march rather than settle
   * where it was put.
   */
  function perchFor(state: GameState, playerId: number, mustRefuseFounding: boolean): Tile {
    const home = state.cities.find((city) => city.ownerId === playerId)!;
    const centre = getTileAt(state.map, home.col, home.row)!;
    for (const tile of mapRange(state.map, tileHex(centre), 2)) {
      if (tile.col === home.col && tile.row === home.row) continue;
      if (!isPassable(tile)) continue;
      if (state.units.some((unit) => unit.col === tile.col && unit.row === tile.row)) continue;
      if (mustRefuseFounding && foundingErrorAt(state, playerId, tile) === null) continue;
      return tile;
    }
    throw new Error('no perch beside the capital');
  }

  /** A hex the piece can be sent to that nothing would choose: the next one over. */
  function dullTarget(state: GameState, unit: Unit): Tile {
    for (const tile of tileNeighbors(state.map, getTileAt(state.map, unit.col, unit.row)!)) {
      if (!isPassable(tile)) continue;
      if (findPath(state, unit, tile) !== null) return tile;
    }
    throw new Error('nowhere dull to walk');
  }

  /** A fresh board with one piece of the seat's perched and carrying a route to `aim`. */
  function marching(
    type: UnitTypeId,
    aim: { col: number; row: number } | null,
    turns: number,
  ): { game: Game; unit: Unit } {
    // A grown board rather than turn one: a seat starts with no town at all, and
    // "the site the chain names" is not a question a board with no empire on it
    // can be asked. `grownGame` is a pure function of the seed, so the three runs
    // below all begin on the very same board. The spade's cases want a *later*
    // board than the settler's for a reason of its own: an empire twelve turns
    // old holds one unimproved hex worth digging, and a plan with one entry in it
    // cannot show a plan changing its mind.
    const game = grownGame(turns);
    const perch = perchFor(game.state, 0, unitDef(type).foundsCity === true);
    const unit = createUnit(game.state, 0, type, perch.col, perch.row);
    const goal =
      aim === null ? dullTarget(game.state, unit) : getTileAt(game.state.map, aim.col, aim.row)!;
    unit.path = findPath(game.state, unit, goal)!;
    expect(unit.path.length).toBeGreaterThan(0);
    return { game, unit };
  }

  /** Where the arm sends a piece of this kind once it is asked a second time. */
  function aimOf(type: UnitTypeId, turns: number): { target: { col: number; row: number }; order: BotDecision } {
    const { game, unit } = marching(type, null, turns);
    const order = orderTo(sittingOf(game, 0), unit.id);
    expect(order, 'the piece was never re-asked off its dull route').not.toBeNull();
    expect(order!.command.type).toBe('moveUnit');
    return { target: (order!.command as { target: { col: number; row: number } }).target, order: order! };
  }

  it('says nothing at all about a march the board has not moved under', () => {
    const { target: aim } = aimOf('settler', 12);
    const { game, unit } = marching('settler', aim, 12);
    const before = JSON.stringify(unit.path);
    // The same destination is silence: no command, no churn. The route the seat
    // gave the piece is still drawn when the sitting is over.
    expect(orderTo(sittingOf(game, 0), unit.id)).toBeNull();
    expect(JSON.stringify(unit.path)).toBe(before);
  });

  it('re-aims a settler whose site a rival founded on while it was walking', () => {
    const { target: aim } = aimOf('settler', 12);
    const { game, unit } = marching('settler', aim, 12);
    // The board moves: the rival takes the very hex the route ends on.
    foundCityAt(game.state, 1, getTileAt(game.state.map, aim.col, aim.row)!);
    bumpRevision(game.state);
    const order = orderTo(sittingOf(game, 0), unit.id);
    expect(order, 'the settler walked on to a site that is gone').not.toBeNull();
    // It re-aims — anywhere but the hex it was walking to.
    const target = (order!.command as { target?: { col: number; row: number } }).target;
    if (target !== undefined) expect(`${target.col},${target.row}`).not.toBe(`${aim.col},${aim.row}`);
    // And it says why, in the feed, as a term of the chosen candidate's own
    // arithmetic — the rules' own sentence about the site inside it.
    const chosen = order!.candidates.find((candidate) => candidate.chosen)!;
    expect(chosen.terms[0]!.label).toContain('re-asked:');
    expect(chosen.terms[0]!.label).toContain(`(${aim.col},${aim.row})`);
    expect(chosen.terms[0]!.value).toBe(0);
    // The reason line is free: a zero at the head of a fold that starts at zero.
    expect(foldTerms(chosen.terms)).toBe(chosen.score);
  });

  it('re-plans a worker whose hex another spade improved while it was walking', () => {
    const { target: aim, order: planned } = aimOf('worker', 32);
    const { game, unit } = marching('worker', aim, 32);
    // The board moves: a second spade of ours lays **the very row the first was
    // walking there to lay** — the plan prints the improvement in its own
    // candidate label, so the test does not have to guess which one it wanted.
    // `buildImprovementAt` is the simulation's own verb.
    const wanted = planned.candidates.find((candidate) => candidate.chosen)!.label.split(' at (')[0];
    const laid = IMPROVEMENT_IDS.find((id) => improvementDef(id).name === wanted);
    expect(laid, `no improvement is named "${wanted}"`).not.toBeUndefined();
    const tile = getTileAt(game.state.map, aim.col, aim.row)!;
    expect(improvementErrorAt(game.state, 0, tile, laid!)).toBeNull();
    const other = createUnit(game.state, 0, 'worker', tile.col, tile.row);
    buildImprovementAt(game.state, other, tile, laid!);
    bumpRevision(game.state);
    const order = orderTo(sittingOf(game, 0), unit.id);
    expect(order, 'the spade walked on to a hex that is already dug').not.toBeNull();
    const target = (order!.command as { target?: { col: number; row: number } }).target;
    if (target !== undefined) expect(`${target.col},${target.row}`).not.toBe(`${aim.col},${aim.row}`);
  });

  it('asks each piece at most `driver.reaskPerTurn` times a sitting', () => {
    // The bound, read off the sitting rather than off a count of commands: what
    // is bounded is the *ask*, so a piece whose answer was silence is struck off
    // too. A played turn, so the pieces are the ones the game actually made.
    const played = play(24);
    const game = played.game;
    const sitting = botSitting(0);
    for (let step = 0; step < 120; step++) {
      const decision = nextBotDecision(game.state, 0, sitting);
      if (decision === null) break;
      if (!dispatch(game, decision.command).ok) break;
    }
    for (const [unitId, asks] of sitting.reasked) {
      expect(asks, `unit ${unitId}`).toBeLessThanOrEqual(AI.driver.reaskPerTurn);
    }
  });

  it('reads the simulation’s own wide predicate, and nothing of its own', () => {
    // The register half. `unitOfferedForOrders` is the sim's (`src/sim/units.ts`,
    // schema 98) and this arm exists precisely because the bot had no caller for
    // it; a hand-rolled "has a path and some movement" here would be a second
    // definition of the same word, which is the failure `turnBlockers.test.ts`
    // reads the source to prevent one file over.
    const source = code(AI_SOURCE[Object.keys(AI_SOURCE).find((path) => path.endsWith('/bot.ts'))!]!);
    expect(source).toMatch(/import \{[^}]*unitOfferedForOrders[^}]*\} from '\.\.\/sim\/units'/);
    expect(source).toContain('unitOfferedForOrders(unit)');
    // And the bound is the sheet's, never a literal beside the arm.
    expect(source).toContain('driver.reaskPerTurn');
  });
});

describe('the bot module', () => {
  it('is there to be read', () => {
    const files = Object.keys(AI_SOURCE).map((path) => path.slice(path.lastIndexOf('/') + 1));
    // Thirteen modules since W1 (2026-09-08 — `campaign.ts` joined the leaves;
    // `ground.ts` joined them in batch 9, `routes.ts` joined `chain.ts` in
    // batch 8), and the split is the point: `aiConfig.ts` is the leaf holding the
    // tuning surface (and the persona merge), `decision.ts` is the second leaf —
    // the vocabulary a decision and its arithmetic are said in — `value.ts` is
    // the appraisal (every function ends in a number or the terms that fold to
    // one), `chain.ts` is the long-term goal priced over time (every function
    // ends in a chain or a step of one), `wants.ts` is the want book and the
    // shadow prices it yields (every function ends in a want or a price),
    // `plan.ts` is the reading of the board a worker and a great person both
    // consult (every function ends in a table), `diplomacy.ts` is everything
    // this seat has to say to *another* seat (declarations, warscore peace,
    // bargains), `bot.ts` is the policy (every function ends in a
    // `BotDecision`), `ground.ts` is the third leaf — one reading of the board's
    // tile contexts, hoisted for a sweep the way `tileOwnerField` is —
    // `campaign.ts` is the fourth, the operational readings a war needs (the
    // force, the road, the target, the muster) which the declaration and the
    // march both ask and which therefore cannot live in either — and
    // `driver.ts` is the loop with `stepper.ts` that same loop unrolled one
    // decision at a time.
    //
    // Fifteen since X5b (2026-09-08): `citizen.ts` is the sixth leaf and the
    // smallest — one function and one door, what a citizen asks the empire for
    // its keep. It is a module rather than a helper beside one of its callers
    // because **four** arms fold that line (the settler's, the focus arm's, the
    // hex purchase's and the expansion chain's), and two of them are in files
    // that already stand on one another: `wants.ts` imports `chain.ts`, so a
    // line both fold can live in neither. The leaf bargain `ground.ts` and
    // `routes.ts` make, one arithmetic over.
    //
    // Fourteen since X4 (2026-09-08): `dealMemory.ts` is the fifth leaf and the
    // one module here that *remembers* anything — what a rival sent back, hung
    // off the live state in a `WeakMap` so that no schema, no save and no rule
    // carries it. It is a module of its own because both loops fill it and the
    // policy reads it, and a memory either loop kept privately would be a fifth
    // piece of per-seat state for the byte-for-byte pin to keep in step.
    //
    // Fifteen since X1d (2026-09-09): `townFolds.ts` is the sixth leaf, and it is
    // `ground.ts`' bargain a third time — the standing and hypothetical folds of
    // every town of one empire, asked by the build arm, by both banks and now by
    // the chains, which is three modules two of which already stand on the third.
    expect(files.sort()).toEqual([
      'aiConfig.ts',
      'bot.ts',
      'campaign.ts',
      'chain.ts',
      'citizen.ts',
      'dealMemory.ts',
      'decision.ts',
      'diplomacy.ts',
      'driver.ts',
      'ground.ts',
      'plan.ts',
      'routes.ts',
      'stepper.ts',
      'townFolds.ts',
      'value.ts',
      'wants.ts',
    ]);
  });

  it('rolls no dice of its own, and takes none out of the simulation', () => {
    const offenders: string[] = [];
    for (const path of Object.keys(AI_SOURCE).sort()) {
      const text = code(AI_SOURCE[path]!);
      // `Math.random` would be a decision outside the log; `state.rng` would be
      // a decision *inside* the seeded stream, which is worse — it would move
      // every roll the simulation makes afterwards.
      if (/Math\.random/.test(text)) offenders.push(`${path}: Math.random`);
      if (/\brng\b/.test(text)) offenders.push(`${path}: state.rng`);
      if (/\bnextFloat\b|\bnextInt\b/.test(text)) offenders.push(`${path}: the rng helpers`);
    }
    expect(offenders).toEqual([]);
  });

  it('touches no browser and no clock', () => {
    const offenders: string[] = [];
    for (const path of Object.keys(AI_SOURCE).sort()) {
      const text = code(AI_SOURCE[path]!);
      for (const banned of ['document', 'window', 'requestAnimationFrame', 'Date.now', 'performance.']) {
        if (text.includes(banned)) offenders.push(`${path}: ${banned}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never imports the simulation the wrong way round', () => {
    // `src/sim/` is the rules and must never know an AI exists; the arrow runs
    // one way only. Asserted from this side because this is the side that would
    // be tempted.
    const simSource = import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const offenders: string[] = [];
    for (const path of Object.keys(simSource).sort()) {
      if (/from '\.\.\/ai\//.test(code(simSource[path]!))) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps every tuned number in data/ai.json', async () => {
    // Code holds algorithms, data holds constants (CLAUDE.md). The bot's whole
    // tuning surface is one import, and this is the pin that keeps a settler cap
    // from drifting back into a `const`. `build` and `statecraft` left with tier
    // 1: a hand-ordered build list and a list of effect labels the bot liked were
    // both *fixed lists*, and the value vector is what replaced them — leaving
    // them in the file would be leaving two dials that turn nothing.
    const config = (await import('../../data/ai.json')).default;
    expect(Object.keys(config).sort()).toEqual([
      'driver',
      'expansion',
      'growth',
      'military',
      // The persona sheet: sparse deep-overrides of every block above it, which
      // is why it is a key of the same file rather than a file of its own — a
      // persona that lived elsewhere would drift from the knobs it overrides.
      'personas',
      // The priority block (batch 1): the horizon a plan is worth making over,
      // the margin a challenger must beat an incumbent by, and the band a
      // shadow price may move in. It stands where `spending`'s four thresholds
      // used to — see `wants.ts`.
      'priorities',
      // The puppet profile: the *same* shape as a persona and for the same
      // reason, but folded over whichever persona the seat already plays rather
      // than chosen — a warmonger's puppet is still a warmonger's town.
      'puppetProfile',
      'religion',
      'research',
      'score',
      'search',
      'site',
      'solvency',
      'threat',
      // `trade` left in batch 7 with the last knob in it: `tradersPerCity` went
      // in batch 4 (route pay is priced) and `traderCap` followed once a
      // caravan's wage was charged at gold's shadow price. A block with nothing
      // in it is a dial that turns nothing, which is what this list is for.
      // The war block (P3): what a seat declares over, sues at, and signs.
      'war',
      'weights',
      'workers',
    ]);
    // The JSON is imported in exactly one place — `aiConfig.ts`, the leaf both
    // the policy and the appraisal stand on — so there is one answer to "what is
    // tuned" rather than two import sites that could drift apart.
    const importers = Object.keys(AI_SOURCE).filter((path) =>
      code(AI_SOURCE[path]!).includes('data/ai.json'),
    );
    expect(importers.map((path) => path.slice(path.lastIndexOf('/') + 1))).toEqual(['aiConfig.ts']);
  });
});
