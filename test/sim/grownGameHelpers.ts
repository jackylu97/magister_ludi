/**
 * A bot-played game at any number of turns, played forward once per file.
 *
 * Several AI test files start most of their cases from "the standard duel after
 * N turns of bot play", with N between two and twenty. Each case used to play
 * its own game from turn 0, so a file with twenty such cases drove a couple of
 * hundred bot turns to reach a handful of distinct boards. Driving is a pure
 * function of the state, so the board at turn 12 is the same however many times
 * it is reached.
 *
 * `grownGames(config)` returns a function that plays one game forward and keeps
 * a copy of the board after every turn it passes. Asking for a horizon it has
 * already passed returns a copy of that board; asking for a later one plays on
 * from the latest. Every caller gets a private `structuredClone`, so a case may
 * change the board it is handed.
 *
 * Call it at the top level of a test file, so the memo lives for that file
 * only. A file that changes a data table (the deck stocking helpers) must do so
 * before the first board is grown, as `aiWants.test.ts` does in `beforeAll`.
 */
import { driveBots } from '../../src/ai/driver';
import { adoptHarnessMemory, readHarnessMemory } from '../../src/ai/harnessMemory';
import type { Game } from '../../src/sim/game';
import type { GameConfig } from '../../src/sim/state';
import { createGame } from './newGameHelpers';

export function grownGames(config: GameConfig): (turns: number) => Game {
  /** The board after each turn played so far; index 0 is the fresh game. */
  const boards: Game[] = [];
  let live: Game | null = null;
  return (turns: number): Game => {
    if (live === null) {
      live = createGame(config);
      boards.push(structuredClone(live));
    }
    while (boards.length <= turns) {
      driveBots(live, { warn: () => {} });
      boards.push(structuredClone(live));
    }
    return structuredClone(boards[turns]!);
  };
}

/**
 * Play one opening per file and give each caller a private game at that turn.
 * Bots also keep decisions in weak maps. Copy those as the bot worker does so
 * each caller can continue the opening with the same decisions.
 */
export function playedGameFixture(build: () => Game): () => Game {
  let original: Game | undefined;
  return () => {
    original ??= build();
    const copy = structuredClone(original);
    adoptHarnessMemory(copy.state, readHarnessMemory(original.state));
    return copy;
  };
}
