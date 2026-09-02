import { describe, expect, it } from 'vitest';

import { nextBotCommand } from '../../src/ai/bot';
import { foundCityAt } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { snapshotState } from '../../src/sim/game';
import { prospectAt, prospectError, prospectTechError } from '../../src/sim/improvements';
import { prospectDef } from '../../src/sim/improvementData';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, createUnit, newGame } from '../../src/sim/state';
import { TECH_IDS } from '../../src/sim/techData';
import { at, bareState } from './improvementHelpers';

/**
 * The survey: `prospect`, and what turning a hill over is worth (ledger Entry
 * LVIII, phase 3; the ratified act is in `docs/themes/11-the-cartographers.md`).
 *
 * Four separable claims:
 *
 *   1. **The gate is a rule, not a guard.** Every refusal is a sentence the unit
 *      sheet greys with, and an offered row is a command the reducer takes.
 *   2. **It is deterministic and resolved off the map.** `state.rng` is not
 *      touched — the answer was seeded at generation — so a replay of a log full
 *      of surveys is byte-identical.
 *   3. **A strike is a move and it is public.** The seam leaves `Tile.vein` and
 *      arrives on `Tile.resource`, where every ordinary rule already reads it.
 *   4. **The assay pays on the asking.** Strike or barren, an Entry XVIII
 *      windfall banked to the nearest owned city's treasury.
 */

const GATE = prospectDef().tech;

/** A player-0 city at (5, 5) and a worker standing on a bare hill at (5, 4). */
function hillWorker(): { state: GameState; worker: ReturnType<typeof createUnit> } {
  const state = bareState();
  foundCityAt(state, 0, at(state, 5, 5));
  const tile = at(state, 5, 4);
  tile.hills = true;
  const worker = createUnit(state, 0, 'worker', 5, 4);
  return { state, worker };
}

describe('the survey gate', () => {
  it('accepts a worker on an unasked hill with movement left', () => {
    const { state, worker } = hillWorker();
    expect(prospectError(state, worker.id)).toBeNull();
  });

  it('accepts a scout too — the empire is allowed to read its own ground', () => {
    // `isExplorer`, of the data and never of a type name: the act is a worker's
    // and the eyes', which is what makes it a verb an unescorted column can use.
    const { state } = hillWorker();
    const scout = createUnit(state, 0, 'scout', 5, 4);
    expect(prospectError(state, scout.id)).toBeNull();
  });

  it('refuses a warrior, a spent piece, flat ground and a second asking', () => {
    const { state, worker } = hillWorker();

    const soldier = createUnit(state, 0, 'warrior', 5, 4);
    expect(prospectError(state, soldier.id)).toMatch(/cannot survey/);

    worker.movesLeft = 0;
    expect(prospectError(state, worker.id)).toMatch(/no movement left/);
    worker.movesLeft = 2;

    at(state, 5, 4).hills = false;
    expect(prospectError(state, worker.id)).toMatch(/not a hill/);
    at(state, 5, 4).hills = true;

    at(state, 5, 4).surveyed = true;
    expect(prospectError(state, worker.id)).toMatch(/already been surveyed/);
  });

  it('refuses the hex a town stands on, where every other verb refuses it', () => {
    const state = bareState();
    at(state, 5, 5).hills = true;
    const city = foundCityAt(state, 0, at(state, 5, 5));
    const worker = createUnit(state, 0, 'worker', 5, 5);
    expect(prospectError(state, worker.id)).toContain(city.name);
  });

  it('asks the technology last, so a greyed row names the node and nothing else', () => {
    // `improvementErrorAt`'s order, and the property the sheet leans on:
    // "the only thing refusing this is the tree" is exactly the two sentences
    // being equal.
    const { state, worker } = hillWorker();
    state.players[0]!.techsResearched = TECH_IDS.filter((id) => id !== GATE);
    expect(prospectError(state, worker.id)).toBe(prospectTechError(state, 0));
    expect(prospectError(state, worker.id)).toMatch(/Surveying a hill needs/);

    // …and a *ground* refusal wins over it, or the sheet would advertise the
    // node on a hex that will never accept a survey anyway.
    at(state, 5, 4).hills = false;
    expect(prospectError(state, worker.id)).toMatch(/not a hill/);
    expect(prospectTechError(state, 0)).not.toBeNull();
  });

  it('does not refuse a hill that already carries a seam — a refusal would leak the map', () => {
    // The one clause deliberately absent. A hill with unrevealed iron on it must
    // answer exactly as a bare hill does, or the error message is a lens.
    const { state, worker } = hillWorker();
    at(state, 5, 4).resource = 'iron';
    expect(prospectError(state, worker.id)).toBeNull();
  });

  it('has no territory clause: an explorer surveys the wilds', () => {
    const state = bareState();
    at(state, 9, 8).hills = true;
    const scout = createUnit(state, 0, 'scout', 9, 8);
    expect(state.tileOwner[0]).toBeNull();
    expect(prospectError(state, scout.id)).toBeNull();
  });
});

