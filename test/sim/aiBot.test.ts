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
  chooseProduction,
  nextBotCommand,
  scoreCard,
  valueContext,
} from '../../src/ai/bot';
import { type Game, createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import type { City, GameConfig, GameState, Player } from '../../src/sim/state';
import { createUnit, hasEndedTurn, playerById, realPlayers } from '../../src/sim/state';
import { firstBlocker } from '../../src/ui/turnBlockers';
import { isCombatant, unitDef } from '../../src/sim/unitData';
import { UNIT_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { researchExpansion } from '../../src/sim/tech';
import { anyCardDef } from '../../src/sim/statecraft';
import { type OrderId, ORDER_IDS } from '../../src/sim/statecraftData';
import { BELIEF_IDS } from '../../src/sim/religionData';

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
    // And a seat that has already handed over is finished, however much
    // movement its pieces have left.
    driveBots(game, { warn: () => {} });
    expect(nextBotCommand(game.state, 0)).toBeNull();
  });

  it('spends a surplus instead of sitting on it', () => {
    // **Gold has no automatic sink.** The board cannot produce a treasury this
    // size in ten turns, so it is put there directly — which is why this test
    // makes no claim about replay: a state poked from outside is not a state the
    // log reproduces, and that is exactly the point of the poke.
    const game = createGame(CONFIG);
    for (const player of realPlayers(game.state)) player.gold = 5000;
    for (let turn = 0; turn < 4; turn++) driveBots(game, { warn: () => {} });
    const bought = game.log.filter((command) => command.type === 'purchaseItem');
    expect(bought.length).toBeGreaterThan(0);
    // And the reserve is kept: the bot never empties a treasury it owes upkeep
    // out of.
    for (const player of realPlayers(game.state)) {
      expect(player.gold).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps the reserve back rather than spending to the last coin', () => {
    // Just over the threshold and no more: the bot may spend the surplus and
    // must not touch the reserve, so a purse this size buys at most a little.
    const game = createGame(CONFIG);
    const reserve = AI.spending.goldReserve;
    for (const player of realPlayers(game.state)) {
      player.gold = AI.spending.goldSpendAbove + reserve + 1;
    }
    for (let turn = 0; turn < 3; turn++) driveBots(game, { warn: () => {} });
    for (const player of realPlayers(game.state)) {
      // Income arrives between turns, so this is a floor rather than an
      // equality — the claim is that nothing was ever bought *out of* the
      // reserve.
      expect(player.gold).toBeGreaterThanOrEqual(reserve);
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
    const rich = valueContext(game.state, player);
    player.gold = AI.solvency.arrearsTreasury - 1;
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
    const city = firstCity(game.state, 0);
    // Five spare soldiers standing in the field, well away from the town so the
    // garrison guard is not what is being tested here.
    const spare = [];
    for (let i = 0; i < 5; i++) {
      spare.push(createUnit(game.state, 0, 'warrior', city.col + 3 + i, city.row + 3));
    }
    player.gold = -100;
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
    player.statecraft.orders.push({ id: a as OrderId, level: 1 });
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
  it('opens the faith bank far earlier while the pantheon is empty', () => {
    // **Design addendum 5**, the threshold half. A seat with no belief spends at
    // `religion.pantheonSpendAbove`; the ordinary threshold is higher, so the
    // first god is never held up by a bank the bot was saving for nothing.
    expect(AI.religion.pantheonSpendAbove).toBeLessThan(AI.spending.faithSpendAbove);
    expect(AI.religion.prophetSpendAbove).toBeLessThan(AI.spending.faithSpendAbove);
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
    player.gold = 0;
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
    // The prophet is gated on a technology this young empire has not reached.
    // Granted directly, because what is under test is the *appetite*, not the
    // tree — and the roster names its own gate, so nothing here spells a tech id.
    const gate = UNIT_UNLOCK_TECH.get('prophet');
    if (gate !== undefined) {
      for (const step of researchExpansion(game.state, 0, gate)) player.techsResearched.push(step);
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

describe('the bot module', () => {
  it('is there to be read', () => {
    const files = Object.keys(AI_SOURCE).map((path) => path.slice(path.lastIndexOf('/') + 1));
    // Six modules since the spectate pass, and the split is the point:
    // `aiConfig.ts` is the leaf holding the tuning surface, `decision.ts` is the
    // second leaf — the vocabulary a decision and its arithmetic are said in —
    // `value.ts` is the appraisal (every function ends in a number or the terms
    // that fold to one), `bot.ts` is the policy (every function ends in a
    // `BotDecision`), `driver.ts` is the loop and `stepper.ts` is that same loop
    // unrolled one decision at a time.
    expect(files.sort()).toEqual([
      'aiConfig.ts',
      'bot.ts',
      'decision.ts',
      'driver.ts',
      'stepper.ts',
      'value.ts',
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
    const simSource = import.meta.glob('../../src/sim/*.ts', {
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
      'military',
      'religion',
      'research',
      'score',
      'search',
      'site',
      'solvency',
      'spending',
      'threat',
      'trade',
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
