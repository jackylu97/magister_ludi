/**
 * **A paper a person sends back** (batch X4, and the user's own report: the
 * rivals keep offering the same bargain).
 *
 * `test/sim/aiDiplomacy.test.ts` owns the memory's rules — what closes a pair,
 * what re-opens it — asked of the policy. This file owns the half that lives in
 * the interface, and it is a half because a bot answering a bot is not the case
 * anybody complained about: in the product a rival's paper is refused by a
 * *person*, through the Deal panel, and that command is dispatched by
 * `controls.ts` rather than by either bot harness. A memory nothing filled from
 * this chair would close the loop in a headless bench and leave it running in
 * the only game a player ever sees.
 *
 * Two claims, and neither can be made by mounting the panel (no jsdom in this
 * suite — `controls.test.ts`' note):
 *
 *   1. **The seam is there, and it is the only one.** `answerDealOf` reads the
 *      pending refusal before the dispatch and banks it after, in the same two
 *      lines the driver and the stepper use; and no other module under
 *      `src/ui/` sends a `declineDeal`, so there is no second path to keep in
 *      step. Read off the source.
 *   2. **It actually stops the re-write.** A bot's swap, refused exactly the way
 *      `answerDealOf` refuses it, is not written again next turn — asserted by
 *      asking the policy, which is the thing the player is complaining about.
 */

import { describe, expect, it } from 'vitest';
import { braceBody, uiSource } from './sourceHelpers';

import { pendingDealRefusal, rememberDealRefusal } from '../../src/ai/dealMemory';
import { valueContext } from '../../src/ai/bot';
import { diplomacyDecision } from '../../src/ai/diplomacy';
import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type City, type GameState, bumpRevision, newGame, playerById } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';