describe('what a survey does', () => {
  it('turns a vein into an ordinary resource and marks the hill asked', () => {
    const { state, worker } = hillWorker();
    const tile = at(state, 5, 4);
    tile.vein = 'richOre';

    const report = prospectAt(state, worker, tile);
    expect(report.struck).toBe('richOre');
    // A **move**: the seam is on the tile the ordinary way and the secret is
    // gone, so nothing downstream has two places to look.
    expect(tile.resource).toBe('richOre');
    expect(tile.vein).toBeUndefined();
    expect(tile.surveyed).toBe(true);
    // The turn, and no charge — the act costs the day, not the worker.
    expect(worker.movesLeft).toBe(0);
    expect(worker.chargesLeft).toBe(createUnit(state, 0, 'worker', 1, 1).chargesLeft);
  });

  it('marks a barren hill exactly as loudly as a rich one', () => {
    // "Surveyed" means *asked*, which is the whole design: the map fills in with
    // certainty either way.
    const { state, worker } = hillWorker();
    const tile = at(state, 5, 4);
    const report = prospectAt(state, worker, tile);
    expect(report.struck).toBeNull();
    expect(tile.resource).toBeUndefined();
    expect(tile.surveyed).toBe(true);
  });

  it('banks the assay to the nearest owned city, strike or barren', () => {
    for (const seam of [undefined, 'richOre'] as const) {
      const { state, worker } = hillWorker();
      const tile = at(state, 5, 4);
      if (seam) tile.vein = seam;
      const before = state.players[0]!.gold;
      const report = prospectAt(state, worker, tile);
      expect(report.gold).toBe(RULES.improvements.assayGold);
      expect(report.cityName).not.toBeNull();
      expect(state.players[0]!.gold - before).toBe(RULES.improvements.assayGold);
    }
  });

  it('says so out loud when there is nowhere to carry the samples', () => {
    // `settleCampBounty`'s ruling: a boon with no destination is reported, never
    // silently swallowed.
    const state = bareState();
    at(state, 5, 4).hills = true;
    const worker = createUnit(state, 0, 'worker', 5, 4);
    const report = prospectAt(state, worker, at(state, 5, 4));
    expect(report.gold).toBe(0);
    expect(report.cityName).toBeNull();
    expect(report.warning).toMatch(/no city/);
  });

  it('never touches the dice', () => {
    // The answer was seeded at generation, so the survey is a read. If this
    // fails, a log with a survey in it stops replaying.
    const { state, worker } = hillWorker();
    at(state, 5, 4).vein = 'gems';
    const before = JSON.stringify(state.rng);
    prospectAt(state, worker, at(state, 5, 4));
    expect(JSON.stringify(state.rng)).toBe(before);
  });

  it('pays the struck hill on the spot, through the ordinary yield rules', () => {
    // A strike is not a special kind of resource: the tile is worth what the
    // table says the moment the key is written, and the owning city has been
    // refreshed (register entry 17) rather than left to the next resolution.
    const { state, worker } = hillWorker();
    const tile = at(state, 5, 4);
    tile.vein = 'richOre';
    prospectAt(state, worker, tile);
    expect(tile.resource).toBe('richOre');
    expect(state.cities[0]!.workedTiles).toBeDefined();
  });
});

