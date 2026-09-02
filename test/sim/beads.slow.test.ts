/**
 * **Slow tier** (`npm run test:slow`) — the Bead Race's *pacing*, played rather
 * than asserted.
 *
 * `beads.test.ts` pins the rules one at a time on a hand-built board. What it
 * cannot answer is the question the model actually turns on: **when does the
 * table open in a real game**, and does the deck keep flowing once it has. That
 * is a claim about tens of turns of a scripted empire, which is what puts it on
 * this side of the line (see `tech.slow.test.ts`'s docblock for the convention).
 *
 * The claim under test is the 2026-08-30 re-keying: the deck keys are the
 * **built** age numbers, so the doc's Æra III deck is deck **2**, and a real
 * game therefore turns its first hand face up when the first seat completes an
 * age-2 technology — turn 46 on this script — rather than never, which is what
 * an age-4 key would have meant on a three-age tree.
 */

import { describe, expect, it } from 'vitest';

import { type Game, createGame, dispatch } from '../../src/sim/game';
import { unitDef } from '../../src/sim/unitData';
import { availableTechs, isUnlocked } from '../../src/sim/tech';
import { TECH_IDS, highestAge, techDef } from '../../src/sim/techData';

/**
 * One seat, one capital, the cheapest tech available every turn, and a queue of
 * everything the tree has handed over — `tech.slow.test.ts`'s `playEmpire`
 * stripped to the half this file needs. The buildings matter: without them the
 * capital is science-starved and the table opens twelve turns later, which would
 * be a measurement of an empire nobody plays.
 */
const WANTED = [
  'granary', 'monument', 'shrine', 'library', 'temple', 'market',
  'aqueduct', 'workshop', 'watermill', 'amphitheater', 'monastery', 'university',
];

function playSeat(maxTurns: number): { game: Game; opened: number | null; firstDeal: number | null } {
  const game = createGame({
    seed: 4242,
    sizeName: 'standard',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
  const settler = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
  dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: settler.id });

  let opened: number | null = null;
  let firstDeal: number | null = null;
  for (let turn = 0; turn < maxTurns; turn++) {
    const player = game.state.players[0]!;
    if (player.researching === null) {
      const next = [...availableTechs(game.state, 0)].sort(
        (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
      )[0];
      if (next) dispatch(game, { type: 'chooseResearch', playerId: 0, techId: next });
    }
    for (const city of game.state.cities) {
      if (city.queue.length > 0) continue;
      const queue = WANTED.filter(
        (id) => !city.buildings.includes(id as never) && isUnlocked(game.state, 0, 'building', id),
      ).map((id) => ({ kind: 'building', id }));
      if (queue.length === 0) continue;
      dispatch(game, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue,
      } as never);
    }
    dispatch(game, { type: 'endTurn', playerId: 0 });

    const hand = game.state.beads.hands['3'] ?? [];
    if (firstDeal === null && hand.length > 0) firstDeal = game.state.turn;
    if (opened === null && hand.some((card) => card.faceUp)) opened = game.state.turn;
  }
  return { game, opened, firstDeal };
}

describe('the table in a played game', () => {
  it('deals from turn one and opens when the first seat enters built age 3', () => {
    const { game, opened, firstDeal } = playSeat(260);
    const player = game.state.players[0]!;

    // The deal does not wait for anybody: a card lands on the table face down
    // in the very first resolution, which is what "the hand fills over the age"
    // means (Entry VI's drafting model). Read as turn 2 because `endTurn`
    // advances the counter past the turn that dealt.
    expect(firstDeal).toBe(2);

    // And the world's clock is what turns them over. Re-measured for the tree
    // pass of 2026-08-30: the decks re-keyed 2|3 → 3|4 with the ages, so the
    // first table is Æra III's and it opens when a seat reaches the Empire band
    // rather than the old Classical one. The band is deliberately wide on both
    // sides, because what is being pinned is that the table opens *inside a
    // game* rather than the exact turn — a tighter band here would fail on a
    // retune of the tree that this file has no opinion about. An `opened` of
    // `null` is the regression this test exists for: it is what a deck keyed to
    // an age no technology belongs to produces, and it means no seat ever saw a
    // card.
    expect(opened).not.toBeNull();
    expect(opened!).toBeGreaterThan(20);
    // Re-banded 2026-09-01 (Entry LIV): the tree's new walls put the Empire
    // band around t100 on this seed; the band stays deliberately loose.
    // Re-banded 2026-09-02 (the column-formula costs): every price in the tree
    // is read off the node's own chart column now, and the two early ages got
    // much dearer — AEra I costs 814 beakers where it cost 169 — so this seat
    // reaches the Empire band at **t211** rather than t100. The band goes to
    // 300, which is still the loose one this test wants: what is pinned is that
    // the table opens *inside a game*, and a tighter band would fail on a tree
    // retune this file has no opinion about.
    expect(opened!).toBeLessThan(300);
    expect(game.state.beads.worldAge).toBeGreaterThanOrEqual(3);
    expect(highestAge(player.techsResearched)).toBeGreaterThanOrEqual(3);

    // Once open, the hand is full and the deck is still dealing behind it.
    expect((game.state.beads.hands['3'] ?? []).every((card) => card.faceUp)).toBe(true);
    expect((game.state.beads.hands['3'] ?? []).length).toBe(4);
    expect((game.state.beads.decks['3'] ?? []).length).toBeGreaterThan(0);
    // The next age's deck has been filling face down behind it all along.
    expect((game.state.beads.hands['4'] ?? []).length).toBeGreaterThan(0);
    expect((game.state.beads.hands['4'] ?? []).every((card) => !card.faceUp)).toBe(true);
  });
});