const UI_SOURCE = import.meta.glob('../../src/ui/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** One file's text with its comments taken out — a rule is *explained* in them. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('the interface fills the refusal memory', () => {
  const controls = uiSource('controls.ts');

  it('banks a refusal in `answerDealOf`, around the dispatch, in the driver’s own two lines', () => {
    const body = braceBody(controls, 'function answerDealOf(');
    // Before the commit and after the result: the decline takes the paper off
    // the register, so the reading has to happen first, and a refusal the
    // reducer would not take is not a refusal.
    const read = body.indexOf('pendingDealRefusal(');
    const sent = body.indexOf('commit(command)');
    const banked = body.indexOf('rememberDealRefusal(');
    expect(read).toBeGreaterThan(-1);
    expect(sent).toBeGreaterThan(read);
    expect(banked).toBeGreaterThan(sent);
    expect(code(controls)).toContain("from '../ai/dealMemory'");
  });

  it('is the only place under src/ui that answers a paper with a refusal', () => {
    // A second path would be a second seam to keep in step, and the one thing
    // this memory cannot survive is a decline nobody banked.
    const senders = Object.keys(UI_SOURCE)
      .filter((path) => code(UI_SOURCE[path]!).includes("'declineDeal'"))
      .map((path) => path.slice(path.lastIndexOf('/') + 1));
    expect(senders).toEqual(['controls.ts']);
    // And it is one function inside that file: the panel calls it, the screen
    // calls the panel, and nothing dispatches for itself.
    const others = code(controls).split("'declineDeal'").length - 1;
    expect(others).toBe(1);
  });

  it('leaves a signature alone: only a refusal is remembered', () => {
    // `pendingDealRefusal` answers `null` for an `acceptDeal`, which is why the
    // one seam can serve both faces of the panel's one paper without a branch.
    const state = table();
    const paper: Command = {
      type: 'proposeDeal',
      playerId: 1,
      targetId: 0,
      give: { luxuries: ['silk'] },
      take: { luxuries: ['wine'] },
    } as unknown as Command;
    expect(applyCommand(state, paper).ok).toBe(true);
    const id = state.dealProposals[0]!.id;
    expect(
      pendingDealRefusal(state, { type: 'acceptDeal', playerId: 0, dealId: id } as Command),
    ).toBeNull();
    expect(
      pendingDealRefusal(state, { type: 'declineDeal', playerId: 0, dealId: id } as Command),
    ).not.toBeNull();
  });

  it('stops the rival re-writing the paper the player just sent back', () => {
    // The whole complaint, end to end: seat 1 is a bot holding two silks, seat 0
    // is the person. The bot offers the swap; the person refuses it the way the
    // Deal panel refuses it; the bot writes something else.
    const state = table();
    const first = diplomacyDecision(state, playerById(state, 1)!, ctxFor(state, 1))!;
    expect(first.command.type).toBe('proposeDeal');
    expect(applyCommand(state, first.command).ok).toBe(true);
    const row = state.dealProposals[0]!;
    expect(row.to).toBe(0);

    const decline = { type: 'declineDeal', playerId: 0, dealId: row.id } as unknown as Command;
    const refusal = pendingDealRefusal(state, decline);
    expect(applyCommand(state, decline).ok).toBe(true);
    rememberDealRefusal(state, refusal!);

    // Next turn, on a board that has not otherwise moved. Not the same paper —
    // and against a person the sweetened one is reachable, which it is not
    // between two bots (a rival holding two copies signs the plain swap), so
    // this is also the one place the counter is asked for in anger.
    state.turn += 1;
    bumpRevision(state);
    const second = diplomacyDecision(state, playerById(state, 1)!, ctxFor(state, 1))!;
    expect(JSON.stringify(second.command)).not.toBe(JSON.stringify(first.command));
    const sweetened = second.command as unknown as { give: { gold?: number } };
    expect(sweetened.give.gold ?? 0).toBeGreaterThan(0);

    // And refused a second time, the rival stops asking altogether.
    expect(applyCommand(state, second.command).ok).toBe(true);
    const again = state.dealProposals[0]!;
    const twice = { type: 'declineDeal', playerId: 0, dealId: again.id } as unknown as Command;
    const banked = pendingDealRefusal(state, twice);
    expect(applyCommand(state, twice).ok).toBe(true);
    rememberDealRefusal(state, banked!);
    state.turn += 1;
    bumpRevision(state);
    expect(diplomacyDecision(state, playerById(state, 1)!, ctxFor(state, 1))).toBeNull();
  });
});

// --- the table ---------------------------------------------------------------

function at(state: GameState, col: number, row: number) {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function claimBlock(state: GameState, city: City, cols: number[], rows: number[]): void {
  for (const col of cols) {
    for (const row of rows) state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  }
}

function giveLuxury(
  state: GameState,
  city: City,
  col: number,
  row: number,
  id: 'silk' | 'wine',
): void {
  const tile = at(state, col, row);
  tile.resource = id;
  tile.improvement = 'plantation';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
}

function ctxFor(state: GameState, seat: number) {
  return valueContext(state, playerById(state, seat)!);
}

/**
 * **The person and the rival**: seat 0 is a chair somebody is sitting in and
 * seat 1 is not, each holding two of a kind the other lacks — the one board on
 * which the bot's swap arm actually writes a paper.
 */
function table(): GameState {
  const state = newGame({
    seed: 17,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  const mine = foundCityAt(state, 0, at(state, 3, 4));
  const theirs = foundCityAt(state, 1, at(state, 12, 4));
  claimBlock(state, mine, [2, 3, 4], [3, 4, 5]);
  claimBlock(state, theirs, [11, 12, 13], [3, 4, 5]);
  giveLuxury(state, mine, 2, 3, 'wine');
  giveLuxury(state, mine, 4, 5, 'wine');
  giveLuxury(state, theirs, 11, 3, 'silk');
  giveLuxury(state, theirs, 13, 5, 'silk');
  playerById(state, 1)!.gold = 500;
  bumpRevision(state);
  return state;
}