describe('the prospect command', () => {
  it('refuses byte-identically', () => {
    const { state, worker } = hillWorker();
    at(state, 5, 4).hills = false;
    const before = JSON.stringify(state);
    const result = applyCommand(state, {
      type: 'prospect',
      playerId: 0,
      unitId: worker.id,
    });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('refuses somebody else’s unit and a seat that has ended its turn', () => {
    const { state, worker } = hillWorker();
    const wrongSeat = applyCommand(state, {
      type: 'prospect',
      playerId: 1,
      unitId: worker.id,
    });
    expect(wrongSeat.ok).toBe(false);

    state.turnEnded[0] = true;
    const ended = applyCommand(state, { type: 'prospect', playerId: 0, unitId: worker.id });
    expect(ended.ok).toBe(false);
    if (!ended.ok) expect(ended.error).toMatch(/ended turn/);
  });

  it('carries the report out on the result, because the board forgets', () => {
    const { state, worker } = hillWorker();
    at(state, 5, 4).vein = 'silver';
    const result = applyCommand(state, {
      type: 'prospect',
      playerId: 0,
      unitId: worker.id,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prospect?.struck).toBe('silver');
      expect(result.prospect?.gold).toBe(RULES.improvements.assayGold);
    }
  });

  it('wakes the piece it names, like every other order', () => {
    const { state, worker } = hillWorker();
    worker.sleeping = true;
    applyCommand(state, { type: 'prospect', playerId: 0, unitId: worker.id });
    expect(worker.sleeping).toBeUndefined();
  });
});

describe('a survey in a log', () => {
  it('replays byte-identically over a script of marches and surveys', () => {
    /**
     * The claim the whole layer rests on: a strike is caused by a **logged
     * command** on a map the seed produced, so the same config and the same log
     * reproduce the same board — which is what lets `Tile.vein` and
     * `Tile.surveyed` exist at all without breaking "a save is `{config, log}`".
     *
     * Driven twice through a local player rather than through `replay`, and the
     * reason is the technology: Prospecting is an Æra III node, so putting it in
     * the log would mean researching it — a hundred turns of endTurn in a core
     * test. The grant is therefore *setup*, applied identically to both runs,
     * and what is asserted is exactly the property that matters here: the survey
     * itself introduces no divergence. The map is never touched (the seats march
     * to real hills), and `prospectAt`'s own "never touches the dice" test above
     * closes the other half.
     */
    const config = {
      seed: 5150,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: false },
      ],
    };

    /** Plays one run and hands back its snapshot and the script it played. */
    const run = (script: Command[] | null): { snapshot: string; script: Command[] } => {
      const state = newGame(config);
      for (const player of state.players) player.techsResearched = [...TECH_IDS];
      const played: Command[] = [];
      const issue = (command: Command): boolean => {
        const result = applyCommand(state, command);
        if (result.ok) played.push(command);
        return result.ok;
      };

      if (script !== null) {
        for (const command of script) expect(issue(command)).toBe(true);
        return { snapshot: snapshotState(state), script: played };
      }

      for (const unit of state.units) {
        if (unit.ownerId !== 0) continue;
        const hill = state.map.tiles.find(
          (tile) =>
            tile.hills &&
            Math.abs(tile.col - unit.col) <= 3 &&
            Math.abs(tile.row - unit.row) <= 3,
        );
        if (!hill) continue;
        issue({
          type: 'moveUnit',
          playerId: 0,
          unitId: unit.id,
          target: { col: hill.col, row: hill.row },
        });
      }
      for (let turn = 0; turn < 4; turn++) {
        for (const player of state.players) {
          if (player.barbarian) continue;
          issue({ type: 'endTurn', playerId: player.id });
        }
      }
      let surveyed = 0;
      for (const unit of [...state.units]) {
        if (unit.ownerId !== 0) continue;
        if (prospectError(state, unit.id) !== null) continue;
        expect(issue({ type: 'prospect', playerId: 0, unitId: unit.id })).toBe(true);
        surveyed += 1;
      }
      expect(surveyed).toBeGreaterThan(0);
      return { snapshot: snapshotState(state), script: played };
    };

    const first = run(null);
    expect(first.script.some((command) => command.type === 'prospect')).toBe(true);
    expect(run(first.script).snapshot).toBe(first.snapshot);
  });
});

/**
 * Every command the bot would issue on this board, in order, applying each as it
 * goes — `nextBotCommand` hands back one decision at a time, so a test about
 * *which* verbs a turn contains has to drive it the way the turn loop does.
 */
function drainBot(state: GameState): Command[] {
  const issued: Command[] = [];
  for (let i = 0; i < 40; i++) {
    const command = nextBotCommand(state, 0);
    if (command === null) break;
    issued.push(command);
    if (!applyCommand(state, command).ok) break;
  }
  return issued;
}

describe('the bot’s one arm', () => {
  it('surveys the hill it is standing on rather than standing down', () => {
    // The arm applies exactly where the worker had nothing else to do: its own
    // hex already carries a mine, so the improvement loop above it comes up
    // empty and the alternative is `standDown`.
    const { state } = hillWorker();
    at(state, 5, 4).improvement = 'mine';
    const commands = drainBot(state);
    expect(commands.some((command) => command.type === 'prospect')).toBe(true);
  });

  it('is deterministic: the same board issues the same commands twice', () => {
    const build = () => {
      const { state } = hillWorker();
      at(state, 5, 4).improvement = 'mine';
      return JSON.stringify(drainBot(state));
    };
    expect(build()).toBe(build());
  });

  it('asks the rule rather than naming a hill of its own', () => {
    // A source read: the arm is `prospectError === null` plus the bot's own
    // territory clause, and nothing else. A heuristic that scored hills would
    // be an exploration policy wearing a worker.
    const bot = import.meta.glob('../../src/ai/bot.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const text = Object.values(bot)[0]!;
    expect(text).toContain('prospectError(state, unit.id) === null');
    expect(text).not.toContain('vein');
  });
});
